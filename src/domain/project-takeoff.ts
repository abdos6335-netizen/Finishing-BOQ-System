import type { BoqItemInput } from "./boq-engine";
import {
  applyAssembly, validateAssembly,
  type AssemblyApplyResult, type AssemblyBasis, type AssemblyComponent, type AssemblyDefinition
} from "./finishing-assemblies";
import {
  calculateMepTakeoff, mepToBoqItems,
  type CableRun, type CircuitScheduleEntry, type MepDiscipline, type MepPoint, type MepTakeoffInput, type MepTakeoffResult
} from "./mep-takeoff";
import { requireText } from "./numeric";
import type { ProjectRecord } from "./project-store";

/**
 * Project-level helpers behind the assembly and MEP screens. No DOM code: all
 * rules (explicit ratios, rule references, approved drawings only) are enforced
 * by the engines, so the screens cannot bypass them.
 */
const BASES: AssemblyBasis[] = ["floor-area", "ceiling-area", "wall-net-area", "wall-gross-area", "perimeter"];
const UNITS = ["m", "m2", "m3", "pcs"] as const;
const DISCIPLINES: MepDiscipline[] = ["electrical", "low-current", "plumbing", "hvac"];

export const emptyMep = (): MepTakeoffInput => ({ points: [], circuits: [], cableRuns: [] });
export const assembliesOf = (project: ProjectRecord): AssemblyDefinition[] => project.assemblies ?? [];
export const mepOf = (project: ProjectRecord): MepTakeoffInput => project.mep ?? emptyMep();

/* ---------------- Assemblies ---------------- */

export function createAssembly(existing: AssemblyDefinition[], name: string, id: string): AssemblyDefinition {
  const clean = requireText(name, "Assembly name");
  if (existing.some(def => def.name.trim().toLowerCase() === clean.toLowerCase())) throw new Error(`Assembly "${clean}" already exists.`);
  return { id, name: clean, version: 1, components: [] };
}

export interface ComponentFormInput {
  code: string; description: string; unit: string; basis: string; quantityPerBasisUnit: string; ruleRef: string;
}

/** Returns the assembly with one more component, proving the result is valid. A changed definition bumps its version. */
export function addAssemblyComponent(def: AssemblyDefinition, input: ComponentFormInput, id: string): AssemblyDefinition {
  const unit = UNITS.find(candidate => candidate === input.unit);
  if (!unit) throw new Error("Choose a unit.");
  const basis = BASES.find(candidate => candidate === input.basis);
  if (!basis) throw new Error("Choose a basis.");
  const component: AssemblyComponent = {
    id, code: requireText(input.code, "Component code"), description: requireText(input.description, "Component description"),
    unit, basis, quantityPerBasisUnit: Number(input.quantityPerBasisUnit), ruleRef: input.ruleRef.trim()
  };
  const updated: AssemblyDefinition = { ...def, version: def.components.length === 0 ? def.version : def.version + 1, components: [...def.components, component] };
  validateAssembly(updated);
  return updated;
}

export function removeAssemblyComponent(def: AssemblyDefinition, componentId: string): AssemblyDefinition {
  const components = def.components.filter(component => component.id !== componentId);
  if (components.length === def.components.length) return def;
  return { ...def, version: def.version + 1, components };
}

export interface AssemblyApplication { items: BoqItemInput[]; result: AssemblyApplyResult; }

/** Applies the assembly to every room and merges the generated lines into the BOQ (existing commercial data is kept). */
export function applyAssemblyToProject(project: ProjectRecord, assemblyId: string, createId: () => string): AssemblyApplication {
  const def = assembliesOf(project).find(candidate => candidate.id === assemblyId);
  if (!def) throw new Error("Assembly not found.");
  const result = applyAssembly(def, project.rooms, project.boqItems, createId);
  const updates = new Map(result.updatedItems.map(item => [item.id, item]));
  return { items: [...project.boqItems.map(item => updates.get(item.id) ?? item), ...result.addedItems], result };
}

/* ---------------- MEP ---------------- */

export interface PointFormInput {
  discipline: string; deviceType: string; count: string; roomId: string; drawingRef: string; sheet: string; revision: string; reviewed: boolean;
}

function checkedMep(mep: MepTakeoffInput): MepTakeoffInput {
  const result = calculateMepTakeoff(mep);
  const fatal = result.checks.filter(text => text.startsWith("Duplicate") || text.includes("unknown point"));
  if (fatal.length) throw new Error(fatal.join(" "));
  return mep;
}

export function addMepPoint(mep: MepTakeoffInput, input: PointFormInput, id: string): MepTakeoffInput {
  const discipline = DISCIPLINES.find(candidate => candidate === input.discipline);
  if (!discipline) throw new Error("Choose a discipline.");
  const point: MepPoint = {
    id, discipline, deviceType: requireText(input.deviceType, "Device type"), count: Number(input.count),
    drawingRef: requireText(input.drawingRef, "Drawing reference"), reviewed: input.reviewed
  };
  if (input.roomId) point.roomId = input.roomId;
  if (input.sheet.trim()) point.sheet = input.sheet.trim();
  if (input.revision.trim()) point.revision = input.revision.trim();
  return checkedMep({ ...mep, points: [...mep.points, point] });
}

