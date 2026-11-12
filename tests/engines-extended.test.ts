import { describe, expect, it } from "vitest";
import { auditDimensions } from "../src/domain/dimension-audit";
import { applyAssembly, findDuplicateSourceRefs, type AssemblyDefinition } from "../src/domain/finishing-assemblies";
import { calculateDuration, type ProductivityRate } from "../src/domain/productivity-engine";
import { calculateRevisedTotals, calculateVariation, transitionVariation, type VariationOrder } from "../src/domain/variation-orders";
import { calculateMepTakeoff, mepToBoqItems } from "../src/domain/mep-takeoff";
import { buildClientBoq, calculateProjectCost, type CostAdjustment } from "../src/domain/cost-engine";
import { calculateCriticalPath, estimateSchedule, workingDayToDate } from "../src/domain/critical-path";
import { addNode, rollupQuantities, validateHierarchy, type HierarchyNode } from "../src/domain/project-hierarchy";
import type { RoomInput } from "../src/domain/quantity-engine";
import type { BoqItemInput } from "../src/domain/boq-engine";

const room: RoomInput = {
  id: "r1", name: "Living", lengthM: 5, widthM: 4, heightM: 3,
  wallFaces: [
    { id: "w1", lengthM: 5, heightM: 3, openings: [{ id: "win", widthM: 1.2, heightM: 1.5, deductionEnabled: true }] },
    { id: "w2", lengthM: 4, heightM: 3, openings: [{ id: "door", widthM: 0.9, heightM: 2.1, deductionEnabled: true }] },
    { id: "w3", lengthM: 5, heightM: 3, openings: [] },
    { id: "w4", lengthM: 4, heightM: 3, openings: [] }
  ]
};
let counter = 0;
const nextId = (): string => `id-${++counter}`;
const obs = (id: string, key: string, value: number, source: "dimension-text" | "drawing-extraction" | "field-measurement", unit: "m" | "cm" | "mm" = "m", confidence?: number) =>
  ({ id, dimensionKey: key, value, unit, source, sourceRef: `sheet-${id}`, confidence });

describe("dimension audit", () => {
  it("matches written and extracted values within an explicit tolerance across units", () => {
    const report = auditDimensions([obs("a", "L1", 5000, "dimension-text", "mm"), obs("b", "L1", 5.001, "drawing-extraction")], { toleranceM: 0.002 });
    expect(report.matched).toBe(1);
    expect(report.canApproveDependentQuantities).toBe(true);
  });
  it("blocks dependent quantities when a dimension differs or is incomplete", () => {
    const report = auditDimensions([
      obs("a", "L1", 5, "dimension-text"), obs("b", "L1", 5.2, "drawing-extraction"),
      obs("c", "L2", 4, "dimension-text")
    ], { toleranceM: 0.01 });
    expect(report.needsReview).toBe(1);
    expect(report.incomplete).toBe(1);
    expect(report.blockedDimensionKeys).toEqual(["L1", "L2"]);
    expect(report.canApproveDependentQuantities).toBe(false);
  });
  it("flags missing or low extraction confidence only when a floor is given", () => {
    const base = [obs("a", "L1", 5, "dimension-text"), obs("b", "L1", 5, "drawing-extraction", "m", 0.4)];
    expect(auditDimensions(base, { toleranceM: 0.01 }).matched).toBe(1);
    expect(auditDimensions(base, { toleranceM: 0.01, minExtractionConfidence: 0.8 }).needsReview).toBe(1);
  });
  it("rejects a missing tolerance and flags field measurement drift", () => {
    expect(() => auditDimensions([], { toleranceM: Number.NaN })).toThrow();
    const report = auditDimensions([obs("a", "L1", 5, "dimension-text"), obs("b", "L1", 5, "drawing-extraction"), obs("c", "L1", 5.3, "field-measurement")], { toleranceM: 0.01 });
    expect(report.entries[0].status).toBe("needs-review");
    expect(report.entries[0].fieldDifferenceM).toBe(0.3);
  });
});

