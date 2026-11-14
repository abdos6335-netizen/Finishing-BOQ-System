import {
  compareWrittenAndExtractedDimensions,
  toMetres,
  type DimensionComparison,
  type DimensionObservation
} from "./measurement-audit";
import { round } from "./numeric";

/**
 * Batch audit of dimension observations grouped by dimension key.
 * The tolerance is always an explicit caller input; no tolerance, severity
 * threshold or confidence floor is invented here.
 */
export interface DimensionAuditOptions {
  toleranceM: number;
  /** Optional explicit confidence floor for drawing-extracted values (0..1). */
  minExtractionConfidence?: number;
}

export interface DimensionAuditEntry {
  dimensionKey: string;
  status: "matched" | "needs-review" | "incomplete";
  comparison: DimensionComparison | null;
  fieldDifferenceM: number | null;
  /** |difference| / tolerance; null when tolerance is zero or no comparison exists. */
  toleranceRatio: number | null;
  reasons: string[];
}

export interface DimensionAuditReport {
  entries: DimensionAuditEntry[];
  matched: number;
  needsReview: number;
  incomplete: number;
  /** Wall quantities may be approved only when no dimension needs review or is incomplete. */
  blockedDimensionKeys: string[];
  canApproveDependentQuantities: boolean;
}

export function auditDimensions(observations: DimensionObservation[], options: DimensionAuditOptions): DimensionAuditReport {
  if (!Number.isFinite(options.toleranceM) || options.toleranceM < 0) {
    throw new Error("An explicit finite non-negative tolerance in metres is required.");
  }
  if (options.minExtractionConfidence !== undefined &&
      (!Number.isFinite(options.minExtractionConfidence) || options.minExtractionConfidence < 0 || options.minExtractionConfidence > 1)) {
    throw new Error("Minimum extraction confidence must be between 0 and 1.");
  }

  const byKey = new Map<string, DimensionObservation[]>();
  for (const observation of observations) {
    const list = byKey.get(observation.dimensionKey) ?? [];
    list.push(observation);
    byKey.set(observation.dimensionKey, list);
  }

  const entries: DimensionAuditEntry[] = [];
  for (const [dimensionKey, group] of [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const reasons: string[] = [];
    const written = group.filter(item => item.source === "dimension-text");
    const extracted = group.filter(item => item.source === "drawing-extraction");
    const field = group.filter(item => item.source === "field-measurement");

    if (written.length > 1) reasons.push("Multiple written observations exist for the same dimension.");
    if (extracted.length > 1) reasons.push("Multiple extracted observations exist for the same dimension.");
    if (field.length > 1) reasons.push("Multiple field measurements exist for the same dimension.");
    if (written.length === 0) reasons.push("No written dimension is available.");
    if (extracted.length === 0) reasons.push("No drawing-extracted dimension is available.");

    let comparison: DimensionComparison | null = null;
    let toleranceRatio: number | null = null;
    if (written.length === 1 && extracted.length === 1) {
      comparison = compareWrittenAndExtractedDimensions(written[0], extracted[0], options.toleranceM);
      if (!comparison.withinTolerance) reasons.push("Written and extracted dimensions differ by more than the tolerance.");
      toleranceRatio = options.toleranceM > 0 ? round(comparison.absoluteDifferenceM / options.toleranceM) : null;
    }

    if (options.minExtractionConfidence !== undefined) {
      for (const item of extracted) {
        if (item.confidence === undefined) reasons.push(`Extracted observation ${item.id} has no confidence value.`);
        else if (item.confidence < options.minExtractionConfidence) reasons.push(`Extracted observation ${item.id} is below the confidence floor.`);
      }
    }

    let fieldDifferenceM: number | null = null;
    if (field.length === 1) {
      const fieldM = toMetres(field[0].value, field[0].unit);
      const reference = written.length === 1 ? written[0] : extracted.length === 1 ? extracted[0] : null;
      if (reference) {
        fieldDifferenceM = round(Math.abs(fieldM - toMetres(reference.value, reference.unit)));
        if (fieldDifferenceM > options.toleranceM + Number.EPSILON) reasons.push("Field measurement differs from the drawing dimension by more than the tolerance.");
      }
    }

    const incomplete = written.length === 0 || extracted.length === 0;
    const status: DimensionAuditEntry["status"] = reasons.length === 0 ? "matched" : incomplete ? "incomplete" : "needs-review";
    entries.push({ dimensionKey, status, comparison, fieldDifferenceM, toleranceRatio, reasons });
  }

  const matched = entries.filter(entry => entry.status === "matched").length;
  const needsReview = entries.filter(entry => entry.status === "needs-review").length;
  const incomplete = entries.filter(entry => entry.status === "incomplete").length;
  const blockedDimensionKeys = entries.filter(entry => entry.status !== "matched").map(entry => entry.dimensionKey);
  return {
    entries, matched, needsReview, incomplete, blockedDimensionKeys,
    canApproveDependentQuantities: entries.length > 0 && blockedDimensionKeys.length === 0
  };
}
