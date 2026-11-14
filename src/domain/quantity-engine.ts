/**
 * Deterministic quantity primitives.
 *
 * These functions never infer dimensions, apply waste, choose deduction rules,
 * or approve assumptions. Callers must preserve source and review metadata.
 */
export type QuantityUnit = "m" | "m2" | "m3" | "pcs";
export interface Opening { id: string; widthM: number; heightM: number; deductionEnabled: boolean; }
export interface WallFaceInput { id: string; lengthM: number; heightM: number; openings: Opening[]; }
export interface RoomInput { id: string; name: string; lengthM: number; widthM: number; heightM: number; wallFaces: WallFaceInput[]; }
export interface QuantityResult {
  roomId: string; roomName: string; floorAreaM2: number; ceilingAreaM2: number;
  wallGrossAreaM2: number; openingDeductionM2: number; wallNetAreaM2: number;
  perimeterM: number; verification: "matched" | "needs-review"; checks: string[];
}
const EPSILON = 1e-8;
function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a finite number greater than zero.`);
}
function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
export function calculateOpeningArea(widthM: number, heightM: number): number {
  assertPositiveFinite(widthM, "Opening width");
  assertPositiveFinite(heightM, "Opening height");
  return round(widthM * heightM);
}
export function calculateRoomQuantities(room: RoomInput): QuantityResult {
  assertPositiveFinite(room.lengthM, "Room length");
  assertPositiveFinite(room.widthM, "Room width");
  assertPositiveFinite(room.heightM, "Room height");
  if (!room.id.trim() || !room.name.trim()) throw new Error("Room id and name are required.");
  if (!Array.isArray(room.wallFaces)) throw new Error("Wall faces must be an array.");

  const floorAreaM2 = round(room.lengthM * room.widthM);
  const ceilingAreaM2 = floorAreaM2;
  const perimeterM = round(2 * (room.lengthM + room.widthM));
  let wallGrossAreaM2 = 0;
  let openingDeductionM2 = 0;
  const checks: string[] = [];
  const faceIds = new Set<string>();
  const openingIds = new Set<string>();
  if (room.wallFaces.length === 0) checks.push("No wall faces have been explicitly measured.");

  for (const face of room.wallFaces) {
    if (!face.id.trim()) throw new Error("Wall face id is required.");
    if (faceIds.has(face.id)) checks.push(`Duplicate wall face id: ${face.id}.`);
    faceIds.add(face.id);
    assertPositiveFinite(face.lengthM, `Wall face ${face.id} length`);
    assertPositiveFinite(face.heightM, `Wall face ${face.id} height`);
    if (!Array.isArray(face.openings)) throw new Error(`Wall face ${face.id} openings must be an array.`);
    const faceGross = face.lengthM * face.heightM;
    let faceDeductions = 0;
    wallGrossAreaM2 += faceGross;

    for (const opening of face.openings) {
      if (!opening.id.trim()) throw new Error("Opening id is required.");
      if (openingIds.has(opening.id)) checks.push(`Duplicate opening id: ${opening.id}.`);
      openingIds.add(opening.id);
      const area = calculateOpeningArea(opening.widthM, opening.heightM);
      if (opening.widthM - face.lengthM > EPSILON || opening.heightM - face.heightM > EPSILON) {
        checks.push(`Opening ${opening.id} exceeds wall face ${face.id} dimensions.`);
      }
      if (opening.deductionEnabled) {
        faceDeductions += area;
        openingDeductionM2 += area;
      }
    }
    if (faceDeductions - faceGross > EPSILON) {
      checks.push(`Opening deductions exceed gross area on wall face ${face.id}.`);
    }
  }

  wallGrossAreaM2 = round(wallGrossAreaM2);
  openingDeductionM2 = round(openingDeductionM2);
  const wallNetAreaM2 = round(wallGrossAreaM2 - openingDeductionM2);
  if (openingDeductionM2 - wallGrossAreaM2 > EPSILON) checks.push("Opening deductions exceed the gross wall area.");
  if (wallNetAreaM2 < -EPSILON) checks.push("Net wall area is negative.");
  if (Math.abs(wallGrossAreaM2 - openingDeductionM2 - wallNetAreaM2) > 0.0001) {
    checks.push("Gross − deductions does not reconcile to net area.");
  }

  // Independent reconciliation: intentionally does not call the primary helpers.
  const independentlyReconciledNet = round(room.wallFaces.reduce((sum, face) => {
    const gross = face.lengthM * face.heightM;
    const deductions = face.openings.reduce((s, opening) =>
      s + (opening.deductionEnabled ? opening.widthM * opening.heightM : 0), 0);
    return sum + gross - deductions;
  }, 0));
  if (Math.abs(independentlyReconciledNet - wallNetAreaM2) > 0.0001) {
    checks.push("Independent wall-face reconciliation mismatch.");
  }
  return {
    roomId: room.id, roomName: room.name, floorAreaM2, ceilingAreaM2,
    wallGrossAreaM2, openingDeductionM2, wallNetAreaM2, perimeterM,
    verification: checks.length === 0 ? "matched" : "needs-review", checks
  };
}
