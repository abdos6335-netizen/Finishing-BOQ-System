/**
 * Deterministic quantity primitives.
 *
 * Important: these functions do not infer missing dimensions, apply waste,
 * decide opening deduction rules, or approve engineering assumptions.
 * Callers must provide explicit, reviewed inputs and preserve their sources.
 */

export type QuantityUnit = "m" | "m2" | "m3" | "pcs";

export interface Opening {
  id: string;
  widthM: number;
  heightM: number;
  deductionEnabled: boolean;
}

export interface WallFaceInput {
  id: string;
  lengthM: number;
  heightM: number;
  openings: Opening[];
}

export interface RoomInput {
  id: string;
  name: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  wallFaces: WallFaceInput[];
}

export interface QuantityResult {
  roomId: string;
  roomName: string;
  floorAreaM2: number;
  ceilingAreaM2: number;
  wallGrossAreaM2: number;
  openingDeductionM2: number;
  wallNetAreaM2: number;
  perimeterM: number;
  verification: "matched" | "needs-review";
  checks: string[];
}

const EPSILON = 1e-8;

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than zero.`);
  }
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
  if (!Array.isArray(room.wallFaces) || room.wallFaces.length === 0) {
    throw new Error("At least one explicitly defined wall face is required.");
  }

  const floorAreaM2 = round(room.lengthM * room.widthM);
  const ceilingAreaM2 = floorAreaM2;
  const perimeterM = round(2 * (room.lengthM + room.widthM));

  let wallGrossAreaM2 = 0;
  let openingDeductionM2 = 0;
  const checks: string[] = [];

  for (const face of room.wallFaces) {
    assertPositiveFinite(face.lengthM, `Wall face ${face.id} length`);
    assertPositiveFinite(face.heightM, `Wall face ${face.id} height`);
    wallGrossAreaM2 += face.lengthM * face.heightM;

    for (const opening of face.openings) {
      if (!opening.id.trim()) throw new Error("Opening id is required.");
      const area = calculateOpeningArea(opening.widthM, opening.heightM);
      if (opening.deductionEnabled) openingDeductionM2 += area;
    }
  }

  wallGrossAreaM2 = round(wallGrossAreaM2);
  openingDeductionM2 = round(openingDeductionM2);
  const wallNetAreaM2 = round(wallGrossAreaM2 - openingDeductionM2);

  if (openingDeductionM2 - wallGrossAreaM2 > EPSILON) {
    checks.push("Opening deductions exceed the gross wall area.");
  }
  if (wallNetAreaM2 < -EPSILON) {
    checks.push("Net wall area is negative.");
  }
  if (Math.abs(wallGrossAreaM2 - openingDeductionM2 - wallNetAreaM2) > 0.0001) {
    checks.push("Gross − deductions does not reconcile to net area.");
  }

  // Independent arithmetic reconciliation; does not call the primary area helper.
  const independentlyReconciledNet = round(
    room.wallFaces.reduce((sum, face) => {
      const faceGross = face.lengthM * face.heightM;
      const faceDeductions = face.openings.reduce(
        (openingSum, opening) =>
          openingSum + (opening.deductionEnabled ? opening.widthM * opening.heightM : 0),
        0
      );
      return sum + faceGross - faceDeductions;
    }, 0)
  );

  if (Math.abs(independentlyReconciledNet - wallNetAreaM2) > 0.0001) {
    checks.push("Independent wall-face reconciliation mismatch.");
  }

  return {
    roomId: room.id,
    roomName: room.name,
    floorAreaM2,
    ceilingAreaM2,
    wallGrossAreaM2,
    openingDeductionM2,
    wallNetAreaM2,
    perimeterM,
    verification: checks.length === 0 ? "matched" : "needs-review",
    checks
  };
}
