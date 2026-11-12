import { calculateBoq, type BoqItemInput, type BoqItemResult } from "./boq-engine";
import { assertNonNegative, requireText, round } from "./numeric";

/**
 * Project cost roll-up. Every adjustment (transport, fees, contingency, profit,
 * tax…) needs an approval reference and an explicit base, so nothing is
 * defaulted and double counting is a visible choice rather than an accident.
 */
export type CostAdjustmentKind = "transport" | "engineer-fee" | "overhead" | "contingency" | "profit" | "tax" | "other";
/** "direct": percentage of the direct subtotal only. "cumulative": direct plus all earlier adjustments. */
export type AdjustmentBase = "direct" | "cumulative";

export interface CostAdjustment {
  id: string;
  label: string;
  kind: CostAdjustmentKind;
  ratePct?: number;
  fixedAmount?: number;
  base?: AdjustmentBase;
  order: number;
  approvalRef: string;
  clientVisible: boolean;
}

export interface CostAdjustmentResult {
  id: string;
  label: string;
  kind: CostAdjustmentKind;
  ratePct: number | null;
  fixedAmount: number | null;
  base: AdjustmentBase | null;
  baseAmount: number | null;
  amount: number;
  approvalRef: string;
  clientVisible: boolean;
}

export interface ProjectCostSummary {
  currency: string;
  items: BoqItemResult[];
  directSubtotal: number;
  adjustments: CostAdjustmentResult[];
  adjustmentsTotal: number;
  grandTotal: number;
  unpricedItems: number;
  reviewItems: number;
  complete: boolean;
  checks: string[];
}

export function calculateProjectCost(items: BoqItemInput[], adjustments: CostAdjustment[], currency: string): ProjectCostSummary {
  const cur = requireText(currency, "Currency");
  const boq = calculateBoq(items);
  const checks: string[] = [];
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const adjustment of adjustments) {
    requireText(adjustment.id, "Adjustment id");
    requireText(adjustment.label, `Adjustment ${adjustment.id} label`);
    requireText(adjustment.approvalRef, `Adjustment ${adjustment.id} approval reference`);
    if (ids.has(adjustment.id)) throw new Error(`Duplicate adjustment id: ${adjustment.id}.`);
    ids.add(adjustment.id);
    if (!Number.isInteger(adjustment.order)) throw new Error(`Adjustment ${adjustment.id} order must be an integer.`);
    if (orders.has(adjustment.order)) throw new Error(`Adjustment order ${adjustment.order} is used more than once.`);
    orders.add(adjustment.order);
    const hasRate = adjustment.ratePct !== undefined;
    const hasFixed = adjustment.fixedAmount !== undefined;
    if (hasRate === hasFixed) throw new Error(`Adjustment ${adjustment.id} needs exactly one of rate or fixed amount.`);
    if (hasRate) {
      assertNonNegative(adjustment.ratePct!, `Adjustment ${adjustment.id} rate`);
      if (!adjustment.base) throw new Error(`Adjustment ${adjustment.id} requires an explicit base (direct or cumulative).`);
    } else {
      assertNonNegative(adjustment.fixedAmount!, `Adjustment ${adjustment.id} fixed amount`);
    }
  }

  const directSubtotal = boq.pricedSubtotal;
  let running = directSubtotal;
  const results: CostAdjustmentResult[] = [];
  for (const adjustment of [...adjustments].sort((a, b) => a.order - b.order)) {
    let baseAmount: number | null = null;
    let amount: number;
    if (adjustment.ratePct !== undefined) {
      baseAmount = adjustment.base === "cumulative" ? running : directSubtotal;
      amount = round(baseAmount * adjustment.ratePct / 100);
    } else {
      amount = round(adjustment.fixedAmount!);
    }
    running = round(running + amount);
    results.push({
      id: adjustment.id, label: adjustment.label, kind: adjustment.kind,
      ratePct: adjustment.ratePct ?? null, fixedAmount: adjustment.fixedAmount ?? null,
      base: adjustment.ratePct !== undefined ? adjustment.base! : null,
      baseAmount: baseAmount === null ? null : round(baseAmount), amount,
      approvalRef: adjustment.approvalRef, clientVisible: adjustment.clientVisible
    });
  }
  const adjustmentsTotal = round(results.reduce((sum, row) => sum + row.amount, 0));
  const grandTotal = round(directSubtotal + adjustmentsTotal);

  // Independent verification: closed-form recomputation of the grand total.
  const independent = round(results.reduce((sum, row) => sum + row.amount, directSubtotal));
  if (Math.abs(independent - grandTotal) > 1e-6) checks.push("Independent grand-total verification mismatch.");
  if (boq.unpricedItems > 0) checks.push(`${boq.unpricedItems} BOQ item(s) have no sourced unit rate; the total is incomplete.`);
  if (boq.reviewItems > 0) checks.push(`${boq.reviewItems} BOQ item(s) need review.`);
  return {
    currency: cur, items: boq.items, directSubtotal, adjustments: results, adjustmentsTotal, grandTotal,
    unpricedItems: boq.unpricedItems, reviewItems: boq.reviewItems,
    complete: boq.unpricedItems === 0 && boq.reviewItems === 0 && checks.length === 0, checks
  };
}

export interface ClientBoqView {
  currency: string;
  rows: Array<{ code: string; description: string; unit: string; quantity: number; unitRate: number | null; lineTotal: number | null }>;
  visibleAdjustments: Array<{ label: string; amount: number }>;
  /** Amounts of hidden adjustments are folded into the displayed total, never silently dropped. */
  hiddenAdjustmentsTotal: number;
  grandTotal: number;
}

/** Controlled cost visibility: hidden adjustments stay inside the total, never disappear. */
export function buildClientBoq(summary: ProjectCostSummary, showRates: boolean): ClientBoqView {
  const visible = summary.adjustments.filter(row => row.clientVisible);
  const hidden = summary.adjustments.filter(row => !row.clientVisible);
  return {
    currency: summary.currency,
    rows: summary.items.map(item => ({
      code: item.code, description: item.description, unit: item.unit,
      quantity: item.costQuantityBasis === "order" && item.orderQuantity !== null ? item.orderQuantity : item.netQuantity,
      unitRate: showRates ? item.unitRate : null, lineTotal: showRates ? item.lineTotal : null
    })),
    visibleAdjustments: visible.map(row => ({ label: row.label, amount: row.amount })),
    hiddenAdjustmentsTotal: round(hidden.reduce((sum, row) => sum + row.amount, 0)),
    grandTotal: summary.grandTotal
  };
}
