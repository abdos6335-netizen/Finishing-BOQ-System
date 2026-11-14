import { calculateRoomQuantities, type RoomInput } from "./quantity-engine";
import type { BoqItemInput, BoqUnit } from "./boq-engine";
import { assertPositive, requireText, round } from "./numeric";

/**
 * Finishing assemblies: a named set of components derived from measured room
 * geometry. Consumption ratios are never defaulted — each component carries an
 * explicit ratio and a rule reference supplied by the project.
 */
export type AssemblyBasis = "floor-area" | "ceiling-area" | "wall-net-area" | "wall-gross-area" | "perimeter";

export interface AssemblyComponent {
  id: string;
  code: string;
  description: string;
  unit: BoqUnit;
  basis: AssemblyBasis;
  /** Component quantity per one basis unit (e.g. 1 m² tile per m² floor). */
  quantityPerBasisUnit: number;
  ruleRef: string;
}

export interface AssemblyDefinition {
  id: string;
  name: string;
  version: number;
  components: AssemblyComponent[];
}

export interface AssemblyApplyResult {
  addedItems: BoqItemInput[];
  updatedItems: BoqItemInput[];
  alreadyPresentCount: number;
  skipped: Array<{ roomId: string; componentId: string; reason: string }>;
  overlapWarnings: string[];
}

const BASIS_ROOM_KIND: Record<AssemblyBasis, string | null> = {
  "floor-area": "floor-area",
  "ceiling-area": "ceiling-area",
  "wall-net-area": "net-wall-area",
  "wall-gross-area": null,
  perimeter: null
};

export function validateAssembly(def: AssemblyDefinition): void {
  requireText(def.id, "Assembly id");
  requireText(def.name, "Assembly name");
  if (!Number.isInteger(def.version) || def.version < 1) throw new Error("Assembly version must be a positive integer.");
  if (def.components.length === 0) throw new Error("An assembly requires at least one component.");
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const component of def.components) {
    requireText(component.id, "Component id");
    requireText(component.code, "Component code");
    requireText(component.description, "Component description");
    requireText(component.ruleRef, `Component ${component.id} rule reference`);
    assertPositive(component.quantityPerBasisUnit, `Component ${component.id} quantity per basis unit`);
    if (ids.has(component.id)) throw new Error(`Duplicate component id: ${component.id}.`);
    if (codes.has(component.code)) throw new Error(`Duplicate component code: ${component.code}.`);
    ids.add(component.id);
    codes.add(component.code);
  }
}

export function assemblySourceRef(def: AssemblyDefinition, roomId: string, componentId: string): string {
  return `assembly:${encodeURIComponent(def.id)}@v${def.version}:room:${encodeURIComponent(roomId)}:${encodeURIComponent(componentId)}`;
}

/** Generates (or synchronizes) BOQ items for the assembly on the chosen rooms. */
export function applyAssembly(
  def: AssemblyDefinition,
  rooms: RoomInput[],
  existingItems: BoqItemInput[],
  createId: () => string
): AssemblyApplyResult {
  validateAssembly(def);
  const bySource = new Map(existingItems.map(item => [item.sourceRef, item]));
  const result: AssemblyApplyResult = { addedItems: [], updatedItems: [], alreadyPresentCount: 0, skipped: [], overlapWarnings: [] };

  for (const room of rooms) {
    const quantities = calculateRoomQuantities(room);
    for (const component of def.components) {
      let basisQuantity: number | null;
      switch (component.basis) {
        case "floor-area": basisQuantity = quantities.floorAreaM2; break;
        case "ceiling-area": basisQuantity = quantities.ceilingAreaM2; break;
        case "perimeter": basisQuantity = quantities.perimeterM; break;
        case "wall-gross-area":
          basisQuantity = room.wallFaces.length > 0 ? quantities.wallGrossAreaM2 : null; break;
        case "wall-net-area":
          basisQuantity = room.wallFaces.length > 0 && quantities.verification === "matched" ? quantities.wallNetAreaM2 : null; break;
      }
      if (basisQuantity === null) {
        result.skipped.push({ roomId: room.id, componentId: component.id, reason: "Wall geometry is missing or needs review." });
        continue;
      }
      const netQuantity = round(basisQuantity * component.quantityPerBasisUnit);
      const sourceRef = assemblySourceRef(def, room.id, component.id);
      const code = `${component.code}-${room.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "ROOM"}`;
      const description = `${component.description} — ${room.name} [${def.name} v${def.version}]`;
      const existing = bySource.get(sourceRef);
      if (existing) {
        if (existing.netQuantity !== netQuantity || existing.description !== description || existing.unit !== component.unit || existing.code !== code) {
          result.updatedItems.push({ ...existing, code, description, unit: component.unit, netQuantity, sourceRef });
        } else {
          result.alreadyPresentCount += 1;
        }
      } else {
        result.addedItems.push({ id: createId(), code, description, unit: component.unit, netQuantity, sourceRef });
      }
      const kind = BASIS_ROOM_KIND[component.basis];
      if (kind) {
        const genericRef = `room:${encodeURIComponent(room.id)}:takeoff:v1:${kind}`;
        if (bySource.has(genericRef)) {
          result.overlapWarnings.push(`Room ${room.name}: generic ${kind} item and assembly component ${component.code} may double count the same surface.`);
        }
      }
    }
  }
  return result;
}

/** Finds assembly items that share a sourceRef (guards against duplicates after merges). */
export function findDuplicateSourceRefs(items: BoqItemInput[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item.sourceRef)) duplicates.add(item.sourceRef);
    seen.add(item.sourceRef);
  }
  return [...duplicates];
}
