import { calculateRoomQuantities, type RoomInput } from "./quantity-engine";
import type { BoqItemInput } from "./boq-engine";

export interface RoomBoqLinkResult {
  addedItems: BoqItemInput[];
  updatedItems: BoqItemInput[];
  alreadyPresentCount: number;
  wallReviewCount: number;
  staleWallSourceRefs: string[];
}

const SOURCE_PREFIX = "room:";
const WALL_KIND = "net-wall-area";

/** Synchronizes measured geometry snapshots while preserving commercial approvals. */
export function generateRoomBoqItems(
  rooms: RoomInput[],
  existingItems: BoqItemInput[],
  createId: () => string
): RoomBoqLinkResult {
  const existingBySource = new Map(existingItems.map(item => [item.sourceRef, item]));
  const addedItems: BoqItemInput[] = [];
  const updatedItems: BoqItemInput[] = [];
  const staleWallSourceRefs: string[] = [];
  let alreadyPresentCount = 0;
  let wallReviewCount = 0;

  for (const room of rooms) {
    const result = calculateRoomQuantities(room);
    const roomToken = room.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() || "ROOM";
    const candidates: Array<{ kind: string; suffix: string; description: string; quantity: number }> = [
      { kind: "floor-area", suffix: "FLR", description: `Measured floor area — ${room.name} (finish unspecified)`, quantity: result.floorAreaM2 },
      { kind: "ceiling-area", suffix: "CLG", description: `Measured ceiling area — ${room.name} (finish unspecified)`, quantity: result.ceilingAreaM2 }
    ];

    const wallSourceRef = `${SOURCE_PREFIX}${encodeURIComponent(room.id)}:takeoff:v1:${WALL_KIND}`;
    if (room.wallFaces.length > 0 && result.verification === "matched") {
      candidates.push({
        kind: WALL_KIND,
        suffix: "WAL",
        description: `Measured net wall area — ${room.name} (finish unspecified)`,
        quantity: result.wallNetAreaM2
      });
    } else {
      wallReviewCount += 1;
      if (existingBySource.has(wallSourceRef)) staleWallSourceRefs.push(wallSourceRef);
    }

    for (const candidate of candidates) {
      const sourceRef = `${SOURCE_PREFIX}${encodeURIComponent(room.id)}:takeoff:v1:${candidate.kind}`;
      const existing = existingBySource.get(sourceRef);
      const code = `RT-${roomToken}-${candidate.suffix}`;
      if (existing) {
        const changed = existing.netQuantity !== candidate.quantity ||
          existing.description !== candidate.description ||
          existing.code !== code || existing.unit !== "m2";
        if (changed) {
          updatedItems.push({
            ...existing, code, description: candidate.description,
            unit: "m2", netQuantity: candidate.quantity, sourceRef
          });
        } else {
          alreadyPresentCount += 1;
        }
        continue;
      }
      addedItems.push({
        id: createId(), code, description: candidate.description,
        unit: "m2", netQuantity: candidate.quantity, sourceRef
      });
    }
  }

  const currentRoomIds = new Set(rooms.map(room => room.id));
  for (const item of existingItems) {
    if (!item.sourceRef.startsWith(SOURCE_PREFIX) || !item.sourceRef.endsWith(`:${WALL_KIND}`)) continue;
    const encodedId = item.sourceRef.slice(SOURCE_PREFIX.length).split(":takeoff:v1:")[0];
    let roomId = encodedId;
    try { roomId = decodeURIComponent(encodedId); } catch { /* keep original token */ }
    if (!currentRoomIds.has(roomId) && !staleWallSourceRefs.includes(item.sourceRef)) {
      staleWallSourceRefs.push(item.sourceRef);
    }
  }

  return { addedItems, updatedItems, alreadyPresentCount, wallReviewCount, staleWallSourceRefs };
}