describe("finishing assemblies", () => {
  const def: AssemblyDefinition = {
    id: "porcelain", name: "Porcelain floor", version: 1,
    components: [
      { id: "tile", code: "TL", description: "Porcelain tile", unit: "m2", basis: "floor-area", quantityPerBasisUnit: 1, ruleRef: "spec-4.2" },
      { id: "skirt", code: "SK", description: "Skirting", unit: "m", basis: "perimeter", quantityPerBasisUnit: 1, ruleRef: "spec-4.3" }
    ]
  };
  it("derives component quantities from measured geometry with a stable source reference", () => {
    const result = applyAssembly(def, [room], [], nextId);
    expect(result.addedItems.map(i => [i.unit, i.netQuantity])).toEqual([["m2", 20], ["m", 18]]);
    expect(result.addedItems[0].sourceRef).toContain("assembly:porcelain@v1:room:r1");
  });
  it("is idempotent and updates changed quantities in place", () => {
    const first = applyAssembly(def, [room], [], nextId).addedItems;
    const again = applyAssembly(def, [room], first, nextId);
    expect(again.addedItems).toHaveLength(0);
    expect(again.alreadyPresentCount).toBe(2);
    const bigger = applyAssembly(def, [{ ...room, lengthM: 6 }], first, nextId);
    expect(bigger.updatedItems[0].netQuantity).toBe(24);
    expect(bigger.updatedItems[0].id).toBe(first[0].id);
  });
  it("warns about overlap with generic room items and skips wall bases without verified walls", () => {
    const wallDef: AssemblyDefinition = { ...def, components: [{ id: "paint", code: "PT", description: "Paint", unit: "m2", basis: "wall-net-area", quantityPerBasisUnit: 1, ruleRef: "spec-9" }] };
    const bare = applyAssembly(wallDef, [{ ...room, wallFaces: [] }], [], nextId);
    expect(bare.skipped).toHaveLength(1);
    const generic: BoqItemInput = { id: "g", code: "x", description: "x", unit: "m2", netQuantity: 1, sourceRef: "room:r1:takeoff:v1:net-wall-area" };
    expect(applyAssembly(wallDef, [room], [generic], nextId).overlapWarnings).toHaveLength(1);
  });
  it("rejects components without a rule reference and detects duplicate source refs", () => {
    expect(() => applyAssembly({ ...def, components: [{ ...def.components[0], ruleRef: " " }] }, [room], [], nextId)).toThrow();
    const dup: BoqItemInput = { id: "1", code: "a", description: "a", unit: "m", netQuantity: 1, sourceRef: "s" };
    expect(findDuplicateSourceRefs([dup, { ...dup, id: "2" }])).toEqual(["s"]);
  });
});

describe("productivity engine", () => {
  const rate = (over: Partial<ProductivityRate> = {}): ProductivityRate => ({ id: "t", unit: "m2", basis: "per-crew-day", value: 10, sourceRef: "contractor quote", sourceDate: "2026-11-01", location: "Cairo", ...over });
  const act = { id: "a", name: "Tiling", quantity: 55, unit: "m2" as const, quantitySourceRef: "boq", rateId: "t", predecessors: [] };
  it("returns unestimated without a rate, never a default", () => {
    expect(calculateDuration({ ...act, rateId: undefined }, [rate()], "none").status).toBe("unestimated");
  });
  it("does not multiply a per-crew-day rate by crew size", () => {
    const result = calculateDuration({ ...act, crewSize: 4 }, [rate()], "none");
    expect(result.baseDurationDays).toBe(5.5);
    expect(result.checks.join(" ")).toContain("ignored");
  });
  it("requires crew size for per-worker-day rates and rounds up only when asked", () => {
    expect(calculateDuration(act, [rate({ basis: "per-worker-day" })], "none").status).toBe("invalid");
    expect(calculateDuration({ ...act, crewSize: 2 }, [rate({ basis: "per-worker-day" })], "ceil").baseDurationDays).toBe(3);
  });
  it("flags unit mismatches and unknown rates", () => {
    expect(calculateDuration({ ...act, unit: "m" }, [rate()], "none").status).toBe("invalid");
    expect(calculateDuration({ ...act, rateId: "zzz" }, [rate()], "none").status).toBe("invalid");
  });
});

