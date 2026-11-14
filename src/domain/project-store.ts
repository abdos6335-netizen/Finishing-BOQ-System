import type { RoomInput } from "./quantity-engine";
import type { BoqItemInput } from "./boq-engine";
import type { CostAdjustment } from "./cost-engine";
import type { VariationOrder } from "./variation-orders";
import type { AssemblyDefinition } from "./finishing-assemblies";
import type { MepTakeoffInput } from "./mep-takeoff";
import type { ProjectSchedule, SourcedScheduleActivity } from "./project-schedule";

export type BuildingCondition =
  | "red-brick"
  | "renovation"
  | "plaster-only"
  | "semi-finished"
  | "fully-finished"
  | "alteration"
  | "concrete-shell"
  | "unspecified";

export type ProjectType = "apartment" | "villa";

export interface ProjectRecord {
  id: string;
  name: string;
  projectType: ProjectType;
  buildingCondition: BuildingCondition;
  createdAt: string;
  rooms: RoomInput[];
  boqItems: BoqItemInput[];
  /** Added after the first release; absent on older records and treated as empty. */
  currency?: string;
  adjustments?: CostAdjustment[];
  variations?: VariationOrder[];
  assemblies?: AssemblyDefinition[];
  mep?: MepTakeoffInput;
  scheduleActivities?: SourcedScheduleActivity[];
  schedule?: ProjectSchedule;
}

