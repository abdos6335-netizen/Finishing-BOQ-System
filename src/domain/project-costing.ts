import { calculateBoqItem, type BoqUnit } from "./boq-engine";
import {
  calculateProjectCost,
  type CostAdjustment,
  type CostAdjustmentKind,
  type ProjectCostSummary
} from "./cost-engine";
import { requireText } from "./numeric";
import type { ProjectRecord } from "./project-store";
import {
  calculateRevisedTotals,
  type RevisedTotals,
  type VariationItem,
  type VariationOrder
} from "./variation-orders";

/**
 * Project-level helpers behind the cost and variation screens. They contain no
 * DOM code: every rule (approval reference, explicit base, draft-only editing)
 * is enforced here by calling the engines, so the screens cannot bypass it.
 */
const KINDS: CostAdjustmentKind[] = ["transport", "engineer-fee", "overhead", "contingency", "profit", "tax", "other"];
const UNITS: BoqUnit[] = ["m", "m2", "m3", "pcs"];

export function adjustmentsOf(project: ProjectRecord): CostAdjustment[] {
  return project.adjustments ?? [];
}

export function variationsOf(project: ProjectRecord): VariationOrder[] {
  return project.variations ?? [];
}

export function nextAdjustmentOrder(list: CostAdjustment[]): number {
  return list.reduce((max, adjustment) => Math.max(max, adjustment.order), 0) + 1;
}

export function nextVariationNumber(list: VariationOrder[]): string {
  const numbers = list.flatMap(vo => {
    const match = /^VO-(\d+)$/.exec(vo.number);
    return match ? [Number(match[1])] : [];
  });
  return `VO-${(numbers.length ? Math.max(...numbers) : 0) + 1}`;
}

export interface AdjustmentFormInput {
  label: string;
  kind: string;
  ratePct: string;
  fixedAmount: string;
  base: string;
  order: string;
  approvalRef: string;
  clientVisible: boolean;
}

/** Builds an adjustment and proves it is valid together with the existing ones. Throws on any rule violation. */
export function buildAdjustment(project: ProjectRecord, input: AdjustmentFormInput, id: string): CostAdjustment {
  const kind = KINDS.find(candidate => candidate === input.kind);
  if (!kind) throw new Error("Choose an adjustment kind.");
  const existing = adjustmentsOf(project);
  const orderText = input.order.trim();
  const rateText = input.ratePct.trim();
  const fixedText = input.fixedAmount.trim();
  const adjustment: CostAdjustment = {
    id,
    label: requireText(input.label, "Adjustment label"),
    kind,
    order: orderText === "" ? nextAdjustmentOrder(existing) : Number(orderText),
    approvalRef: requireText(input.approvalRef, "Approval reference"),
    clientVisible: input.clientVisible
  };
  if (rateText !== "") {
    adjustment.ratePct = Number(rateText);
    if (input.base === "direct" || input.base === "cumulative") adjustment.base = input.base;
  }
  if (fixedText !== "") adjustment.fixedAmount = Number(fixedText);
  calculateProjectCost(project.boqItems, [...existing, adjustment], "check");
  return adjustment;
}

export interface ProjectFinancials {
  cost: ProjectCostSummary;
  revised: RevisedTotals | null;
  /** True when no currency has been entered, so the label shown is only a placeholder. */
  currencyMissing: boolean;
}

export function projectFinancials(project: ProjectRecord): ProjectFinancials {
  const currency = (project.currency ?? "").trim();
  const cost = calculateProjectCost(project.boqItems, adjustmentsOf(project), currency || "—");
  const variations = variationsOf(project);
  return {
    cost,
    revised: variations.length > 0 ? calculateRevisedTotals(cost.grandTotal, variations) : null,
    currencyMissing: currency === ""
  };
}

export interface VariationFormInput {
  number: string;
  title: string;
  reason: string;
  baseRevision: string;
}

export function createVariation(existing: VariationOrder[], input: VariationFormInput, id: string, createdAt: string): VariationOrder {
  const number = requireText(input.number, "Variation number");
  if (existing.some(vo => vo.number === number)) throw new Error(`Variation number ${number} is already used.`);
  return {
    id, number,
    title: requireText(input.title, "Variation title"),
    reason: requireText(input.reason, "Variation reason"),
    baseRevision: requireText(input.baseRevision, "Base revision"),
    status: "draft",
    createdAt,
    items: []
  };
}

export interface VariationItemFormInput {
  direction: string;
  code: string;
  description: string;
  unit: string;
  netQuantity: string;
  sourceRef: string;
  unitRate: string;
  rateSourceRef: string;
}

export function buildVariationItem(input: VariationItemFormInput, id: string): VariationItem {
  if (input.direction !== "addition" && input.direction !== "omission") throw new Error("Choose addition or omission.");
  const unit = UNITS.find(candidate => candidate === input.unit);
  if (!unit) throw new Error("Choose a unit.");
  const item: VariationItem["item"] = {
    id,
    code: requireText(input.code, "Item code"),
    description: requireText(input.description, "Item description"),
    unit,
    netQuantity: Number(input.netQuantity),
    sourceRef: requireText(input.sourceRef, "Quantity source reference")
  };
  const rateText = input.unitRate.trim();
  if (rateText !== "") {
    item.unitRate = Number(rateText);
    item.rateSourceRef = input.rateSourceRef.trim();
    item.costQuantityBasis = "net";
  }
  calculateBoqItem(item);
  return { direction: input.direction, item };
}

function assertDraft(vo: VariationOrder): void {
  if (vo.status !== "draft") throw new Error(`Variation ${vo.number} is ${vo.status}; only a draft can be edited.`);
}

export function addVariationItem(vo: VariationOrder, entry: VariationItem): VariationOrder {
  assertDraft(vo);
  return { ...vo, items: [...vo.items, entry] };
}

export function removeVariationItem(vo: VariationOrder, itemId: string): VariationOrder {
  assertDraft(vo);
  return { ...vo, items: vo.items.filter(entry => entry.item.id !== itemId) };
}

/** Approved and submitted variations are part of the commercial record and cannot be deleted. */
export function canDeleteVariation(vo: VariationOrder): boolean {
  return vo.status === "draft" || vo.status === "rejected";
}
