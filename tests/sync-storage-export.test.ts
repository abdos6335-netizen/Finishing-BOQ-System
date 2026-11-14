import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { mergeCollections, resolveConflicts, threeWayMerge } from "../src/domain/conflict-resolution";
import { IndexedDbProjectStorage, MemoryProjectStorage, migrateFromLocalStorage } from "../src/domain/storage";
import { InMemorySyncServer, MemoryQueueStore, OfflineQueue, type SyncOperation, type SyncTransport } from "../src/domain/sync-queue";
import { buildReportModel, buildXlsx, readStoredZip, renderReportHtml } from "../src/domain/report-export";
import type { ProjectRecord } from "../src/domain/project-store";
import type { BoqItemInput } from "../src/domain/boq-engine";

const project = (id = "p1", name = "Villa"): ProjectRecord => ({
  id, name, projectType: "villa", buildingCondition: "plaster-only", createdAt: "2026-11-01T00:00:00.000Z",
  rooms: [{ id: "r1", name: "Living", lengthM: 5, widthM: 4, heightM: 3, wallFaces: [{ id: "w", lengthM: 5, heightM: 3, openings: [] }] }],
  boqItems: []
});

describe("conflict resolution", () => {
  const protectedFields = ["unitRate", "netQuantity"];
  const base = { id: "1", description: "Tile", unitRate: 100, netQuantity: 10 };
  it("merges non-overlapping edits from two devices", () => {
    const r = threeWayMerge(base, { ...base, unitRate: 120 }, { ...base, description: "Tile 60x60" }, { protectedFields });
    expect(r.status).toBe("merged");
    expect(r.merged).toMatchObject({ unitRate: 120, description: "Tile 60x60" });
  });
  it("never auto-resolves a conflicting protected field, even with latest-wins", () => {
    const r = threeWayMerge(base, { ...base, unitRate: 120 }, { ...base, unitRate: 130 }, { protectedFields, strategy: "latest-wins", localUpdatedAt: "2026-11-02", remoteUpdatedAt: "2026-11-03" });
    expect(r.status).toBe("conflict");
    expect(r.conflicts[0]).toMatchObject({ field: "unitRate", protected: true, local: 120, remote: 130 });
    expect(r.merged.unitRate).toBe(120); // nothing is lost from the working copy
  });
  it("uses latest-wins only for unprotected fields and records it", () => {
    const r = threeWayMerge(base, { ...base, description: "A" }, { ...base, description: "B" }, { protectedFields, strategy: "latest-wins", localUpdatedAt: "2026-11-02", remoteUpdatedAt: "2026-11-03" });
    expect(r.merged.description).toBe("B");
    expect(r.autoResolved).toEqual(["description"]);
  });
  it("requires an explicit choice for every conflict", () => {
    const r = threeWayMerge(base, { ...base, unitRate: 120 }, { ...base, unitRate: 130 }, { protectedFields });
    expect(() => resolveConflicts(r, {})).toThrow(/choice/);
    expect(resolveConflicts(r, { unitRate: "remote" }).unitRate).toBe(130);
  });
  it("treats delete-versus-edit as a conflict and keeps the edited record", () => {
    const b = [{ id: "1", v: 1 }], l: typeof b = [], r = [{ id: "1", v: 2 }];
    const result = mergeCollections(b, l, r, { protectedFields: [] });
    expect(result.status).toBe("conflict");
    expect(result.conflicts[0].kind).toBe("delete-edit");
    expect(result.merged).toEqual([{ id: "1", v: 2 }]);
  });
  it("merges added and removed records across devices", () => {
    const b = [{ id: "1", v: 1 }, { id: "2", v: 1 }];
    const result = mergeCollections(b, [{ id: "1", v: 1 }, { id: "2", v: 1 }, { id: "3", v: 1 }], [{ id: "1", v: 1 }], { protectedFields: [] });
    expect(result.status).toBe("merged");
    expect(result.merged.map(x => x.id)).toEqual(["1", "3"]);
    expect(result.removed).toEqual(["2"]);
  });
});