const STORAGE_KEY = "finishing-boq.projects.v1";
const BUILDING_CONDITIONS = new Set<BuildingCondition>([
  "red-brick", "renovation", "plaster-only", "semi-finished",
  "fully-finished", "alteration", "concrete-shell", "unspecified"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoqItem(value: unknown): value is BoqItemInput {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.code === "string" &&
    typeof value.description === "string" &&
    ["m", "m2", "m3", "pcs"].includes(String(value.unit)) &&
    typeof value.netQuantity === "number" && typeof value.sourceRef === "string";
}

const ADJUSTMENT_KINDS = ["transport", "engineer-fee", "overhead", "contingency", "profit", "tax", "other"];
const VARIATION_STATUSES = ["draft", "submitted", "approved", "rejected"];

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isAdjustment(value: unknown): value is CostAdjustment {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.label === "string" &&
    ADJUSTMENT_KINDS.includes(String(value.kind)) &&
    typeof value.order === "number" && Number.isInteger(value.order) &&
    typeof value.approvalRef === "string" && typeof value.clientVisible === "boolean" &&
    isOptionalNumber(value.ratePct) && isOptionalNumber(value.fixedAmount) &&
    (value.base === undefined || value.base === "direct" || value.base === "cumulative");
}

function isVariation(value: unknown): value is VariationOrder {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.number === "string" &&
    typeof value.title === "string" && typeof value.reason === "string" &&
    typeof value.baseRevision === "string" && typeof value.createdAt === "string" &&
    VARIATION_STATUSES.includes(String(value.status)) &&
    (value.approvalRef === undefined || typeof value.approvalRef === "string") &&
    Array.isArray(value.items) &&
    value.items.every(entry => isRecord(entry) && (entry.direction === "addition" || entry.direction === "omission") && isBoqItem(entry.item));
}

function isAssembly(value: unknown): value is AssemblyDefinition {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.version === "number" && Number.isInteger(value.version) &&
    Array.isArray(value.components) &&
    value.components.every(c => isRecord(c) && typeof c.id === "string" && typeof c.code === "string" &&
      typeof c.description === "string" && ["m", "m2", "m3", "pcs"].includes(String(c.unit)) &&
      ["floor-area", "ceiling-area", "wall-net-area", "wall-gross-area", "perimeter"].includes(String(c.basis)) &&
      typeof c.quantityPerBasisUnit === "number" && typeof c.ruleRef === "string");
}

function isMep(value: unknown): value is MepTakeoffInput {
  if (!isRecord(value)) return false;
  const disciplines = ["electrical", "low-current", "plumbing", "hvac"];
  return Array.isArray(value.points) && Array.isArray(value.circuits) && Array.isArray(value.cableRuns) &&
    value.points.every(p => isRecord(p) && typeof p.id === "string" && disciplines.includes(String(p.discipline)) &&
      typeof p.deviceType === "string" && typeof p.count === "number" && typeof p.drawingRef === "string" && typeof p.reviewed === "boolean") &&
    value.circuits.every(c => isRecord(c) && typeof c.id === "string" && typeof c.panelRef === "string" && typeof c.circuitRef === "string" &&
      typeof c.scheduleRef === "string" && Array.isArray(c.pointIds) && c.pointIds.every(id => typeof id === "string")) &&
    value.cableRuns.every(r => isRecord(r) && typeof r.id === "string" && disciplines.includes(String(r.discipline)) && typeof r.spec === "string" &&
      typeof r.cores === "number" && typeof r.parallelRuns === "number" && typeof r.routeRef === "string" &&
      Array.isArray(r.segments) && r.segments.every(g => isRecord(g) && typeof g.id === "string" && typeof g.lengthM === "number") &&
      Array.isArray(r.allowances) && r.allowances.every(a => isRecord(a) && typeof a.description === "string" && typeof a.lengthM === "number" && typeof a.approvalRef === "string"));
}

function isSchedule(value: unknown): value is ProjectSchedule {
  if (!isRecord(value)) return false;
  const rel = ["FS", "SS", "FF"];
  return (value.rounding === "none" || value.rounding === "ceil") &&
    Array.isArray(value.rates) && value.rates.every(r => isRecord(r) && typeof r.id === "string" &&
      ["m", "m2", "m3", "pcs"].includes(String(r.unit)) && (r.basis === "per-crew-day" || r.basis === "per-worker-day") &&
      typeof r.value === "number" && typeof r.sourceRef === "string" && typeof r.sourceDate === "string" && typeof r.location === "string" &&
      isOptionalNumber(r.confidence)) &&
    Array.isArray(value.activities) && value.activities.every(a => isRecord(a) && typeof a.id === "string" && typeof a.name === "string" &&
      typeof a.quantity === "number" && ["m", "m2", "m3", "pcs"].includes(String(a.unit)) && typeof a.quantitySourceRef === "string" &&
      (a.rateId === undefined || typeof a.rateId === "string") && isOptionalNumber(a.crewSize) &&
      Array.isArray(a.predecessors) && a.predecessors.every(p => isRecord(p) && typeof p.id === "string" && rel.includes(String(p.type)) && typeof p.lagDays === "number")) &&
    (value.calendar === undefined || (isRecord(value.calendar) && typeof value.calendar.startDate === "string" &&
      Array.isArray(value.calendar.workingWeekdays) && value.calendar.workingWeekdays.every(d => typeof d === "number") &&
      Array.isArray(value.calendar.holidays) && value.calendar.holidays.every(h => typeof h === "string")));
}

function isRoom(value: unknown): value is RoomInput {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.lengthM === "number" &&
    typeof value.widthM === "number" &&
    typeof value.heightM === "number" &&
    Array.isArray(value.wallFaces);
}

/**
 * Loads version-1 browser records and safely migrates projects created before
 * buildingCondition was introduced. Invalid records are ignored, not guessed.
 */
export function loadProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): ProjectRecord[] => {
      if (!isRecord(item) ||
          typeof item.id !== "string" ||
          typeof item.name !== "string" ||
          typeof item.createdAt !== "string" ||
          !Array.isArray(item.rooms) ||
          !item.rooms.every(isRoom) ||
          (item.boqItems !== undefined && (!Array.isArray(item.boqItems) || !item.boqItems.every(isBoqItem))) ||
          (item.currency !== undefined && typeof item.currency !== "string") ||
          (item.adjustments !== undefined && (!Array.isArray(item.adjustments) || !item.adjustments.every(isAdjustment))) ||
          (item.variations !== undefined && (!Array.isArray(item.variations) || !item.variations.every(isVariation))) ||
          (item.assemblies !== undefined && (!Array.isArray(item.assemblies) || !item.assemblies.every(isAssembly))) ||
          (item.mep !== undefined && !isMep(item.mep)) ||
          (item.scheduleActivities !== undefined && (!Array.isArray(item.scheduleActivities) || !item.scheduleActivities.every(a => isRecord(a) && typeof a.id === "string" && typeof a.name === "string" && typeof a.durationDays === "number" && Number.isFinite(a.durationDays) && typeof a.durationSourceRef === "string" && Array.isArray(a.predecessors) && a.predecessors.every(p => isRecord(p) && typeof p.id === "string" && ["FS", "SS", "FF"].includes(String(p.type)) && typeof p.lagDays === "number" && Number.isFinite(p.lagDays))))) ||
          (item.schedule !== undefined && !isSchedule(item.schedule))) return [];

      const projectType: ProjectType =
        item.projectType === "villa" ? "villa" : "apartment";
      const buildingCondition = BUILDING_CONDITIONS.has(
        item.buildingCondition as BuildingCondition
      ) ? item.buildingCondition as BuildingCondition : "unspecified";

      return [{
        id: item.id,
        name: item.name,
        projectType,
        buildingCondition,
        createdAt: item.createdAt,
        rooms: item.rooms,
        boqItems: Array.isArray(item.boqItems) ? item.boqItems : [],
        ...(typeof item.currency === "string" ? { currency: item.currency } : {}),
        ...(Array.isArray(item.adjustments) ? { adjustments: item.adjustments as CostAdjustment[] } : {}),
        ...(Array.isArray(item.variations) ? { variations: item.variations as VariationOrder[] } : {}),
        ...(Array.isArray(item.assemblies) ? { assemblies: item.assemblies as AssemblyDefinition[] } : {}),
        ...(isMep(item.mep) ? { mep: item.mep } : {}),
        ...(Array.isArray(item.scheduleActivities) ? { scheduleActivities: item.scheduleActivities as SourcedScheduleActivity[] } : {}),
        ...(isSchedule(item.schedule) ? { schedule: item.schedule } : {})
      }];
    });
  } catch {
    return [];
  }
}

export function saveProjects(projects: ProjectRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
