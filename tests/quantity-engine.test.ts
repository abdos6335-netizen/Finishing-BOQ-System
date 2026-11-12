import { describe, expect, it } from "vitest";
import { calculateOpeningArea, calculateRoomQuantities, type RoomInput } from "../src/domain/quantity-engine";

const room: RoomInput = {
  id: "kitchen",
  name: "Kitchen",
  lengthM: 5,
  widthM: 4,
  heightM: 3,
  wallFaces: [
    { id: "north", lengthM: 5, heightM: 3, openings: [{ id: "window", widthM: 1.5, heightM: 1.5, deductionEnabled: true }] },
    { id: "east", lengthM: 4, heightM: 3, openings: [] },
    { id: "south", lengthM: 5, heightM: 3, openings: [{ id: "door", widthM: 0.9, heightM: 2, deductionEnabled: true }] },
    { id: "west", lengthM: 4, heightM: 3, openings: [] }
  ]
};

describe("deterministic quantity primitives", () => {
  it("converts opening width × height to area", () => {
    expect(calculateOpeningArea(2, 0.9)).toBe(1.8);
  });

  it("calculates room floor, ceiling, gross wall, deductions and net wall areas", () => {
    const result = calculateRoomQuantities(room);
    expect(result.floorAreaM2).toBe(20);
    expect(result.ceilingAreaM2).toBe(20);
    expect(result.wallGrossAreaM2).toBe(54);
    expect(result.openingDeductionM2).toBe(4.05);
    expect(result.wallNetAreaM2).toBe(49.95);
    expect(result.verification).toBe("matched");
  });

  it("does not deduct an opening unless the rule is explicitly enabled", () => {
    const result = calculateRoomQuantities({
      ...room,
      wallFaces: [{ id: "wall", lengthM: 4, heightM: 3, openings: [{ id: "door", widthM: 1, heightM: 2, deductionEnabled: false }] }]
    });
    expect(result.openingDeductionM2).toBe(0);
    expect(result.wallNetAreaM2).toBe(12);
  });

  it("rejects invalid dimensions instead of guessing", () => {
    expect(() => calculateRoomQuantities({ ...room, lengthM: 0 })).toThrow(/greater than zero/);
  });
});
