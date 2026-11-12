import { describe, expect, it } from "vitest";
import { calculateBoq, calculateBoqItem, type BoqItemInput } from "../src/domain/boq-engine";

const base: BoqItemInput = {
  id: "boq-1", code: "FL-001", description: "Porcelain floor finish",
  unit: "m2", netQuantity: 20, sourceRef: "A-101#Kitchen-floor"
};

describe("BOQ quantity and costing engine", () => {
  it("keeps waste and order quantity undetermined when no approved waste rule exists", () => {
    const result = calculateBoqItem(base);
    expect(result.netQuantity).toBe(20);
    expect(result.wasteQuantity).toBeNull();
    expect(result.orderQuantity).toBeNull();
    expect(result.lineTotal).toBeNull();
  });

  it("calculates waste only with an explicit approval reference", () => {
    const result = calculateBoqItem({
      ...base, approvedWasteRatePct: 5, wasteApprovalRef: "VO-02 approved"
    });
    expect(result.wasteQuantity).toBe(1);
    expect(result.orderQuantity).toBe(21);
    expect(result.status).toBe("verified");
  });

  it("rejects an unreferenced waste percentage", () => {
    expect(() => calculateBoqItem({
      ...base, approvedWasteRatePct: 5
    })).toThrow(/approval reference/);
  });

  it("prices net quantity only when the rate and its source are explicit", () => {
    const result = calculateBoqItem({
      ...base, unitRate: 250, rateSourceRef: "Supplier quotation Q-10",
      costQuantityBasis: "net"
    });
    expect(result.pricedQuantity).toBe(20);
    expect(result.lineTotal).toBe(5000);
  });

  it("prices order quantity only when waste is approved", () => {
    const result = calculateBoqItem({
      ...base, approvedWasteRatePct: 5, wasteApprovalRef: "Approved spec 4.2",
      unitRate: 250, rateSourceRef: "Supplier quote Q-10", costQuantityBasis: "order"
    });
    expect(result.pricedQuantity).toBe(21);
    expect(result.lineTotal).toBe(5250);
  });

  it("flags order-basis costing without approved waste", () => {
    const result = calculateBoqItem({
      ...base, unitRate: 250, rateSourceRef: "Supplier quote Q-10",
      costQuantityBasis: "order"
    });
    expect(result.lineTotal).toBeNull();
    expect(result.status).toBe("needs-review");
  });

  it("rejects an unreferenced unit rate", () => {
    expect(() => calculateBoqItem({
      ...base, unitRate: 100, costQuantityBasis: "net"
    })).toThrow(/source reference/);
  });

  it("aggregates priced subtotal and exposes unpriced/review counts", () => {
    const result = calculateBoq([
      {...base, unitRate: 100, rateSourceRef: "Q1", costQuantityBasis: "net"},
      {...base, id: "boq-2", code: "WL-001", unitRate: 50, rateSourceRef: "Q2", costQuantityBasis: "net"}
    ]);
    expect(result.pricedSubtotal).toBe(3000);
    expect(result.unpricedItems).toBe(0);
    expect(result.reviewItems).toBe(0);
  });

  it("rejects negative or non-finite quantities", () => {
    expect(() => calculateBoqItem({...base, netQuantity: -1})).toThrow(/non-negative/);
    expect(() => calculateBoqItem({...base, netQuantity: Number.NaN})).toThrow(/non-negative/);
  });
});
