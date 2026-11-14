import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { compareWrittenAndExtractedDimensions, type DimensionObservation } from "../src/domain/measurement-audit";
import { auditDimensions } from "../src/domain/dimension-audit";
import { calculateRoomQuantities, type RoomInput } from "../src/domain/quantity-engine";
import { calculateBoq, type BoqItemInput } from "../src/domain/boq-engine";
import { generateRoomBoqItems } from "../src/domain/room-boq-link";
import { loadProjects, saveProjects, type ProjectRecord } from "../src/domain/project-store";
import { IndexedDbProjectStorage } from "../src/domain/storage";
import { applyAssembly } from "../src/domain/finishing-assemblies";
import { calculateProjectCost } from "../src/domain/cost-engine";
import { estimateSchedule } from "../src/domain/critical-path";
import { rollupQuantities, type HierarchyNode } from "../src/domain/project-hierarchy";
import { buildReportModel, buildXlsx, readStoredZip } from "../src/domain/report-export";

const living: RoomInput = {
  id: "living", name: "Living", lengthM: 5, widthM: 4, heightM: 3,
  wallFaces: [
    { id: "n", lengthM: 5, heightM: 3, openings: [{ id: "window", widthM: 1.2, heightM: 1.5, deductionEnabled: true }] },
    { id: "e", lengthM: 4, heightM: 3, openings: [{ id: "door", widthM: 0.9, heightM: 2.1, deductionEnabled: true }] },
    { id: "s", lengthM: 5, heightM: 3, openings: [] },
    { id: "w", lengthM: 4, heightM: 3, openings: [] }
  ]
};
let seq = 0;
const nextId = (): string => `gen-${++seq}`;

class FakeLocalStorage {
  private readonly data = new Map<string, string>();
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}
beforeEach(() => { (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage(); seq = 0; });

const record = (over: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "p1", name: "Apartment 12", projectType: "apartment", buildingCondition: "plaster-only",
  createdAt: "2026-11-01T00:00:00.000Z", rooms: [living], boqItems: [], ...over
});

describe("Scenario 1 — written vs extracted dimensions", () => {
  it("compares across units and reports the difference", () => {
    const written: DimensionObservation = { id: "w", dimensionKey: "living.length", value: 500, unit: "cm", source: "dimension-text", sourceRef: "A-101 rev B" };
    const extracted: DimensionObservation = { id: "x", dimensionKey: "living.length", value: 5.03, unit: "m", source: "drawing-extraction", sourceRef: "A-101 rev B", confidence: 0.9 };
    const within = compareWrittenAndExtractedDimensions(written, extracted, 0.05);
    expect(within.status).toBe("matched");
    const outside = compareWrittenAndExtractedDimensions(written, extracted, 0.01);
    expect(outside.status).toBe("needs-review");
    expect(outside.absoluteDifferenceM).toBeCloseTo(0.03, 10);
  });
});

describe("Scenario 2 — room, openings, deductions, BOQ link and cost", () => {
  it("reproduces the documented 5×4×3 m example end to end", () => {
    const q = calculateRoomQuantities(living);
    expect(q).toMatchObject({ floorAreaM2: 20, ceilingAreaM2: 20, wallGrossAreaM2: 54, openingDeductionM2: 3.69, wallNetAreaM2: 50.31, verification: "matched" });
    const linked = generateRoomBoqItems([living], [], nextId);
    expect(linked.addedItems.map(i => i.netQuantity)).toEqual([20, 20, 50.31]);
    const priced = linked.addedItems.map(i => ({ ...i, unitRate: 10, rateSourceRef: "Quote 1", costQuantityBasis: "net" as const }));
    expect(calculateBoq(priced).pricedSubtotal).toBe(903.1);
    const cost = calculateProjectCost(priced, [], "EGP");
    expect(cost.grandTotal).toBe(903.1);
    expect(cost.complete).toBe(true);
  });
});

describe("Scenario 3 — commercial approvals survive geometry updates", () => {
  it("updates the quantity but keeps waste approval and unit rate", () => {
    const first = generateRoomBoqItems([living], [], nextId).addedItems;
    const approved = first.map(i => i.sourceRef.endsWith("floor-area")
      ? { ...i, approvedWasteRatePct: 8, wasteApprovalRef: "W-9", unitRate: 300, rateSourceRef: "Quote 2", costQuantityBasis: "order" as const } : i);
    const resized = { ...living, lengthM: 6, wallFaces: living.wallFaces.map(f => f.id === "n" || f.id === "s" ? { ...f, lengthM: 6 } : f) };
    const sync = generateRoomBoqItems([resized], approved, nextId);
    const floor = sync.updatedItems.find(i => i.sourceRef.endsWith("floor-area"))!;
    expect(floor.netQuantity).toBe(24);
    expect(floor).toMatchObject({ approvedWasteRatePct: 8, wasteApprovalRef: "W-9", unitRate: 300, rateSourceRef: "Quote 2", id: approved[0].id });
  });
});

