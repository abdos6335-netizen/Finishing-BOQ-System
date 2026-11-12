import { describe, expect, it } from "vitest";
import { generateRoomBoqItems } from "../src/domain/room-boq-link";
import type { RoomInput } from "../src/domain/quantity-engine";

const kitchen: RoomInput = {
  id: "kitchen-01", name: "Kitchen", lengthM: 5, widthM: 4, heightM: 3,
  wallFaces: [
    { id: "north", lengthM: 5, heightM: 3, openings: [{ id: "window", widthM: 1.5, heightM: 1.5, deductionEnabled: true }] },
    { id: "east", lengthM: 4, heightM: 3, openings: [] },
    { id: "south", lengthM: 5, heightM: 3, openings: [{ id: "door", widthM: 0.9, heightM: 2, deductionEnabled: true }] },
    { id: "west", lengthM: 4, heightM: 3, openings: [] }
  ]
};

describe("room geometry to BOQ linking", () => {
  it("creates sourced floor, ceiling, and verified net-wall lines without inventing finishes or rates", () => {
    const result = generateRoomBoqItems([kitchen], [], (() => {
      let n = 0; return () => `generated-${++n}`;
    })());
    expect(result.addedItems).toHaveLength(3);
    expect(result.addedItems.map(item => item.netQuantity)).toEqual([20, 20, 49.95]);
    expect(result.addedItems.every(item => item.unit === "m2")).toBe(true);
    expect(result.addedItems.every(item => item.unitRate === undefined && item.approvedWasteRatePct === undefined)).toBe(true);
    expect(result.addedItems.every(item => item.sourceRef.startsWith("room:kitchen-01:takeoff:v1:"))).toBe(true);
  });

  it("does not create wall quantity when wall faces are missing or fail verification", () => {
    const noFaces = { ...kitchen, id: "kitchen-no-faces", wallFaces: [] };
    const invalidFace = { ...kitchen, id: "kitchen-invalid-face", wallFaces: [{ id: "short", lengthM: 1, heightM: 1, openings: [{ id: "too-wide", widthM: 2, heightM: 1, deductionEnabled: true }] }] };
    const result = generateRoomBoqItems([noFaces, invalidFace], [], () => "new-id");
    expect(result.addedItems).toHaveLength(4);
    expect(result.addedItems.every(item => !item.sourceRef.endsWith("net-wall-area"))).toBe(true);
    expect(result.wallReviewCount).toBe(2);
  });

  it("is idempotent and preserves existing BOQ entries", () => {
    const first = generateRoomBoqItems([kitchen], [], () => "generated");
    const second = generateRoomBoqItems([kitchen], first.addedItems, () => "must-not-be-used");
    expect(second.addedItems).toHaveLength(0);
    expect(second.alreadyPresentCount).toBe(3);
    expect(first.addedItems).toHaveLength(3);
  });

  it("keeps manual BOQ lines untouched", () => {
    const manual = { id: "manual", code: "M-1", description: "Manual item", unit: "m2" as const, netQuantity: 2, sourceRef: "drawing:A-01" };
    const result = generateRoomBoqItems([kitchen], [manual], () => "generated");
    expect(result.addedItems).toHaveLength(3);
    expect(result.addedItems.some(item => item.id === manual.id)).toBe(false);
  });
});
