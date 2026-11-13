import { calculateCriticalPath, type CpmActivity, type CpmResult } from "./critical-path";
import { requireText, assertNonNegative } from "./numeric";
export interface SourcedScheduleActivity extends CpmActivity { durationSourceRef: string; }
export interface SchedulePlan { status: "complete" | "incomplete"; cpm: CpmResult | null; checks: string[]; }
/** Validate every duration against an explicit source before calculating CPM. */
export function buildSchedulePlan(activities: SourcedScheduleActivity[]): SchedulePlan {
 const ids=new Set<string>();
 for(const a of activities){requireText(a.id,"Activity id");requireText(a.name,`Activity ${a.id} name`);requireText(a.durationSourceRef,`Activity ${a.id} duration source`);assertNonNegative(a.durationDays,`Activity ${a.id} duration`);if(ids.has(a.id))throw new Error(`Duplicate activity id: ${a.id}.`);ids.add(a.id);for(const p of a.predecessors)if(!Number.isFinite(p.lagDays))throw new Error(`Activity ${a.id} has an invalid lag.`);}
 if(!activities.length)return {status:"incomplete",cpm:null,checks:["Add at least one sourced activity."]};
 return {status:"complete",cpm:calculateCriticalPath(activities),checks:[]};
}
