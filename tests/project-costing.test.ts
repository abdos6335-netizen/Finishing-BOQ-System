import { beforeEach, describe, expect, it } from "vitest";
import { addVariationItem, adjustmentsOf, buildAdjustment, buildVariationItem, canDeleteVariation, createVariation, nextVariationNumber, projectFinancials, removeVariationItem, variationsOf } from "../src/domain/project-costing";
import { loadProjects, saveProjects, type ProjectRecord } from "../src/domain/project-store";
import { transitionVariation } from "../src/domain/variation-orders";

class FakeLocalStorage {
  private readonly data = new Map<string, string>();
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}
beforeEach(() => { (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage(); });

const project = (over: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "p", name: "P", projectType: "apartment", buildingCondition: "plaster-only", createdAt: "2026-11-01T00:00:00.000Z",
  rooms: [], boqItems: [{ id: "i1", code: "F", description: "Floor", unit: "m2", netQuantity: 10, sourceRef: "r", unitRate: 100, rateSourceRef: "Q1", costQuantityBasis: "net" }], ...over
});
const form = { label: "Profit", kind: "profit", ratePct: "10", fixedAmount: "", base: "direct", order: "", approvalRef: "Mgr", clientVisible: true };

describe("adjustments", () => {
  it("builds with auto order and rolls into the total", () => {
    const p = project({ currency: "EGP" });
    p.adjustments = [buildAdjustment(p, form, "a1")];
    expect(p.adjustments[0].order).toBe(1);
    const f = projectFinancials(p);
    expect(f.cost.grandTotal).toBe(1100);
    expect(f.currencyMissing).toBe(false);
  });
  it("rejects missing approval, rate without base, and rate plus fixed", () => {
    const p = project();
    expect(() => buildAdjustment(p, { ...form, approvalRef: " " }, "x")).toThrow();
    expect(() => buildAdjustment(p, { ...form, base: "" }, "x")).toThrow();
    expect(() => buildAdjustment(p, { ...form, fixedAmount: "5" }, "x")).toThrow();
  });
  it("flags a missing currency", () => {
    expect(projectFinancials(project()).currencyMissing).toBe(true);
  });
});

describe("variation orders", () => {
  it("numbers, edits only in draft, and changes revised total only when approved", () => {
    const p = project({ currency: "EGP" });
    const vo = createVariation([], { number: nextVariationNumber([]), title: "Extra", reason: "Client", baseRevision: "R1" }, "v1", "2026-11-13T00:00:00.000Z");
    expect(vo.number).toBe("VO-1");
    expect(() => createVariation([vo], { number: "VO-1", title: "t", reason: "r", baseRevision: "R1" }, "v2", "d")).toThrow();
    const entry = buildVariationItem({ direction: "addition", code: "X", description: "Extra", unit: "m2", netQuantity: "2", sourceRef: "s", unitRate: "50", rateSourceRef: "Q2" }, "vi1");
    let v = addVariationItem(vo, entry);
    p.variations = [v];
    expect(projectFinancials(p).revised!.revisedTotal).toBe(1000);
    v = transitionVariation(v, "submitted");
    expect(() => addVariationItem(v, entry)).toThrow();
    expect(() => removeVariationItem(v, "vi1")).toThrow();
    expect(canDeleteVariation(v)).toBe(false);
    v = transitionVariation(v, "approved", "CO-7");
    p.variations = [v];
    expect(projectFinancials(p).revised!.revisedTotal).toBe(1100);
    expect(canDeleteVariation(v)).toBe(false);
  });
  it("rejects bad item input", () => {
    expect(() => buildVariationItem({ direction: "x", code: "X", description: "d", unit: "m2", netQuantity: "1", sourceRef: "s", unitRate: "", rateSourceRef: "" }, "i")).toThrow();
    expect(() => buildVariationItem({ direction: "addition", code: "X", description: "d", unit: "m2", netQuantity: "1", sourceRef: "", unitRate: "", rateSourceRef: "" }, "i")).toThrow();
  });
});

describe("store round-trip", () => {
  it("keeps new fields and loads legacy projects without them", () => {
    const p = project({ currency: "EGP" });
    p.adjustments = [buildAdjustment(p, form, "a1")];
    p.variations = [createVariation([], { number: "VO-1", title: "t", reason: "r", baseRevision: "R1" }, "v1", "2026-11-13T00:00:00.000Z")];
    saveProjects([p, project({ id: "legacy" })]);
    const [a, b] = loadProjects();
    expect(a.currency).toBe("EGP");
    expect(adjustmentsOf(a)).toHaveLength(1);
    expect(variationsOf(a)).toHaveLength(1);
    expect(b.adjustments).toBeUndefined();
    expect(adjustmentsOf(b)).toEqual([]);
  });
  it("drops a project whose adjustments are malformed", () => {
    localStorage.setItem("finishing-boq.projects.v1", JSON.stringify([{ ...project({ id: "bad" }), adjustments: [{ id: 1 }] }, project({ id: "ok" })]));
    expect(loadProjects().map(x => x.id)).toEqual(["ok"]);
  });
});
