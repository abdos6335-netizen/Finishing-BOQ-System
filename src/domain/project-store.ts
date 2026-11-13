import type { RoomInput } from "./quantity-engine";
import type { BoqItemInput } from "./boq-engine";
import type { CostAdjustment } from "./cost-engine";
import type { VariationOrder } from "./variation-orders";

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
          (item.variations !== undefined && (!Array.isArray(item.variations) || !item.variations.every(isVariation)))) return [];

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
        ...(Array.isArray(item.variations) ? { variations: item.variations as VariationOrder[] } : {})
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