describe("variation orders", () => {
  const item = (over: Partial<BoqItemInput> = {}): BoqItemInput => ({ id: "i", code: "c", description: "d", unit: "m2", netQuantity: 10, sourceRef: "s", unitRate: 100, rateSourceRef: "q", costQuantityBasis: "net", ...over });
  const vo = (over: Partial<VariationOrder> = {}): VariationOrder => ({ id: "v1", number: "VO-1", title: "Extra", reason: "client", baseRevision: "R1", status: "draft", createdAt: "2026-11-01", items: [{ direction: "addition", item: item() }], ...over });
  it("nets additions and omissions", () => {
    const result = calculateVariation(vo({ items: [{ direction: "addition", item: item() }, { direction: "omission", item: item({ id: "j", netQuantity: 3 }) }] }));
    expect(result.total).toBe(700);
  });
  it("enforces the status workflow and an approval reference", () => {
    const submitted = transitionVariation(vo(), "submitted");
    expect(() => transitionVariation(submitted, "approved")).toThrow();
    const approved = transitionVariation(submitted, "approved", "LTR-55");
    expect(approved.approvalRef).toBe("LTR-55");
    expect(() => transitionVariation(approved, "draft")).toThrow();
  });
  it("only approved variations change the revised total", () => {
    const approved = transitionVariation(transitionVariation(vo(), "submitted"), "approved", "A");
    const pending = transitionVariation(vo({ id: "v2", number: "VO-2" }), "submitted");
    const totals = calculateRevisedTotals(5000, [approved, pending, vo({ id: "v3", number: "VO-3" })]);
    expect(totals).toMatchObject({ approvedVariationsTotal: 1000, revisedTotal: 6000, pendingVariationsTotal: 1000 });
    expect(() => calculateRevisedTotals(0, [approved, { ...approved, id: "z" }])).toThrow(/Duplicate/);
  });
  it("marks unpriced variation items as incomplete", () => {
    const totals = calculateRevisedTotals(0, [vo({ items: [{ direction: "addition", item: item({ unitRate: undefined, rateSourceRef: undefined, costQuantityBasis: undefined }) }] })]);
    expect(totals.incompleteVariationNumbers).toEqual(["VO-1"]);
  });
});

describe("MEP takeoff", () => {
  const points = [
    { id: "p1", discipline: "electrical" as const, deviceType: "Socket", count: 6, drawingRef: "E-01", reviewed: true },
    { id: "p2", discipline: "electrical" as const, deviceType: "Switch", count: 4, drawingRef: "E-01", reviewed: false }
  ];
  it("never infers circuits from area", () => {
    const result = calculateMepTakeoff({ points, circuits: [], cableRuns: [] });
    expect(result.circuitCount).toBeNull();
    expect(result.circuitStatus).toBe("needs-review");
  });
  it("counts circuits only from the schedule and reports unscheduled points", () => {
    const result = calculateMepTakeoff({ points, circuits: [{ id: "c", panelRef: "DB1", circuitRef: "C1", scheduleRef: "S-1", pointIds: ["p1"] }], cableRuns: [] });
    expect(result.circuitCount).toBe(1);
    expect(result.unscheduledPointIds).toEqual(["p2"]);
  });
  it("computes conductor length from route segments plus approved allowances", () => {
    const result = calculateMepTakeoff({ points: [], circuits: [], cableRuns: [{ id: "k1", discipline: "electrical", spec: "3x2.5", cores: 3, parallelRuns: 1, routeRef: "E-02", segments: [{ id: "s1", lengthM: 10 }, { id: "s2", lengthM: 5 }], allowances: [{ description: "drop", lengthM: 2, approvalRef: "A1" }] }] });
    expect(result.cableRuns[0].conductorLengthM).toBe(51);
    expect(() => calculateMepTakeoff({ points: [], circuits: [], cableRuns: [{ id: "k", discipline: "electrical", spec: "x", cores: 1, parallelRuns: 1, routeRef: "r", segments: [{ id: "s", lengthM: 1 }], allowances: [{ description: "d", lengthM: 1, approvalRef: "" }] }] })).toThrow();
  });
  it("exports only reviewed points to BOQ", () => {
    const items = mepToBoqItems({ points, circuits: [], cableRuns: [] }, nextId);
    expect(items).toHaveLength(1);
    expect(items[0].netQuantity).toBe(6);
  });
});

