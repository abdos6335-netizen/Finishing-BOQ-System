export type BoqUnit = "m" | "m2" | "m3" | "pcs";
export type CostQuantityBasis = "net" | "order";

export interface BoqItemInput {
  id: string;
  code: string;
  description: string;
  unit: BoqUnit;
  netQuantity: number;
  sourceRef: string;
  approvedWasteRatePct?: number;
  wasteApprovalRef?: string;
  unitRate?: number;
  rateSourceRef?: string;
  costQuantityBasis?: CostQuantityBasis;
}

export interface BoqItemResult {
  id: string;
  code: string;
  description: string;
  unit: BoqUnit;
  netQuantity: number;
  wasteRatePct: number | null;
  wasteQuantity: number | null;
  orderQuantity: number | null;
  unitRate: number | null;
  costQuantityBasis: CostQuantityBasis | null;
  pricedQuantity: number | null;
  lineTotal: number | null;
  sourceRef: string;
  wasteApprovalRef: string | null;
  rateSourceRef: string | null;
  checks: string[];
  status: "verified" | "needs-review";
}

const EPSILON = 1e-8;
const round = (n: number): number => Math.round((n + Number.EPSILON) * 10000) / 10000;

/**
 * Calculates one BOQ line without inventing waste or prices.
 * Waste is calculated only when both an explicit rate and its approval
 * reference exist. Cost is calculated only when a sourced unit rate exists.
 */
export function calculateBoqItem(item: BoqItemInput): BoqItemResult {
  const checks: string[] = [];
  if (!item.id.trim() || !item.code.trim() || !item.description.trim()) {
    throw new Error("BOQ item id, code, and description are required.");
  }
  if (!item.sourceRef.trim()) throw new Error("BOQ quantity source reference is required.");
  if (!Number.isFinite(item.netQuantity) || item.netQuantity < 0) {
    throw new Error("Net quantity must be finite and non-negative.");
  }
  if (item.approvedWasteRatePct !== undefined) {
    if (!Number.isFinite(item.approvedWasteRatePct) || item.approvedWasteRatePct < 0) {
      throw new Error("Approved waste rate must be finite and non-negative.");
    }
    if (!item.wasteApprovalRef?.trim()) {
      throw new Error("An approval reference is required for a waste rate.");
    }
  } else if (item.wasteApprovalRef) {
    checks.push("Waste approval reference exists without an approved waste rate.");
  }

  if (item.unitRate !== undefined) {
    if (!Number.isFinite(item.unitRate) || item.unitRate < 0) {
      throw new Error("Unit rate must be finite and non-negative.");
    }
    if (!item.rateSourceRef?.trim()) throw new Error("A source reference is required for the unit rate.");
    if (!item.costQuantityBasis) throw new Error("Cost quantity basis must be explicitly selected.");
  } else if (item.rateSourceRef || item.costQuantityBasis) {
    checks.push("Cost metadata exists without a unit rate.");
  }

  const hasApprovedWaste = item.approvedWasteRatePct !== undefined && !!item.wasteApprovalRef?.trim();
  const wasteQuantity = hasApprovedWaste ? round(item.netQuantity * item.approvedWasteRatePct! / 100) : null;
  const orderQuantity = hasApprovedWaste ? round(item.netQuantity + wasteQuantity!) : null;

  if (item.costQuantityBasis === "order" && !hasApprovedWaste) {
    checks.push("Order-quantity costing requires an approved waste rate and approval reference.");
  }
  const canPrice = item.unitRate !== undefined && !!item.rateSourceRef?.trim() &&
    !!item.costQuantityBasis && (item.costQuantityBasis !== "order" || hasApprovedWaste);
  const pricedQuantity = canPrice
    ? (item.costQuantityBasis === "order" ? orderQuantity! : item.netQuantity)
    : null;
  const lineTotal = canPrice ? round(pricedQuantity! * item.unitRate!) : null;

  // Independent verification uses a separate expression and does not call the primary helpers.
  if (hasApprovedWaste) {
    const independentlyCalculatedOrder = round(item.netQuantity * (1 + item.approvedWasteRatePct! / 100));
    if (Math.abs(independentlyCalculatedOrder - orderQuantity!) > EPSILON) {
      checks.push("Independent order-quantity verification mismatch.");
    }
  }
  if (canPrice) {
    const independentCost = round((item.costQuantityBasis === "order" ? orderQuantity! : item.netQuantity) * item.unitRate!);
    if (Math.abs(independentCost - lineTotal!) > EPSILON) {
      checks.push("Independent line-total verification mismatch.");
    }
  }

  return {
    id: item.id, code: item.code, description: item.description, unit: item.unit,
    netQuantity: round(item.netQuantity),
    wasteRatePct: hasApprovedWaste ? item.approvedWasteRatePct! : null,
    wasteQuantity, orderQuantity, unitRate: item.unitRate ?? null,
    costQuantityBasis: canPrice ? item.costQuantityBasis! : null,
    pricedQuantity, lineTotal, sourceRef: item.sourceRef,
    wasteApprovalRef: hasApprovedWaste ? item.wasteApprovalRef! : null,
    rateSourceRef: item.unitRate !== undefined ? item.rateSourceRef! : null,
    checks, status: checks.length ? "needs-review" : "verified"
  };
}

export function calculateBoq(items: BoqItemInput[]): {
  items: BoqItemResult[];
  pricedSubtotal: number;
  unpricedItems: number;
  reviewItems: number;
} {
  const results = items.map(calculateBoqItem);
  return {
    items: results,
    pricedSubtotal: round(results.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0)),
    unpricedItems: results.filter(item => item.lineTotal === null).length,
    reviewItems: results.filter(item => item.status === "needs-review").length
  };
}
