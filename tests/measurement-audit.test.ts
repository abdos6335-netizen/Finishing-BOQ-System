import { describe, expect, it } from "vitest";
import {
  compareWrittenAndExtractedDimensions,
  toMetres,
  type DimensionObservation
} from "../src/domain/measurement-audit";

const written: DimensionObservation = {
  id: "dim-text-1", dimensionKey: "kitchen.clear-width", value: 4200,
  unit: "mm", source: "dimension-text", sourceRef: "sheet-A1#dimension-12"
};
const extracted: DimensionObservation = {
  id: "extract-1", dimensionKey: "kitchen.clear-width", value: 4.18,
  unit: "m", source: "drawing-extraction", sourceRef: "sheet-A1#geometry-88",
  confidence: 0.96, processingDurationMs: 1250
};

describe("measurement provenance and comparison", () => {
  it("normalizes supported units to metres", () => {
    expect(toMetres(420, "cm")).toBe(4.2);
  });
  it("compares written and extracted dimensions using an explicit tolerance", () => {
    const result = compareWrittenAndExtractedDimensions(written, extracted, 0.03);
    expect(result.status).toBe("matched");
    expect(result.absoluteDifferenceM).toBeCloseTo(0.02);
    expect(result.observations[0].sourceRef).toContain("sheet-A1");
  });
  it("flags a mismatch outside the supplied tolerance", () => {
    const result = compareWrittenAndExtractedDimensions(written, extracted, 0.01);
    expect(result.status).toBe("needs-review");
  });
  it("does not silently assume a tolerance", () => {
    expect(() => compareWrittenAndExtractedDimensions(
      written, extracted, Number.NaN
    )).toThrow(/explicit finite non-negative tolerance/);
  });
  it("rejects observations with invalid confidence", () => {
    expect(() => compareWrittenAndExtractedDimensions(
      written, { ...extracted, confidence: 1.2 }, 0.03
    )).toThrow(/Confidence must be between 0 and 1/);
  });
  it("rejects mismatched dimension keys", () => {
    expect(() => compareWrittenAndExtractedDimensions(
      written, { ...extracted, dimensionKey: "bedroom.width" }, 0.03
    )).toThrow(/same dimension key/);
  });
  it("requires the expected source roles", () => {
    expect(() => compareWrittenAndExtractedDimensions(
      { ...written, source: "field-measurement" }, extracted, 0.03
    )).toThrow(/written dimension text/);
  });
});
