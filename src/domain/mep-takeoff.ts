import type { BoqItemInput } from "./boq-engine";
import { assertNonNegative, assertPositive, requireText, round } from "./numeric";

/**
 * MEP takeoff from approved drawings/schedules only.
 * There is intentionally no function that derives points or circuits from room
 * area. Circuits come only from a circuit schedule; cable lengths come only from
 * documented route segments plus explicitly approved allowances.
 */
export type MepDiscipline = "electrical" | "low-current" | "plumbing" | "hvac";

export interface MepPoint {
  id: string;
  discipline: MepDiscipline;
  deviceType: string;
  count: number;
  roomId?: string;
  drawingRef: string;
  sheet?: string;
  revision?: string;
  reviewed: boolean;
}

export interface CircuitScheduleEntry {
  id: string;
  panelRef: string;
  circuitRef: string;
  scheduleRef: string;
  pointIds: string[];
}

export interface RouteSegment { id: string; lengthM: number; note?: string; }
export interface RouteAllowance { description: string; lengthM: number; approvalRef: string; }

export interface CableRun {
  id: string;
  discipline: MepDiscipline;
  spec: string;
  cores: number;
  parallelRuns: number;
  routeRef: string;
  segments: RouteSegment[];
  allowances: RouteAllowance[];
}

export interface MepTakeoffInput {
  points: MepPoint[];
  circuits: CircuitScheduleEntry[];
  cableRuns: CableRun[];
}

export interface MepPointTotal {
  discipline: MepDiscipline;
  deviceType: string;
  totalCount: number;
  reviewedCount: number;
  status: "verified" | "needs-review";
}

export interface CableRunResult {
  id: string;
  spec: string;
  routeLengthM: number;
  allowanceLengthM: number;
  conductorLengthM: number;
  routeRef: string;
  status: "verified" | "needs-review";
  checks: string[];
}

export interface MepTakeoffResult {
  pointTotals: MepPointTotal[];
  circuitCount: number | null;
  circuitStatus: "from-schedule" | "needs-review";
  unscheduledPointIds: string[];
  cableRuns: CableRunResult[];
  checks: string[];
}