describe("Scenario 4 — wall quantities are blocked while dimensions need review", () => {
  it("blocks approval and withholds the wall BOQ line", () => {
    const audit = auditDimensions([
      { id: "w", dimensionKey: "living.length", value: 5, unit: "m", source: "dimension-text", sourceRef: "A-101" },
      { id: "x", dimensionKey: "living.length", value: 5.4, unit: "m", source: "drawing-extraction", sourceRef: "A-101", confidence: 0.9 }
    ], { toleranceM: 0.02 });
    expect(audit.canApproveDependentQuantities).toBe(false);
    expect(audit.blockedDimensionKeys).toEqual(["living.length"]);
    // A wall face whose opening exceeds the face cannot reconcile: no wall item is generated.
    const bad: RoomInput = { ...living, wallFaces: [{ id: "n", lengthM: 1, heightM: 3, openings: [{ id: "big", widthM: 2, heightM: 1, deductionEnabled: true }] }] };
    const result = generateRoomBoqItems([bad], [], nextId);
    expect(result.wallReviewCount).toBe(1);
    expect(result.addedItems.some(i => i.sourceRef.endsWith("net-wall-area"))).toBe(false);
    expect(buildReportModel({ projectName: "x", buildingCondition: "x", generatedAt: "d", currency: "EGP", rooms: [bad], items: [], adjustments: [] }).reviewNotes.join(" ")).toContain("exceeds");
  });
});

describe("Scenario 5 — save and reload project, rooms, openings and BOQ items", () => {
  it("round-trips through IndexedDB without loss", async () => {
    const db = new IndexedDbProjectStorage(new IDBFactory(), "integration-5");
    const project = record({ boqItems: generateRoomBoqItems([living], [], nextId).addedItems });
    await db.save(project);
    const [loaded] = await db.loadAll();
    expect(loaded).toEqual(project);
    expect(calculateRoomQuantities(loaded.rooms[0]).wallNetAreaM2).toBe(50.31);
    db.close();
  });
});

describe("Scenario 6 — migration of legacy projects", () => {
  it("defaults missing fields safely instead of guessing", () => {
    const legacy = { id: "old", name: "Old", createdAt: "2025-01-01", rooms: [living] };
    localStorage.setItem("finishing-boq.projects.v1", JSON.stringify([legacy]));
    const [migrated] = loadProjects();
    expect(migrated).toMatchObject({ id: "old", buildingCondition: "unspecified", projectType: "apartment", boqItems: [] });
  });
});

describe("Scenario 7 — invalid records are isolated", () => {
  it("keeps valid projects and drops only the corrupt ones", () => {
    localStorage.setItem("finishing-boq.projects.v1", JSON.stringify([record({ id: "ok" }), { id: "broken", name: 5 }, null, "text", record({ id: "ok2" })]));
    expect(loadProjects().map(p => p.id)).toEqual(["ok", "ok2"]);
    saveProjects(loadProjects());
    expect(loadProjects()).toHaveLength(2);
  });
});

describe("Full workflow — room to report", () => {
  it("assembly → hierarchy → cost → schedule → report → xlsx", () => {
    const nodes: HierarchyNode[] = [
      { id: "proj", type: "project", name: "Tower", parentId: null },
      { id: "bld", type: "building", name: "B1", parentId: "proj" },
      { id: "flr", type: "floor", name: "F1", parentId: "bld" },
      { id: "unit", type: "unit", name: "Apt 12", parentId: "flr" },
      { id: "rn", type: "room", name: "Living", parentId: "unit", roomId: "living" }
    ];
    expect(rollupQuantities(nodes, [living]).find(r => r.nodeId === "bld")!.wallNetAreaM2).toBe(50.31);

    const assembly = applyAssembly({
      id: "paint", name: "Paint system", version: 1,
      components: [{ id: "emulsion", code: "PNT", description: "Emulsion paint", unit: "m2", basis: "wall-net-area", quantityPerBasisUnit: 1, ruleRef: "spec 09-91" }]
    }, [living], [], nextId);
    const items: BoqItemInput[] = assembly.addedItems.map(i => ({ ...i, unitRate: 60, rateSourceRef: "Quote 3", costQuantityBasis: "net" as const }));

    const cost = calculateProjectCost(items, [{ id: "p", label: "Profit", kind: "profit", ratePct: 10, base: "direct", order: 1, approvalRef: "Mgr", clientVisible: true }], "EGP");
    expect(cost.directSubtotal).toBe(3018.6);
    expect(cost.grandTotal).toBe(3320.46);

    const schedule = estimateSchedule([{ id: "paint", name: "Painting", quantity: 50.31, unit: "m2", quantitySourceRef: items[0].sourceRef, rateId: "r", predecessors: [] }],
      [{ id: "r", unit: "m2", basis: "per-crew-day", value: 25, sourceRef: "Site record", sourceDate: "2026-10-01", location: "Cairo" }], "ceil");
    expect(schedule.cpm!.projectDurationDays).toBe(3);

    const model = buildReportModel({ projectName: "Apt 12", buildingCondition: "plaster-only", generatedAt: "2026-11-13", currency: "EGP", rooms: [living], items, adjustments: [{ id: "p", label: "Profit", kind: "profit", ratePct: 10, base: "direct", order: 1, approvalRef: "Mgr", clientVisible: true }] });
    expect(model.cost.grandTotal).toBe(cost.grandTotal);
    const files = readStoredZip(buildXlsx(model, "en"));
    expect(files.get("xl/worksheets/sheet1.xml")).toContain("<v>3018.6</v>");
  });
});