describe("project storage", () => {
  it("round-trips projects, rooms and BOQ items through IndexedDB", async () => {
    const storage = new IndexedDbProjectStorage(new IDBFactory(), "t1");
    const p = project();
    p.boqItems = [{ id: "i", code: "c", description: "d", unit: "m2", netQuantity: 20, sourceRef: "s", unitRate: 5, rateSourceRef: "q", costQuantityBasis: "net" }];
    await storage.save(p);
    await storage.save(project("p2", "Flat"));
    expect((await storage.loadAll()).map(x => x.id).sort()).toEqual(["p1", "p2"]);
    expect((await storage.loadAll()).find(x => x.id === "p1")).toEqual(p);
    await storage.remove("p2");
    expect(await storage.loadAll()).toHaveLength(1);
    storage.close();
  });
  it("migrates legacy localStorage once, without overwriting or deleting", async () => {
    const data = new Map<string, string>();
    const ls = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    (globalThis as unknown as { localStorage: typeof ls }).localStorage = ls;
    data.set("finishing-boq.projects.v1", JSON.stringify([project("old1"), { id: "bad" }, project("old2")]));
    const target = new MemoryProjectStorage();
    await target.save({ ...project("old2"), name: "Already migrated" });
    expect(await migrateFromLocalStorage(target, ls)).toEqual({ migrated: 1, skipped: 1 });
    expect((await target.loadAll()).find(p => p.id === "old2")!.name).toBe("Already migrated");
    expect(data.get("finishing-boq.projects.v1")).toBeDefined();
    expect(await migrateFromLocalStorage(target, ls)).toEqual({ migrated: 0, skipped: 0 });
  });
});

describe("offline queue and sync", () => {
  let n = 0;
  const mk = (device: string, store = new MemoryQueueStore()) => new OfflineQueue(store, device, () => `${device}-op-${++n}`);
  const entity = (id: string) => ({ entity: "project", entityId: id });

  it("keeps changes while offline and sends them in order when back online", async () => {
    const server = new InMemorySyncServer();
    const q = mk("laptop");
    await q.enqueue({ ...entity("p1"), kind: "upsert", payload: { v: 1 }, baseRevision: 0 });
    await q.enqueue({ ...entity("p2"), kind: "upsert", payload: { v: 1 }, baseRevision: 0 });
    server.online = false;
    const off = await q.flush(server.transport());
    expect(off).toMatchObject({ offline: true, applied: 0, remaining: 2 });
    server.online = true;
    expect(await q.flush(server.transport())).toMatchObject({ applied: 2, remaining: 0 });
    expect(server.recordCount()).toBe(2);
  });
  it("coalesces unsent edits of one record into a single operation", async () => {
    const q = mk("laptop");
    await q.enqueue({ ...entity("p1"), kind: "upsert", payload: { v: 1 }, baseRevision: 0 });
    await q.enqueue({ ...entity("p1"), kind: "upsert", payload: { v: 2 }, baseRevision: 0 });
    const ops = await q.pending();
    expect(ops).toHaveLength(1);
    expect(ops[0].payload).toEqual({ v: 2 });
  });
  it("is idempotent when the connection drops after the server applied an operation", async () => {
    const server = new InMemorySyncServer();
    const q = mk("laptop");
    await q.enqueue({ ...entity("p1"), kind: "upsert", payload: { v: 1 }, baseRevision: 0 });
    const real = server.transport();
    let lost = true;
    const flaky: SyncTransport = { pull: real.pull, push: async (op: SyncOperation) => { const out = await real.push(op); if (lost) { lost = false; throw new Error("socket reset after write"); } return out; } };
    const first = await q.flush(flaky);
    expect(first.applied).toBe(0);
    expect(first.remaining).toBe(1);
    const second = await q.flush(flaky);
    expect(second).toMatchObject({ duplicates: 1, remaining: 0 });
    expect(server.recordCount()).toBe(1);
  });
  it("detects a conflict between two devices and blocks only that record", async () => {
    const server = new InMemorySyncServer();
    const a = mk("laptop"), b = mk("phone");
    await a.enqueue({ ...entity("p1"), kind: "upsert", payload: { rate: 100 }, baseRevision: 0 });
    await a.flush(server.transport());
    await b.enqueue({ ...entity("p1"), kind: "upsert", payload: { rate: 90 }, baseRevision: 0 }); // phone never saw the laptop's write
    await b.enqueue({ ...entity("p2"), kind: "upsert", payload: { ok: true }, baseRevision: 0 });
    const report = await b.flush(server.transport());
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0].remote).toEqual({ rate: 100 });
    expect(report.applied).toBe(1); // p2 still went through
    // Resolve with the merged payload on top of the server's current revision.
    await b.resolveConflict(report.conflicts[0].opId, { rate: 100 }, 1);
    expect(await b.flush(server.transport())).toMatchObject({ applied: 1, remaining: 0 });
  });
  it("chains base revisions for several edits of the same record in one flush", async () => {
    const server = new InMemorySyncServer();
    const q = mk("laptop");
    await q.enqueue({ ...entity("p1"), kind: "upsert", payload: { v: 1 }, baseRevision: 0 });
    // A delete cannot be coalesced with an upsert, so it stays a second operation.
    await q.enqueue({ ...entity("p1"), kind: "delete", payload: null, baseRevision: 0 });
    expect(await q.flush(server.transport())).toMatchObject({ applied: 2, conflicts: [], remaining: 0 });
    expect(server.recordCount()).toBe(0);
  });
  it("rejects an upsert without payload and a missing device id", async () => {
    await expect(mk("x").enqueue({ ...entity("p"), kind: "upsert", payload: null, baseRevision: 0 })).rejects.toThrow();
    expect(() => new OfflineQueue(new MemoryQueueStore(), " ", () => "1")).toThrow();
  });
});

