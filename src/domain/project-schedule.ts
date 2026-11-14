import { calculateCriticalPath, workingDayToDate, type CpmActivity, type CpmResult, type WorkCalendar } from "./critical-path";
import { calculateDuration, validateRate, type ProductivityRate, type RateBasis, type RoundingPolicy, type ScheduleActivity } from "./productivity-engine";
import { assertNonNegative, requireText } from "./numeric";
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
    if (!allActivityIds(project).has(predecessorId)) throw new Error(`Unknown predecessor ${predecessorId}.`);
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

/** Removes an activity of either kind. Refuses while another activity still depends on it. */
export function removeAnyActivity(project: ProjectRecord, activityId: string): { schedule: ProjectSchedule; scheduleActivities: SourcedScheduleActivity[] } {
  const schedule = scheduleOf(project);
  const manual = project.scheduleActivities ?? [];
  const dependent = [...schedule.activities, ...manual].some(activity => activity.id !== activityId && activity.predecessors.some(p => p.id === activityId));
  if (dependent) throw new Error("Another activity depends on this one; remove the dependency first.");
  return {
    schedule: { ...schedule, activities: schedule.activities.filter(activity => activity.id !== activityId) },
    scheduleActivities: manual.filter(activity => activity.id !== activityId)
  };
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

export interface ManualActivityFormInput {
  name: string; durationDays: string; durationSourceRef: string; predecessorIds: string[]; relationship: string; lagDays: string;
}

/** An activity whose duration comes from an approved programme or other explicit source rather than a productivity rate. */
export function addManualActivity(project: ProjectRecord, input: ManualActivityFormInput, id: string): SourcedScheduleActivity[] {
  const relationship = REL.find(candidate => candidate === input.relationship);
  if (!relationship) throw new Error("Choose a relationship type.");
  const lagDays = input.lagDays.trim() === "" ? 0 : Number(input.lagDays);
  const known = allActivityIds(project);
  for (const predecessorId of input.predecessorIds) if (!known.has(predecessorId)) throw new Error(`Unknown predecessor ${predecessorId}.`);
  const activity: SourcedScheduleActivity = {
    id, name: requireText(input.name, "Activity name"), durationDays: Number(input.durationDays),
    durationSourceRef: input.durationSourceRef.trim(),
    predecessors: input.predecessorIds.map(predecessorId => ({ id: predecessorId, type: relationship, lagDays }))
  };
  requireText(activity.durationSourceRef, "Duration source");
  assertNonNegative(activity.durationDays, "Duration");
  const next = [...(project.scheduleActivities ?? []), activity];
  scheduleView({ ...project, scheduleActivities: next }); // throws on cycles, unknown predecessors or invalid values
  return next;
}

export interface SourcedScheduleActivity extends CpmActivity { durationSourceRef: string; }
export interface SchedulePlan { status: "complete" | "incomplete"; cpm: CpmResult | null; checks: string[]; }

/** Validates every duration against an explicit source before calculating CPM. */
export function buildSchedulePlan(activities: SourcedScheduleActivity[]): SchedulePlan {
  const ids = new Set<string>();
  for (const a of activities) {
    requireText(a.id, "Activity id"); requireText(a.name, `Activity ${a.id} name`);
    requireText(a.durationSourceRef, `Activity ${a.id} duration source`);
    assertNonNegative(a.durationDays, `Activity ${a.id} duration`);
    if (ids.has(a.id)) throw new Error(`Duplicate activity id: ${a.id}.`);
    ids.add(a.id);
    for (const p of a.predecessors) if (!Number.isFinite(p.lagDays)) throw new Error(`Activity ${a.id} has an invalid lag.`);
  }
  if (!activities.length) return { status: "incomplete", cpm: null, checks: ["Add at least one sourced activity."] };
  return { status: "complete", cpm: calculateCriticalPath(activities), checks: [] };
}

function allActivityIds(project: ProjectRecord): Set<string> {
  return new Set([...scheduleOf(project).activities.map(a => a.id), ...(project.scheduleActivities ?? []).map(a => a.id)]);
}

export interface ScheduleDateRange { start: string; finish: string; }
export interface ScheduleRowInfo { id: string; name: string; kind: "rate" | "manual"; detail: string; }
export interface ScheduleView {
  status: "complete" | "incomplete";
  cpm: CpmResult | null;
  checks: string[];
  rows: ScheduleRowInfo[];
  dates: Map<string, ScheduleDateRange>;
  projectFinish: string | null;
}

/** One critical-path calculation over rate-based and source-based activities together. Nothing is guessed. */
export function scheduleView(project: ProjectRecord): ScheduleView {
  const schedule = scheduleOf(project);
  const manual = project.scheduleActivities ?? [];
  const rows: ScheduleRowInfo[] = [
    ...schedule.activities.map(a => ({ id: a.id, name: a.name, kind: "rate" as const, detail: `${a.quantity} ${a.unit} · ${a.quantitySourceRef}` })),
    ...manual.map(a => ({ id: a.id, name: a.name, kind: "manual" as const, detail: a.durationSourceRef }))
  ];
  const checks: string[] = [];
  const cpmInput: CpmActivity[] = [];
  let incomplete = false;
  for (const activity of schedule.activities) {
    const duration = calculateDuration(activity, schedule.rates, schedule.rounding);
    checks.push(...duration.checks.map(check => `${activity.name}: ${check}`));
    if (duration.status !== "estimated" || duration.baseDurationDays === null) { incomplete = true; continue; }
    cpmInput.push({ id: activity.id, name: activity.name, durationDays: duration.baseDurationDays, predecessors: activity.predecessors });
  }
  const dates = new Map<string, ScheduleDateRange>();
  if (rows.length === 0) return { status: "incomplete", cpm: null, checks: ["Add at least one sourced activity."], rows, dates, projectFinish: null };
  for (const activity of manual) {
    if (!activity.durationSourceRef.trim()) throw new Error(`Activity ${activity.id} needs a duration source.`);
    cpmInput.push({ id: activity.id, name: activity.name, durationDays: activity.durationDays, predecessors: activity.predecessors });
  }
  if (incomplete) return { status: "incomplete", cpm: null, checks, rows, dates, projectFinish: null };
  const cpm = calculateCriticalPath(cpmInput);
  let projectFinish: string | null = null;
  if (schedule.calendar) {
    const calendar = schedule.calendar;
    for (const row of cpm.rows) {
      const start = Math.floor(row.earlyStart);
      const finish = Math.max(start, Math.ceil(row.earlyFinish) - 1);
      dates.set(row.id, { start: workingDayToDate(calendar, start), finish: workingDayToDate(calendar, finish) });
    }
    projectFinish = workingDayToDate(calendar, Math.max(0, Math.ceil(cpm.projectDurationDays) - 1));
  }
  return { status: "complete", cpm, checks, rows, dates, projectFinish };
}
