import { calculateDuration, type ProductivityRate, type RoundingPolicy, type ScheduleActivity } from "./productivity-engine";
import { round } from "./numeric";

/**
 * Critical Path Method on working-day durations with FS/SS/FF relationships and
 * lags. Resource levelling is intentionally not modelled; float and criticality
 * therefore describe logic only.
 */
export interface CpmActivity {
  id: string;
  name: string;
  durationDays: number;
  predecessors: Array<{ id: string; type: "FS" | "SS" | "FF"; lagDays: number }>;
}

export interface CpmRow {
  id: string;
  name: string;
  durationDays: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  critical: boolean;
}

export interface CpmResult {
  rows: CpmRow[];
  projectDurationDays: number;
  criticalActivityIds: string[];
}

function topologicalOrder(activities: CpmActivity[]): string[] {
  const ids = new Set(activities.map(a => a.id));
  if (ids.size !== activities.length) throw new Error("Activity ids must be unique.");
  const indegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  for (const a of activities) { indegree.set(a.id, 0); successors.set(a.id, []); }
  for (const a of activities) {
    for (const p of a.predecessors) {
      if (!ids.has(p.id)) throw new Error(`Activity ${a.id} references unknown predecessor ${p.id}.`);
      if (p.id === a.id) throw new Error(`Activity ${a.id} cannot depend on itself.`);
      indegree.set(a.id, (indegree.get(a.id) ?? 0) + 1);
      successors.get(p.id)!.push(a.id);
    }
  }
  const queue = activities.filter(a => indegree.get(a.id) === 0).map(a => a.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of successors.get(id)!) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== activities.length) {
    const cyclic = activities.filter(a => !order.includes(a.id)).map(a => a.id);
    throw new Error(`Dependency cycle detected among: ${cyclic.join(", ")}.`);
  }
  return order;
}

export function calculateCriticalPath(activities: CpmActivity[]): CpmResult {
  for (const a of activities) {
    if (!Number.isFinite(a.durationDays) || a.durationDays < 0) throw new Error(`Activity ${a.id} duration must be finite and non-negative.`);
    for (const p of a.predecessors) {
      if (!["FS", "SS", "FF"].includes(p.type)) throw new Error(`Activity ${a.id} has unsupported relationship ${String(p.type)}.`);
      if (!Number.isFinite(p.lagDays)) throw new Error(`Activity ${a.id} has a non-finite lag.`);
    }
  }
  const order = topologicalOrder(activities);
  const byId = new Map(activities.map(a => [a.id, a]));
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of order) {
    const a = byId.get(id)!;
    let start = 0;
    for (const p of a.predecessors) {
      const pre = byId.get(p.id)!;
      const constraint =
        p.type === "FS" ? ef.get(p.id)! + p.lagDays :
        p.type === "SS" ? es.get(p.id)! + p.lagDays :
        ef.get(p.id)! + p.lagDays - a.durationDays;
      void pre;
      start = Math.max(start, constraint);
    }
    es.set(id, start);
    ef.set(id, start + a.durationDays);
  }
  const projectDurationDays = round(Math.max(0, ...[...ef.values()]));

  const successors = new Map<string, Array<{ id: string; type: "FS" | "SS" | "FF"; lagDays: number }>>();
  for (const a of activities) successors.set(a.id, []);
  for (const a of activities) for (const p of a.predecessors) successors.get(p.id)!.push({ id: a.id, type: p.type, lagDays: p.lagDays });

  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const a = byId.get(id)!;
    let finish = projectDurationDays;
    for (const s of successors.get(id)!) {
      const constraint =
        s.type === "FS" ? ls.get(s.id)! - s.lagDays :
        s.type === "SS" ? ls.get(s.id)! - s.lagDays + a.durationDays :
        lf.get(s.id)! - s.lagDays;
      finish = Math.min(finish, constraint);
    }
    lf.set(id, finish);
    ls.set(id, finish - a.durationDays);
  }

  const rows: CpmRow[] = order.map(id => {
    const a = byId.get(id)!;
    const totalFloat = round(ls.get(id)! - es.get(id)!);
    return {
      id, name: a.name, durationDays: a.durationDays,
      earlyStart: round(es.get(id)!), earlyFinish: round(ef.get(id)!),
      lateStart: round(ls.get(id)!), lateFinish: round(lf.get(id)!),
      totalFloat, critical: Math.abs(totalFloat) < 1e-6
    };
  });
  return { rows, projectDurationDays, criticalActivityIds: rows.filter(row => row.critical).map(row => row.id) };
}

export interface ScheduleEstimate {
  status: "complete" | "incomplete";
  unestimatedActivityIds: string[];
  checks: string[];
  cpm: CpmResult | null;
}

/** Builds a CPM schedule from quantities and sourced rates; refuses to guess missing durations. */
export function estimateSchedule(activities: ScheduleActivity[], rates: ProductivityRate[], rounding: RoundingPolicy): ScheduleEstimate {
  const durations = activities.map(activity => calculateDuration(activity, rates, rounding));
  const unestimated = durations.filter(d => d.status !== "estimated");
  const checks = durations.flatMap(d => d.checks.map(check => `${d.activityId}: ${check}`));
  if (unestimated.length > 0) {
    return { status: "incomplete", unestimatedActivityIds: unestimated.map(d => d.activityId), checks, cpm: null };
  }
  const cpm = calculateCriticalPath(activities.map((activity, index) => ({
    id: activity.id, name: activity.name, durationDays: durations[index].baseDurationDays!, predecessors: activity.predecessors
  })));
  return { status: "complete", unestimatedActivityIds: [], checks, cpm };
}

export interface WorkCalendar {
  startDate: string; // ISO yyyy-mm-dd, explicit project input
  workingWeekdays: number[]; // 0=Sunday … 6=Saturday, explicit project input
  holidays: string[];
}

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid ISO date: ${value}.`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid calendar date: ${value}.`);
  return date;
}

/** Maps a working-day offset (0 = first working day) to a calendar date. */
export function workingDayToDate(calendar: WorkCalendar, workingDayOffset: number): string {
  if (!Number.isInteger(workingDayOffset) || workingDayOffset < 0) throw new Error("Working-day offset must be a non-negative integer.");
  if (calendar.workingWeekdays.length === 0 || calendar.workingWeekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("Working weekdays must be a non-empty list of integers from 0 to 6.");
  }
  const holidays = new Set(calendar.holidays.map(h => { parseIsoDate(h); return h; }));
  const date = parseIsoDate(calendar.startDate);
  const isWorking = (d: Date): boolean => calendar.workingWeekdays.includes(d.getUTCDay()) && !holidays.has(d.toISOString().slice(0, 10));
  let remaining = workingDayOffset;
  let guard = 0;
  while (!isWorking(date)) { date.setUTCDate(date.getUTCDate() + 1); if (++guard > 3660) throw new Error("No working day found in the calendar."); }
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (isWorking(date)) remaining -= 1;
    if (++guard > 36600) throw new Error("Calendar range exceeded.");
  }
  return date.toISOString().slice(0, 10);
}