describe("report export", () => {
  const items: BoqItemInput[] = [
    { id: "1", code: "T-1", description: "Tile <60x60> & grout", unit: "m2", netQuantity: 20, sourceRef: "room:r1:floor", approvedWasteRatePct: 10, wasteApprovalRef: "W-1", unitRate: 250, rateSourceRef: "Quote 7", costQuantityBasis: "order" },
    { id: "2", code: "P-1", description: "Paint", unit: "m2", netQuantity: 50.31, sourceRef: "room:r1:wall" }
  ];
  const input = {
    projectName: "Villa & <Garden>", buildingCondition: "plaster-only", generatedAt: "2026-11-13", currency: "EGP",
    rooms: project().rooms, items,
    adjustments: [{ id: "a", label: "Profit", kind: "profit" as const, ratePct: 10, base: "direct" as const, order: 1, approvalRef: "OK-1", clientVisible: true }]
  };
  it("reports totals straight from the engine and flags the incomplete state", () => {
    const m = buildReportModel(input);
    expect(m.cost.directSubtotal).toBe(5500);
    expect(m.cost.complete).toBe(false);
    expect(m.reviewNotes.join(" ")).toContain("no sourced unit rate");
  });
  it("renders escaped, direction-aware HTML in both languages", () => {
    const m = buildReportModel(input);
    const ar = renderReportHtml(m, "ar");
    const en = renderReportHtml(m, "en");
    expect(ar).toContain('dir="rtl"');
    expect(en).toContain('dir="ltr"');
    expect(ar).toContain("تقرير حصر الكميات والتكاليف");
    expect(en).toContain("Tile &lt;60x60&gt; &amp; grout");
    expect(en).not.toContain("<60x60>");
    expect(en).toContain("room:r1:floor");
  });
  it("builds a valid xlsx container with sheets, numbers and escaped text", () => {
    const bytes = buildXlsx(buildReportModel(input), "ar");
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    const files = readStoredZip(bytes); // also verifies every CRC
    expect([...files.keys()]).toEqual(expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml"]));
    const sheet1 = files.get("xl/worksheets/sheet1.xml")!;
    expect(sheet1).toContain('rightToLeft="1"');
    expect(sheet1).toContain("<v>5500</v>");
    expect(sheet1).toContain("Tile &lt;60x60&gt; &amp; grout");
    expect(files.get("xl/workbook.xml")).toContain("المقايسة");
  });
  it("does not let a formula-looking string become a formula", () => {
    const m = buildReportModel({ ...input, items: [{ ...items[0], description: "=HYPERLINK(\"http://x\")" }] });
    const sheet = readStoredZip(buildXlsx(m, "en")).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).not.toContain("<f>");
  });
});
