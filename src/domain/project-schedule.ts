import { estimateSchedule, workingDayToDate, type ScheduleEstimate, type WorkCalendar } from "./critical-path";
import { validateRate, type ProductivityRate, type RateBasis, type RoundingPolicy, type ScheduleActivity } from "./productivity-engine";
import { requireText } from "./numeric";
import type { ProjectRecord } from "./project-store";

/**
 * Project-level helpers behind the schedule screen. No DOM code. There is no
 * built-in productivity table: every rate is entered with a source, date and location.
 */
export interface ProjectSchedule {
  rates: ProductivityRate[];
  activities: ScheduleActivity[];
  rounding: RoundingPolicy;
  calendar?: WorkCalendar;
}

const UNITS = ["m", "m2", "m3", "pcs"] as const;
const BASES: RateBasis[] = ["per-crew-day", "per-worker-day"];
const REL = ["FS", "SS", "FF"] as const;

export const emptySchedule = (): ProjectSchedule => ({ rates: [], activities: [], rounding: "ceil" });
export const scheduleOf = (project: ProjectRecord): ProjectSchedule => project.schedule ?? emptySchedule();

export interface RateFormInput { unit: string; basis: string; value: string; sourceRef: string; sourceDate: string; location: string; confidence: string; }

export function addRate(schedule: ProjectSchedule, input: RateFormInput, id: string): ProjectSchedule {
  const unit = UNITS.find(candidate => candidate === input.unit);
  const basis = BASES.find(candidate => candidate === input.basis);
  if (!unit) throw new Error("Choose a unit.");
  if (!basis) throw new Error("Choose a rate basis.");
  const rate: ProductivityRate = {
    id, unit, basis, value: Number(input.value), sourceRef: input.sourceRef.trim(), sourceDate: input.sourceDate.trim(), location: input.location.trim()
  };
  if (input.confidence.trim() !== "") rate.confidence = Number(input.confidence);
  validateRate(rate);
  return { ...schedule, rates: [...schedule.rates, rate] };
}

export function removeRate(schedule: ProjectSchedule, rateId: string): ProjectSchedule {
  if (schedule.activities.some(activity => activity.rateId === rateId)) throw new Error("This rate is used by an activity; change the activity first.");
  return { ...schedule, rates: schedule.rates.filter(rate => rate.id !== rateId) };
}

export interface ActivityFormInput {
  name: string; boqItemId: string; rateId: string; crewSize: string; predecessorIds: string[]; relationship: string; lagDays: string;
}

/** Quantity and unit always come from a BOQ line, so the schedule cannot drift from the takeoff. */
export function addActivity(project: ProjectRecord, input: ActivityFormInput, id: string): ProjectSchedule {
  const schedule = scheduleOf(project);
  const item = project.boqItems.find(candidate => candidate.id === input.boqItemId);
  if (!item) throw new Error("Choose a BOQ item for the activity quantity.");
  const relationship = REL.find(candidate => candidate === input.relationship);
  if (!relationship) throw new Error("Choose a relationship type.");
  const lagDays = input.lagDays.trim() === "" ? 0 : Number(input.lagDays);
  if (!Number.isFinite(lagDays)) throw new Error("Lag must be a number.");
  for (const predecessorId of input.predecessorIds) {
    if (!schedule.activities.some(activity => activity.id === predecessorId)) throw new Error(`Unknown predecessor ${predecessorId}.`);
  }
  const activity: ScheduleActivity = {
    id, name: requireText(input.name, "Activity name"), quantity: item.netQuantity, unit: item.unit,
    quantitySourceRef: `boq:${item.code}:${item.sourceRef}`,
    predecessors: input.predecessorIds.map(predecessorId => ({ id: predecessorId, type: relationship, lagDays }))
  };
  if (input.rateId) activity.rateId = input.rateId;
  if (input.crewSize.trim() !== "") activity.crewSize = Number(input.crewSize);
  return { ...schedule, activities: [...schedule.activities, activity] };
}

export function removeActivity(schedule: ProjectSchedule, activityId: string): ProjectSchedule {
  if (schedule.activities.some(activity => activity.predecessors.some(p => p.id === activityId))) {
    throw new Error("Another activity depends on this one; remove the dependency first.");
  }
  return { ...schedule, activities: schedule.activities.filter(activity => activity.id !== activityId) };
}

export interface CalendarFormInput { startDate: string; weekdays: number[]; holidays: string; }

export function setCalendar(schedule: ProjectSchedule, input: CalendarFormInput): ProjectSchedule {
  const holidays = input.holidays.split(/[\s,;،]+/).filter(part => part !== "");
  const calendar: WorkCalendar = { startDate: input.startDate.trim(), workingWeekdays: [...input.weekdays].sort(), holidays };
  workingDayToDate(calendar, 0);
  return { ...schedule, calendar };
}

export function setRounding(schedule: ProjectSchedule, rounding: string): ProjectSchedule {
  if (rounding !== "none" && rounding !== "ceil") throw new Error("Unknown rounding policy.");
  return { ...schedule, rounding };
}

export interface ScheduleDateRange { start: string; finish: string; }
export interface ScheduleView { estimate: ScheduleEstimate; dates: Map<string, ScheduleDateRange>; projectFinish: string | null; }

export function scheduleView(project: ProjectRecord): ScheduleView {
  const schedule = scheduleOf(project);
  const estimate = estimateSchedule(schedule.activities, schedule.rates, schedule.rounding);
  const dates = new Map<string, ScheduleDateRange>();
  let projectFinish: string | null = null;
  if (estimate.cpm && schedule.calendar) {
    const calendar = schedule.calendar;
    for (const row of estimate.cpm.rows) {
      const start = Math.floor(row.earlyStart);
      const finish = Math.max(start, Math.ceil(row.earlyFinish) - 1);
      dates.set(row.id, { start: workingDayToDate(calendar, start), finish: workingDayToDate(calendar, finish) });
    }
    if (estimate.cpm.rows.length > 0) projectFinish = workingDayToDate(calendar, Math.max(0, Math.ceil(estimate.cpm.projectDurationDays) - 1));
  }
  return { estimate, dates, projectFinish };
}
