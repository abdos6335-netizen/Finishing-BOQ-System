/**
 * Auditable comparison of written dimensions and drawing-extracted dimensions.
 * No tolerance, source, or confidence is invented by this module.
 */
export type DimensionUnit = "mm" | "cm" | "m";
export type DimensionSource = "dimension-text" | "drawing-extraction" | "field-measurement";

export interface DimensionObservation {
  id: string;
  dimensionKey: string;
  value: number;
  unit: DimensionUnit;
  source: DimensionSource;
  sourceRef: string;
  confidence?: number;
  processingDurationMs?: number;
}

export interface DimensionComparison {
  dimensionKey: string;
  writtenValueM: number;
  extractedValueM: number;
  absoluteDifferenceM: number;
  toleranceM: number;
  withinTolerance: boolean;
  status: "matched" | "needs-review";
  observations: [DimensionObservation, DimensionObservation];
}

const TO_METRES: Record<DimensionUnit, number> = { mm: 0.001, cm: 0.01, m: 1 };

function validateObservation(item: DimensionObservation): void {
  if (!item.id.trim() || !item.dimensionKey.trim() || !item.sourceRef.trim()) {
    throw new Error("Observation id, dimension key, and source reference are required.");
  }
  if (!Number.isFinite(item.value) || item.value <= 0) {
    throw new Error("Dimension value must be finite and greater than zero.");
  }
  if (item.confidence !== undefined &&
      (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1)) {
    throw new Error("Confidence must be between 0 and 1.");
  }
  if (item.processingDurationMs !== undefined &&
      (!Number.isFinite(item.processingDurationMs) || item.processingDurationMs < 0)) {
    throw new Error("Processing duration must be a finite non-negative number.");
  }
}

export function toMetres(value: number, unit: DimensionUnit): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Dimension value must be finite and greater than zero.");
  }
  return value * TO_METRES[unit];
}

export function compareWrittenAndExtractedDimensions(
  written: DimensionObservation,
  extracted: DimensionObservation,
  toleranceM: number
): DimensionComparison {
  validateObservation(written);
  validateObservation(extracted);
  if (written.source !== "dimension-text") {
    throw new Error("First observation must come from written dimension text.");
  }
  if (extracted.source !== "drawing-extraction") {
    throw new Error("Second observation must come from drawing extraction.");
  }
  if (written.dimensionKey !== extracted.dimensionKey) {
    throw new Error("Observations must describe the same dimension key.");
  }
  if (!Number.isFinite(toleranceM) || toleranceM < 0) {
    throw new Error("An explicit finite non-negative tolerance in metres is required.");
  }

  const writtenValueM = toMetres(written.value, written.unit);
  const extractedValueM = toMetres(extracted.value, extracted.unit);
  const absoluteDifferenceM = Math.abs(writtenValueM - extractedValueM);
  const withinTolerance = absoluteDifferenceM <= toleranceM + Number.EPSILON;

  return {
    dimensionKey: written.dimensionKey,
    writtenValueM,
    extractedValueM,
    absoluteDifferenceM,
    toleranceM,
    withinTolerance,
    status: withinTolerance ? "matched" : "needs-review",
    observations: [written, extracted]
  };
}