describe("cost engine", () => {
  const priced: BoqItemInput[] = [
    { id: "1", code: "A", description: "A", unit: "m2", netQuantity: 100, sourceRef: "s", unitRate: 50, rateSourceRef: "q", costQuantityBasis: "net" },
    { id: "2", code: "B", description: "B", unit: "m", netQuantity: 10, sourceRef: "s", unitRate: 20, rateSourceRef: "q", costQuantityBasis: "net" }
  ];
  const adj = (over: Partial<CostAdjustment>): CostAdjustment => ({ id: "x", label: "x", kind: "other", order: 1, approvalRef: "ok", clientVisible: true, ...over });
  it("applies explicit adjustments on a declared base", () => {
    const s = calculateProjectCost(priced, [adj({ id: "o", ratePct: 10, base: "direct", order: 1 }), adj({ id: "t", kind: "tax", ratePct: 10, base: "cumulative", order: 2 })], "EGP");
    expect(s.directSubtotal).toBe(5200);
    expect(s.grandTotal).toBe(5200 + 520 + 572);
    expect(s.complete).toBe(true);
  });
  it("refuses adjustments without approval, base or exactly one amount type", () => {
    expect(() => calculateProjectCost(priced, [adj({ ratePct: 5 })], "EGP")).toThrow(/base/);
    expect(() => calculateProjectCost(priced, [adj({ approvalRef: "" , fixedAmount: 1 })], "EGP")).toThrow();
    expect(() => calculateProjectCost(priced, [adj({ ratePct: 5, fixedAmount: 5, base: "direct" })], "EGP")).toThrow();
  });
  it("reports incomplete totals when an item is unpriced", () => {
    const s = calculateProjectCost([...priced, { id: "3", code: "C", description: "C", unit: "m2", netQuantity: 1, sourceRef: "s" }], [], "EGP");
    expect(s.complete).toBe(false);
    expect(s.unpricedItems).toBe(1);
  });
  it("keeps hidden adjustments inside the client total", () => {
    const s = calculateProjectCost(priced, [adj({ id: "p", kind: "profit", ratePct: 10, base: "direct", clientVisible: false })], "EGP");
    const view = buildClientBoq(s, false);
    expect(view.hiddenAdjustmentsTotal).toBe(520);
    expect(view.grandTotal).toBe(5720);
    expect(view.rows[0].unitRate).toBeNull();
  });
});