export function calculateMepTakeoff(input: MepTakeoffInput): MepTakeoffResult {
  const checks: string[] = [];
  const pointIds = new Set<string>();
  const totals = new Map<string, MepPointTotal>();

  for (const point of input.points) {
    requireText(point.id, "MEP point id");
    requireText(point.deviceType, `MEP point ${point.id} device type`);
    requireText(point.drawingRef, `MEP point ${point.id} drawing reference`);
    if (!Number.isInteger(point.count) || point.count < 0) throw new Error(`MEP point ${point.id} count must be a non-negative integer.`);
    if (pointIds.has(point.id)) checks.push(`Duplicate MEP point id: ${point.id}.`);
    pointIds.add(point.id);
    const key = `${point.discipline}|${point.deviceType.trim().toLowerCase()}`;
    const entry = totals.get(key) ?? { discipline: point.discipline, deviceType: point.deviceType.trim(), totalCount: 0, reviewedCount: 0, status: "verified" as const };
    entry.totalCount += point.count;
    if (point.reviewed) entry.reviewedCount += point.count;
    totals.set(key, entry);
  }
  const pointTotals = [...totals.values()].map(entry => ({
    ...entry,
    status: entry.reviewedCount === entry.totalCount ? ("verified" as const) : ("needs-review" as const)
  })).sort((a, b) => `${a.discipline}${a.deviceType}`.localeCompare(`${b.discipline}${b.deviceType}`));

  const circuitKeys = new Set<string>();
  const scheduled = new Set<string>();
  for (const circuit of input.circuits) {
    requireText(circuit.panelRef, `Circuit ${circuit.id} panel reference`);
    requireText(circuit.circuitRef, `Circuit ${circuit.id} circuit reference`);
    requireText(circuit.scheduleRef, `Circuit ${circuit.id} schedule reference`);
    const key = `${circuit.panelRef.trim()}|${circuit.circuitRef.trim()}`;
    if (circuitKeys.has(key)) checks.push(`Duplicate circuit in schedule: ${circuit.panelRef}/${circuit.circuitRef}.`);
    circuitKeys.add(key);
    for (const pointId of circuit.pointIds) {
      if (!pointIds.has(pointId)) checks.push(`Circuit ${circuit.panelRef}/${circuit.circuitRef} references unknown point ${pointId}.`);
      scheduled.add(pointId);
    }
  }
  const electricalPointIds = input.points.filter(point => point.discipline === "electrical" && point.count > 0).map(point => point.id);
  const unscheduledPointIds = electricalPointIds.filter(id => !scheduled.has(id));
  const hasSchedule = input.circuits.length > 0;
  if (!hasSchedule && electricalPointIds.length > 0) checks.push("No approved circuit schedule: circuit quantity needs review (never inferred from area).");
  if (hasSchedule && unscheduledPointIds.length > 0) checks.push("Some electrical points are not assigned to any scheduled circuit.");

  const cableRuns = input.cableRuns.map((run): CableRunResult => {
    const runChecks: string[] = [];
    requireText(run.spec, `Cable run ${run.id} specification`);
    requireText(run.routeRef, `Cable run ${run.id} route reference`);
    if (!Number.isInteger(run.cores) || run.cores < 1) throw new Error(`Cable run ${run.id} cores must be a positive integer.`);
    if (!Number.isInteger(run.parallelRuns) || run.parallelRuns < 1) throw new Error(`Cable run ${run.id} parallel runs must be a positive integer.`);
    if (run.segments.length === 0) runChecks.push("No route segments recorded.");
    let routeLengthM = 0;
    for (const segment of run.segments) { assertPositive(segment.lengthM, `Cable run ${run.id} segment ${segment.id} length`); routeLengthM += segment.lengthM; }
    let allowanceLengthM = 0;
    for (const allowance of run.allowances) {
      assertNonNegative(allowance.lengthM, `Cable run ${run.id} allowance length`);
      requireText(allowance.approvalRef, `Cable run ${run.id} allowance approval reference`);
      allowanceLengthM += allowance.lengthM;
    }
    const route = round(routeLengthM + allowanceLengthM);
    return {
      id: run.id, spec: run.spec, routeLengthM: round(routeLengthM), allowanceLengthM: round(allowanceLengthM),
      conductorLengthM: round(route * run.cores * run.parallelRuns), routeRef: run.routeRef,
      status: runChecks.length ? "needs-review" : "verified", checks: runChecks
    };
  });

  return {
    pointTotals,
    circuitCount: hasSchedule ? circuitKeys.size : null,
    circuitStatus: hasSchedule ? "from-schedule" : "needs-review",
    unscheduledPointIds, cableRuns, checks
  };
}

/** Converts a takeoff into BOQ lines. Unreviewed counts are excluded and reported by the caller. */
export function mepToBoqItems(input: MepTakeoffInput, createId: () => string): BoqItemInput[] {
  const result = calculateMepTakeoff(input);
  const items: BoqItemInput[] = [];
  for (const total of result.pointTotals) {
    if (total.status !== "verified" || total.totalCount === 0) continue;
    items.push({
      id: createId(), code: `MEP-${total.discipline.toUpperCase().slice(0, 4)}-${total.deviceType.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`,
      description: `${total.deviceType} (${total.discipline})`, unit: "pcs", netQuantity: total.totalCount,
      sourceRef: `mep:points:${total.discipline}:${encodeURIComponent(total.deviceType)}`
    });
  }
  for (const run of result.cableRuns) {
    if (run.status !== "verified") continue;
    items.push({
      id: createId(), code: `MEP-CBL-${run.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`,
      description: `${run.spec} — conductor length`, unit: "m", netQuantity: run.conductorLengthM,
      sourceRef: `mep:cable:${encodeURIComponent(run.id)}:${encodeURIComponent(run.routeRef)}`
    });
  }
  return items;
}
