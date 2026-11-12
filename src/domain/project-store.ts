import type { RoomInput } from "./quantity-engine";

export type BuildingCondition =\n  | "red-brick"\n  | "renovation"\n  | "plaster-only"\n  | "semi-finished"\n  | "fully-finished"\n  | "alteration"\n  | "concrete-shell"\n  | "unspecified";\n\nexport interface ProjectRecord {
  id: string;
  name: string;
  projectType: string;
  createdAt: string;
  rooms: RoomInput[];
}

const STORAGE_KEY = "finishing-boq.projects.v1";

export function loadProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectRecord[]) : [];
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