export function toggleMepPointReviewed(mep: MepTakeoffInput, pointId: string): MepTakeoffInput {
  return { ...mep, points: mep.points.map(point => point.id === pointId ? { ...point, reviewed: !point.reviewed } : point) };
}

/** Removing a point also removes it from circuits, so no circuit points at a missing point. */
export function removeMepPoint(mep: MepTakeoffInput, pointId: string): MepTakeoffInput {
  return {
    ...mep,
    points: mep.points.filter(point => point.id !== pointId),
    circuits: mep.circuits.map(circuit => ({ ...circuit, pointIds: circuit.pointIds.filter(id => id !== pointId) }))
  };
}

export interface CircuitFormInput { panelRef: string; circuitRef: string; scheduleRef: string; pointIds: string[]; }

export function addMepCircuit(mep: MepTakeoffInput, input: CircuitFormInput, id: string): MepTakeoffInput {
  const circuit: CircuitScheduleEntry = {
    id, panelRef: requireText(input.panelRef, "Panel reference"), circuitRef: requireText(input.circuitRef, "Circuit reference"),
    scheduleRef: requireText(input.scheduleRef, "Schedule reference"), pointIds: input.pointIds
  };
  return checkedMep({ ...mep, circuits: [...mep.circuits, circuit] });
}

export function removeMepCircuit(mep: MepTakeoffInput, circuitId: string): MepTakeoffInput {
  return { ...mep, circuits: mep.circuits.filter(circuit => circuit.id !== circuitId) };
}

export interface CableRunFormInput {
  discipline: string; spec: string; cores: string; parallelRuns: string; routeRef: string;
  /** Segment lengths in metres, separated by commas, spaces or new lines. */
  segments: string; allowanceLength: string; allowanceDescription: string; allowanceApprovalRef: string;
}

export function parseLengths(text: string): number[] {
  return text.split(/[\s,;،]+/).filter(part => part !== "").map(part => Number(part));
}

export function addMepCableRun(mep: MepTakeoffInput, input: CableRunFormInput, id: string): MepTakeoffInput {
  const discipline = DISCIPLINES.find(candidate => candidate === input.discipline);
  if (!discipline) throw new Error("Choose a discipline.");
  const lengths = parseLengths(input.segments);
  const allowanceText = input.allowanceLength.trim();
  const run: CableRun = {
    id, discipline, spec: requireText(input.spec, "Cable specification"), cores: Number(input.cores), parallelRuns: Number(input.parallelRuns),
    routeRef: requireText(input.routeRef, "Route reference"),
    segments: lengths.map((lengthM, index) => ({ id: `${id}-s${index + 1}`, lengthM })),
    allowances: allowanceText === "" ? [] : [{
      description: requireText(input.allowanceDescription, "Allowance description"), lengthM: Number(allowanceText),
      approvalRef: input.allowanceApprovalRef.trim()
    }]
  };
  const next = { ...mep, cableRuns: [...mep.cableRuns, run] };
  calculateMepTakeoff(next);
  return next;
}

export function removeMepCableRun(mep: MepTakeoffInput, runId: string): MepTakeoffInput {
  return { ...mep, cableRuns: mep.cableRuns.filter(run => run.id !== runId) };
}

export function mepSummary(project: ProjectRecord): MepTakeoffResult {
  return calculateMepTakeoff(mepOf(project));
}

export interface MepSync { items: BoqItemInput[]; added: number; updated: number; staleCount: number; }

/**
 * Pushes verified MEP totals into the BOQ. Lines are matched by source reference, so repeating the sync never
 * duplicates a line and keeps any rate already entered. Lines that are no longer verified are kept and counted.
 */
export function syncMepToBoq(project: ProjectRecord, createId: () => string): MepSync {
  const generated = mepToBoqItems(mepOf(project), createId);
  const bySource = new Map(project.boqItems.map(item => [item.sourceRef, item]));
  const replacements = new Map<string, BoqItemInput>();
  const additions: BoqItemInput[] = [];
  for (const item of generated) {
    const existing = bySource.get(item.sourceRef);
    if (!existing) { additions.push(item); continue; }
    if (existing.netQuantity !== item.netQuantity || existing.description !== item.description || existing.unit !== item.unit || existing.code !== item.code) {
      replacements.set(existing.id, { ...existing, code: item.code, description: item.description, unit: item.unit, netQuantity: item.netQuantity });
    }
  }
  const live = new Set(generated.map(item => item.sourceRef));
  const staleCount = project.boqItems.filter(item => item.sourceRef.startsWith("mep:") && !live.has(item.sourceRef)).length;
  return {
    items: [...project.boqItems.map(item => replacements.get(item.id) ?? item), ...additions],
    added: additions.length, updated: replacements.size, staleCount
  };
}
