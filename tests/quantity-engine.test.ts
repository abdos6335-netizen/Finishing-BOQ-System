import { describe, expect, it } from "vitest";
import { calculateOpeningArea, calculateRoomQuantities, type RoomInput } from "../src/domain/quantity-engine";
const room: RoomInput = {
  id: "kitchen", name: "Kitchen", lengthM: 5, widthM: 4, heightM: 3,
  wallFaces: [
    { id: "north", lengthM: 5, heightM: 3, openings: [{ id: "window", widthM: 1.5, heightM: 1.5, deductionEnabled: true }] },
    { id: "east", lengthM: 4, heightM: 3, openings: [] },
    { id: "south", lengthM: 5, heightM: 3, openings: [{ id: "door", widthM: 0.9, heightM: 2, deductionEnabled: true }] },
    { id: "west", lengthM: 4, heightM: 3, openings: [] }
  ]
};
describe("deterministic quantity primitives", () => {
  it("converts opening width × height to area", () => expect(calculateOpeningArea(2, 0.9)).toBe(1.8));
  it("calculates room areas and reconciles wall quantities", () => {
    const r = calculateRoomQuantities(room);
    expect(r.floorAreaM2).toBe(20); expect(r.ceilingAreaM2).toBe(20);
    expect(r.wallGrossAreaM2).toBe(54); expect(r.openingDeductionM2).toBe(4.05);
    expect(r.wallNetAreaM2).toBe(49.95); expect(r.verification).toBe("matched");
  });
  it("does not deduct an opening unless the rule is explicitly enabled", () => {
    const r = calculateRoomQuantities({...room, wallFaces:[{id:"wall",lengthM:4,heightM:3,openings:[{id:"door",widthM:1,heightM:2,deductionEnabled:false}]}]});
    expect(r.openingDeductionM2).toBe(0); expect(r.wallNetAreaM2).toBe(12);
  });
  it("rejects invalid room dimensions", () => expect(() => calculateRoomQuantities({...room,lengthM:0})).toThrow(/greater than zero/));
  it("flags an opening larger than its assigned face for review", () => {
    const r = calculateRoomQuantities({...room,wallFaces:[{id:"short-wall",lengthM:1,heightM:2,openings:[{id:"wide-window",widthM:1.2,heightM:1,deductionEnabled:true}]}]});
    expect(r.verification).toBe("needs-review");
    expect(r.checks).toContain("Opening wide-window exceeds wall face short-wall dimensions.");
  });
  it("flags rooms with no explicitly measured wall faces instead of inventing four walls", () => {
    const r = calculateRoomQuantities({...room,wallFaces:[]});
    expect(r.floorAreaM2).toBe(20); expect(r.wallGrossAreaM2).toBe(0);
    expect(r.verification).toBe("needs-review");
  });
  it("flags deductions exceeding an individual face even when total room walls are larger", () => {
    const r = calculateRoomQuantities({...room,wallFaces:[
      {id:"A",lengthM:1,heightM:1,openings:[{id:"door-A",widthM:1,heightM:1,deductionEnabled:true},{id:"door-B",widthM:1,heightM:1,deductionEnabled:true}]},
      {id:"B",lengthM:10,heightM:3,openings:[]}
    ]});
    expect(r.verification).toBe("needs-review");
    expect(r.checks).toContain("Opening deductions exceed gross area on wall face A.");
  });
});
