import { beforeEach, describe, expect, it } from "vitest";
import { addAssemblyComponent, addMepCableRun, addMepCircuit, addMepPoint, applyAssemblyToProject, assembliesOf, createAssembly, emptyMep, mepSummary, parseLengths, removeAssemblyComponent, removeMepPoint, syncMepToBoq, toggleMepPointReviewed } from "../src/domain/project-takeoff";
import { loadProjects, saveProjects, type ProjectRecord } from "../src/domain/project-store";

class FakeLocalStorage {
  private readonly data = new Map<string, string>();
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}
beforeEach(() => { (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage(); });

const room = { id: "living", name: "Living", lengthM: 5, widthM: 4, heightM: 3, wallFaces: [] };
const project = (over: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "p", name: "P", projectType: "apartment", buildingCondition: "plaster-only", createdAt: "2026-11-01T00:00:00.000Z", rooms: [room], boqItems: [], ...over
});
let n = 0; const id = (): string => `g${++n}`;
const comp = { code: "TILE", description: "Tile", unit: "m2", basis: "floor-area", quantityPerBasisUnit: "1", ruleRef: "spec 09" };

describe("assemblies", () => {
  it("requires ratio and rule reference, bumps version on change", () => {
    const def = createAssembly([], "Floor", "a1");
    expect(() => createAssembly([def], "floor", "a2")).toThrow();
    expect(() => addAssemblyComponent(def, { ...comp, ruleRef: " " }, "c1")).toThrow();
    expect(() => addAssemblyComponent(def, { ...comp, quantityPerBasisUnit: "" }, "c1")).toThrow();
    const one = addAssemblyComponent(def, comp, "c1");
    expect(one.version).toBe(1);
    const two = addAssemblyComponent(one, { ...comp, code: "ADH" }, "c2");
    expect(two.version).toBe(2);
    expect(() => addAssemblyComponent(two, comp, "c3")).toThrow();
    expect(removeAssemblyComponent(two, "c2").version).toBe(3);
  });
  it("applies idempotently and skips walls without geometry", () => {
    let def = addAssemblyComponent(createAssembly([], "Floor", "a1"), comp, "c1");
    def = addAssemblyComponent(def, { ...comp, code: "PNT", basis: "wall-net-area" }, "c2");
    const p = project({ assemblies: [def] });
    const first = applyAssemblyToProject(p, "a1", id);
    expect(first.result.addedItems).toHaveLength(1);
    expect(first.result.skipped).toHaveLength(1);
    expect(first.items[0].netQuantity).toBe(20);
    p.boqItems = first.items;
    const second = applyAssemblyToProject(p, "a1", id);
    expect(second.result.addedItems).toHaveLength(0);
    expect(second.result.alreadyPresentCount).toBe(1);
    expect(() => applyAssemblyToProject(p, "missing", id)).toThrow();
  });
});

const pointForm = { discipline: "electrical", deviceType: "Socket", count: "4", roomId: "", drawingRef: "E-01", sheet: "", revision: "", reviewed: true };

describe("MEP", () => {
  it("needs a drawing reference and a schedule; never infers circuits", () => {
    expect(() => addMepPoint(emptyMep(), { ...pointForm, drawingRef: "" }, "p1")).toThrow();
    expect(() => addMepPoint(emptyMep(), { ...pointForm, count: "1.5" }, "p1")).toThrow();
    const mep = addMepPoint(emptyMep(), pointForm, "p1");
    expect(mepSummary(project({ mep })).circuitCount).toBeNull();
    const withCircuit = addMepCircuit(mep, { panelRef: "DB1", circuitRef: "C1", scheduleRef: "S-1", pointIds: ["p1"] }, "c1");
    expect(mepSummary(project({ mep: withCircuit })).circuitCount).toBe(1);
    expect(() => addMepCircuit(mep, { panelRef: "DB1", circuitRef: "C1", scheduleRef: "S-1", pointIds: ["nope"] }, "c1")).toThrow();
    expect(removeMepPoint(withCircuit, "p1").circuits[0].pointIds).toEqual([]);
  });
  it("computes conductor length from segments and approved allowances only", () => {
    expect(parseLengths("2, 3.5\n4")).toEqual([2, 3.5, 4]);
    const form = { discipline: "electrical", spec: "3x2.5", cores: "3", parallelRuns: "1", routeRef: "R-1", segments: "10, 5", allowanceLength: "", allowanceDescription: "", allowanceApprovalRef: "" };
    const mep = addMepCableRun(emptyMep(), form, "r1");
    expect(mepSummary(project({ mep })).cableRuns[0].conductorLengthM).toBe(45);
    expect(() => addMepCableRun(emptyMep(), { ...form, segments: "10, -2" }, "r2")).toThrow();
    expect(() => addMepCableRun(emptyMep(), { ...form, allowanceLength: "2", allowanceDescription: "Drop", allowanceApprovalRef: "" }, "r2")).toThrow();
    const withAllowance = addMepCableRun(emptyMep(), { ...form, allowanceLength: "1", allowanceDescription: "Drop", allowanceApprovalRef: "Eng" }, "r3");
    expect(mepSummary(project({ mep: withAllowance })).cableRuns[0].conductorLengthM).toBe(48);
  });
  it("syncs only reviewed points, keeps rates, never duplicates", () => {
    let mep = addMepPoint(emptyMep(), { ...pointForm, reviewed: false }, "p1");
    let p = project({ mep });
    expect(syncMepToBoq(p, id).added).toBe(0);
    mep = toggleMepPointReviewed(mep, "p1");
    p = project({ mep });
    const first = syncMepToBoq(p, id);
    expect(first.added).toBe(1);
    p.boqItems = first.items.map(i => ({ ...i, unitRate: 25, rateSourceRef: "Q1" }));
    p.mep = addMepPoint(mep, { ...pointForm, count: "2" }, "p2");
    const second = syncMepToBoq(p, id);
    expect(second.added).toBe(0);
    expect(second.updated).toBe(1);
    expect(second.items[0]).toMatchObject({ netQuantity: 6, unitRate: 25 });
    p.mep = toggleMepPointReviewed(p.mep, "p1");
    p.boqItems = second.items;
    expect(syncMepToBoq(p, id).staleCount).toBe(1);
  });
});

describe("store", () => {
  it("round-trips assemblies and MEP, and drops malformed ones", () => {
    const def = addAssemblyComponent(createAssembly([], "Floor", "a1"), comp, "c1");
    const mep = addMepPoint(emptyMep(), pointForm, "p1");
    saveProjects([project({ assemblies: [def], mep })]);
    const [loaded] = loadProjects();
    expect(assembliesOf(loaded)).toHaveLength(1);
    expect(loaded.mep?.points).toHaveLength(1);
    localStorage.setItem("finishing-boq.projects.v1", JSON.stringify([{ ...project({ id: "bad" }), mep: { points: [{ id: 1 }], circuits: [], cableRuns: [] } }, project({ id: "ok" })]));
    expect(loadProjects().map(x => x.id)).toEqual(["ok"]);
  });
});
