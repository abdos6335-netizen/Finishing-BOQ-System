import type { BoqUnit } from "./boq-engine";
import { assertNonNegative, assertPositive, requireText, round } from "./numeric";

/**
 * Duration from quantity and a sourced productivity rate. There is no built-in
 * productivity table: without a rate the duration is "unestimated".
 */
export type RateBasis = "per-crew-day" | "per-worker-day";

export interface ProductivityRate {
  id: string;
  unit: BoqUnit;
  basis: RateBasis;
  /** Quantity produced per crew-day or per worker-day (see basis). */
  value: number;
  sourceRef: string;
  sourceDate: string;
  location: string;
  confidence?: number;
}

export interface ScheduleActivity {
  id: string;
  name: string;
  quantity: number;
  unit: BoqUnit;
  quantitySourceRef: string;
  rateId?: string;
  crewSize?: number;
  predecessors: Array<{ id: string; type: "FS" | "SS" | "FF"; lagDays: number }>;
}

export interface DurationResult {
  activityId: string;
  baseDurationDays: number | null;
  rateId: string | null;
  basis: RateBasis | null;
  status: "estimated" | "unestimated" | "invalid";
  checks: string[];
}

export type RoundingPolicy = "none" | "ceil";

export function validateRate(rate: ProductivityRate): void {
  requireText(rate.id, "Rate id");
  requireText(rate.sourceRef, `Rate ${rate.id} source reference`);
  requireText(rate.sourceDate, `Rate ${rate.id} source date`);
  requireText(rate.location, `Rate ${rate.id} location`);
  assertPositive(rate.value, `Rate ${rate.id} value`);
  if (rate.confidence !== undefined && (!Number.isFinite(rate.confidence) || rate.confidence < 0 || rate.confidence > 1)) {
    throw new Error(`Rate ${rate.id} confidence must be between 0 and 1.`);
  }
}

export function calculateDuration(activity: ScheduleActivity, rates: ProductivityRate[], rounding: RoundingPolicy): DurationResult {
  const checks: string[] = [];
  requireText(activity.id, "Activity id");
  requireText(activity.name, `Activity ${activity.id} name`);
  requireText(activity.quantitySourceRef, `Activity ${activity.id} quantity source`);
  assertNonNegative(activity.quantity, `Activity ${activity.id} quantity`);

  if (!activity.rateId) {
    return { activityId: activity.id, baseDurationDays: null, rateId: null, basis: null, status: "unestimated", checks: ["No productivity rate selected."] };
  }
  const rate = rates.find(item => item.id === activity.rateId);
  if (!rate) {
    return { activityId: activity.id, baseDurationDays: null, rateId: activity.rateId, basis: null, status: "invalid", checks: [`Rate ${activity.rateId} does not exist.`] };
  }
  validateRate(rate);
  if (rate.unit !== activity.unit) {
    return { activityId: activity.id, baseDurationDays: null, rateId: rate.id, basis: rate.basis, status: "invalid", checks: [`Unit mismatch: activity ${activity.unit} vs rate ${rate.unit}.`] };
  }

  let days: number;
  if (rate.basis === "per-crew-day") {
    // Crew size is already inside the rate: never multiply by it again.
    days = activity.quantity / rate.value;
    if (activity.crewSize !== undefined) checks.push("Crew size is ignored for a per-crew-day rate.");
  } else {
    if (activity.crewSize === undefined) {
      return { activityId: activity.id, baseDurationDays: null, rateId: rate.id, basis: rate.basis, status: "invalid", checks: ["A per-worker-day rate requires an explicit crew size."] };
    }
    assertPositive(activity.crewSize, `Activity ${activity.id} crew size`);
    days = activity.quantity / (rate.value * activity.crewSize);
  }
  const value = rounding === "ceil" ? Math.ceil(round(days, 8)) : round(days);
  return { activityId: activity.id, baseDurationDays: value, rateId: rate.id, basis: rate.basis, status: "estimated", checks };
}
