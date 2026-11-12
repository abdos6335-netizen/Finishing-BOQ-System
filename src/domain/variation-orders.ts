import { calculateBoqItem, type BoqItemInput, type BoqItemResult } from "./boq-engine";
import { requireText, round } from "./numeric";

/**
 * Variation orders (additional/omitted works) linked to the base BOQ revision.
 * Only approved variations affect the revised total, and an approved variation
 * is immutable.
 */
export type VariationStatus = "draft" | "submitted" | "approved" | "rejected";
export type VariationDirection = "addition" | "omission";

export interface VariationItem { direction: VariationDirection; item: BoqItemInput; }

export interface VariationOrder {
  id: string;
  number: string;
  title: string;
  reason: string;
  baseRevision: string;
  status: VariationStatus;
  approvalRef?: string;
  createdAt: string;
  items: VariationItem[];
}

export interface VariationResult {
  id: string;
  number: string;
  status: VariationStatus;
  baseRevision: string;
  lines: Array<{ direction: VariationDirection; result: BoqItemResult }>;
  total: number | null;
  unpricedItems: number;
  checks: string[];
}

const ALLOWED: Record<VariationStatus, VariationStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected", "draft"],
  approved: [],
  rejected: ["draft"]
};

export function transitionVariation(vo: VariationOrder, next: VariationStatus, approvalRef?: string): VariationOrder {
  if (!ALLOWED[vo.status].includes(next)) throw new Error(`Variation ${vo.number} cannot move from ${vo.status} to ${next}.`);
  if (next === "approved") requireText(approvalRef, "Variation approval reference");
  return { ...vo, status: next, approvalRef: next === "approved" ? approvalRef!.trim() : undefined };
}

export function calculateVariation(vo: VariationOrder): VariationResult {
  requireText(vo.id, "Variation id");
  requireText(vo.number, "Variation number");
  requireText(vo.title, "Variation title");
  requireText(vo.baseRevision, "Variation base revision");
  const checks: string[] = [];
  if (vo.status === "approved" && !vo.approvalRef?.trim()) checks.push("Approved variation has no approval reference.");
  if (vo.items.length === 0) checks.push("Variation has no items.");
  const lines = vo.items.map(entry => ({ direction: entry.direction, result: calculateBoqItem(entry.item) }));
  const unpricedItems = lines.filter(line => line.result.lineTotal === null).length;
  if (unpricedItems > 0) checks.push(`${unpricedItems} variation item(s) are unpriced.`);
  const total = unpricedItems === lines.length && lines.length > 0 ? null :
    round(lines.reduce((sum, line) => sum + (line.direction === "omission" ? -1 : 1) * (line.result.lineTotal ?? 0), 0));
  return { id: vo.id, number: vo.number, status: vo.status, baseRevision: vo.baseRevision, lines, total, unpricedItems, checks };
}

export interface RevisedTotals {
  baseTotal: number;
  approvedVariationsTotal: number;
  revisedTotal: number;
  pendingVariationsTotal: number;
  incompleteVariationNumbers: string[];
}

export function calculateRevisedTotals(baseTotal: number, variations: VariationOrder[]): RevisedTotals {
  const numbers = new Set<string>();
  let approved = 0;
  let pending = 0;
  const incomplete: string[] = [];
  for (const vo of variations) {
    if (numbers.has(vo.number)) throw new Error(`Duplicate variation number: ${vo.number}.`);
    numbers.add(vo.number);
    const result = calculateVariation(vo);
    if (result.unpricedItems > 0) incomplete.push(vo.number);
    if (vo.status === "approved") approved += result.total ?? 0;
    else if (vo.status === "submitted") pending += result.total ?? 0;
  }
  return {
    baseTotal: round(baseTotal), approvedVariationsTotal: round(approved),
    revisedTotal: round(baseTotal + approved), pendingVariationsTotal: round(pending),
    incompleteVariationNumbers: incomplete
  };
}