describe("critical path", () => {
  it("finds the critical chain and float", () => {
    const r = calculateCriticalPath([
      { id: "A", name: "A", durationDays: 3, predecessors: [] },
      { id: "B", name: "B", durationDays: 2, predecessors: [{ id: "A", type: "FS", lagDays: 0 }] },
      { id: "C", name: "C", durationDays: 6, predecessors: [{ id: "A", type: "FS", lagDays: 0 }] },
      { id: "D", name: "D", durationDays: 1, predecessors: [{ id: "B", type: "FS", lagDays: 0 }, { id: "C", type: "FS", lagDays: 0 }] }
    ]);
    expect(r.projectDurationDays).toBe(10);
    expect(r.criticalActivityIds.sort()).toEqual(["A", "C", "D"]);
    expect(r.rows.find(x => x.id === "B")!.totalFloat).toBe(4);
  });
  it("supports SS with lag and FF relationships", () => {
    const r = calculateCriticalPath([
      { id: "A", name: "A", durationDays: 4, predecessors: [] },
      { id: "B", name: "B", durationDays: 3, predecessors: [{ id: "A", type: "SS", lagDays: 2 }] },
      { id: "C", name: "C", durationDays: 2, predecessors: [{ id: "A", type: "FF", lagDays: 1 }] }
    ]);
    expect(r.rows.find(x => x.id === "B")!.earlyStart).toBe(2);
    expect(r.rows.find(x => x.id === "C")!.earlyFinish).toBe(5);
  });
  it("rejects cycles, unknown predecessors and self-dependency", () => {
    expect(() => calculateCriticalPath([{ id: "A", name: "A", durationDays: 1, predecessors: [{ id: "B", type: "FS", lagDays: 0 }] }, { id: "B", name: "B", durationDays: 1, predecessors: [{ id: "A", type: "FS", lagDays: 0 }] }])).toThrow(/cycle/i);
    expect(() => calculateCriticalPath([{ id: "A", name: "A", durationDays: 1, predecessors: [{ id: "Z", type: "FS", lagDays: 0 }] }])).toThrow(/unknown/);
    expect(() => calculateCriticalPath([{ id: "A", name: "A", durationDays: 1, predecessors: [{ id: "A", type: "FS", lagDays: 0 }] }])).toThrow(/itself/);
  });
  it("refuses to schedule when an activity has no productivity rate", () => {
    const e = estimateSchedule([{ id: "a", name: "A", quantity: 1, unit: "m2", quantitySourceRef: "s", predecessors: [] }], [], "ceil");
    expect(e.status).toBe("incomplete");
    expect(e.cpm).toBeNull();
  });
  it("maps working days onto an explicit calendar", () => {
    const cal = { startDate: "2026-11-12", workingWeekdays: [0, 1, 2, 3, 4], holidays: ["2026-11-15"] };
    // Thu 12, (Fri 13 and Sat 14 are non-working), Sun 15 is a holiday, Mon 16 is the next working day.
    expect(workingDayToDate(cal, 0)).toBe("2026-11-12");
    expect(workingDayToDate(cal, 1)).toBe("2026-11-16");
    expect(() => workingDayToDate({ ...cal, workingWeekdays: [] }, 1)).toThrow();
  });
});

describe("project hierarchy", () => {
  const nodes: HierarchyNode[] = [
    { id: "c", type: "client", name: "Client", parentId: null },
    { id: "p", type: "project", name: "Tower", parentId: "c" },
    { id: "b", type: "building", name: "B1", parentId: "p" },
    { id: "f", type: "floor", name: "F1", parentId: "b" },
    { id: "u", type: "unit", name: "Apt 1", parentId: "f" },
    { id: "rn", type: "room", name: "Living", parentId: "u", roomId: "r1" }
  ];
  it("accepts a valid tree and rolls up engine quantities", () => {
    expect(validateHierarchy(nodes, [room])).toEqual([]);
    const unit = rollupQuantities(nodes, [room]).find(r => r.nodeId === "u")!;
    expect(unit.floorAreaM2).toBe(20);
    expect(unit.wallNetAreaM2).toBe(50.31);
  });
  it("rejects invalid parents, missing rooms and duplicates", () => {
    expect(() => addNode(nodes, { id: "x", type: "floor", name: "bad", parentId: "u" })).toThrow();
    expect(validateHierarchy(nodes, [{ ...room, id: "other" }]).join(" ")).toContain("missing room");
    expect(validateHierarchy([...nodes, nodes[0]]).join(" ")).toContain("Duplicate");
  });
});
