import { calculateRoomQuantities, type RoomInput } from "./quantity-engine";
import type { BoqItemInput } from "./boq-engine";

export interface RoomBoqLinkResult {
  addedItems: BoqItemInput[];
  alreadyPresentCount: number;
  wallReviewCount: number;
}

/**
 * Creates traceable, unpriced BOQ lines from room geometry.
 * It never assigns finishes, waste, or rates. Wall areas are linked only
 * when explicitly measured wall faces pass the quantity engine checks.
 * Existing source references are treated as snapshots and are never duplicated.
 */
export function generateRoomBoqItems(
  rooms: RoomInput[],
  existingItems: BoqItemInput[],
  createId: () => string
): RoomBoqLinkResult {
  const existingSources = new Set(existingItems.map(item => item.sourceRef));
  const addedItems: BoqItemInput[] = [];
  let alreadyPresentCount = 0;
  let wallReviewCount = 0;

  for (const room of rooms) {
    const result = calculateRoomQuantities(room);
    const roomToken = room.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() || "ROOM";
    const candidates: Array<{ kind: string; suffix: string; description: string; quantity: number }> = [
      { kind: "floor-area", suffix: "FLR", description: `Measured floor area — ${room.name} (finish unspecified)`, quantity: result.floorAreaM2 },
      { kind: "ceiling-area", suffix: "CLG", description: `Measured ceiling area — ${room.name} (finish unspecified)`, quantity: result.ceilingAreaM2 }
    ];

    if (room.wallFaces.length > 0 && result.verification === "matched") {
      candidates.push({
        kind: "net-wall-area",
        suffix: "WAL",
        description: `Measured net wall area — ${room.name} (finish unspecified)`,
        quantity: result.wallNetAreaM2
      });
    } else {
      wallReviewCount += 1;
    }

    for (const candidate of candidates) {
      const sourceRef = `room:${encodeURIComponent(room.id)}:takeoff:v1:${candidate.kind}`;
      if (existingSources.has(sourceRef)) {
        alreadyPresentCount += 1;
        continue;
      }
      const item: BoqItemInput = {
        id: createId(),
        code: `RT-${roomToken}-${candidate.suffix}`,
        description: candidate.description,
        unit: "m2",
        netQuantity: candidate.quantity,
        sourceRef
      };
      addedItems.push(item);
      existingSources.add(sourceRef);
    }
  }

  return { addedItems, alreadyPresentCount, wallReviewCount };
}
