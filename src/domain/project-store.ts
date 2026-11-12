import type { RoomInput } from "./quantity-engine";

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
}

const STORAGE_KEY = "finishing-boq.projects.v1";
const BUILDING_CONDITIONS = new Set<BuildingCondition>([
  "red-brick", "renovation", "plaster-only", "semi-finished",
  "fully-finished", "alteration", "concrete-shell", "unspecified"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
          !item.rooms.every(isRoom)) return [];

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
        rooms: item.rooms
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
