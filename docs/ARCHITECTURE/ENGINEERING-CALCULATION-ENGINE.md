# Deterministic Quantity Calculation Engine

**Version:** 1.1 Draft — engineering review required  
**Last reviewed:** 12 November 2026

## 1. Purpose

Define the calculation contract for geometry and finishing quantities. This document is a design baseline, not a claim that an engine has already been implemented.

## 2. Non-negotiable principles

1. Same normalized inputs, rule version, and calculation settings produce the same output.
2. AI may extract or propose source data; only deterministic, versioned rules calculate quantities.
3. Every result retains source evidence, input values, units, formula/rule version, assumptions, deductions, additions, waste basis, verification result, and approval state.
4. No unsupported standard, waste percentage, deduction threshold, or routing allowance is silently applied.
5. The primary calculation and independent verification paths must be separately designed.
6. Invalid, incomplete, or conflicting inputs are not silently converted into approved quantities.

## 3. Result terminology

| Term | Definition |
|---|---|
| Gross | Measured quantity before the explicitly applicable deductions |
| Deduction | A documented subtraction with reason and source |
| Addition | A documented addition with reason and source |
| Net | Gross minus deductions plus additions |
| Waste | Procurement/process allowance calculated only from an approved basis |
| Order quantity | Quantity used for procurement after applying the approved waste/rounding/packaging rule |
| Verified | Primary and independent paths agree within a defined, rule-specific tolerance and inputs have acceptable evidence |
| Tentative | Calculation is possible but one or more inputs/rules are not confirmed |
| Needs Review | Conflict, missing critical data, out-of-bounds geometry, or verification discrepancy exists |
| Invalid | Input violates a hard validation rule and no quantity is issued |

## 4. Units and numeric handling

Canonical units: length m, area m², volume m³, count pcs, mass kg. Preserve original units and source values alongside normalized values.

Conversions:
- mm to m: divide by 1000.
- cm to m: divide by 100.
- inch to mm: multiply by 25.4.
- ft to m: multiply by 0.3048.

Use decimal-safe arithmetic for monetary values. Geometry calculations must document numeric precision and tolerances; do not round intermediate values unless the rule explicitly requires it. Store both raw and displayed precision.

## 5. Geometry and quantity rules

### 5.1 Rectangular surface
For a rectangle with perpendicular sides L and W:
`A = L × W`
Validate dimensions are finite and positive. For non-rectangular surfaces, calculate the polygon area from ordered, validated vertices; reject self-intersecting or degenerate polygons unless a supported repair workflow is explicitly approved.

### 5.2 Wall faces
For each distinct wall face:
`GrossFaceArea = FaceLength × FaceHeight`
`GrossWallArea = Σ(GrossFaceArea)`

Do not multiply by a generic face count unless the input explicitly defines the number of independently measured faces. Opposite faces may differ in openings, finishes, height, or geometry and must be represented separately.

### 5.3 Openings
For a rectangular opening:
`OpeningArea = Width × Height`
For repeated identical openings:
`TotalOpeningArea = Count × Width × Height`

Deduct an opening only from the surface/item to which that opening physically applies. Keep the opening identity, dimensions, count, source, and deduction target. Do not apply a universal deduction threshold unless a named measurement standard or contract rule is selected and recorded.

### 5.4 Floor area
For a valid floor polygon, calculate its plan area. Split areas into distinct zones when finishes, levels, materials, or scope differ. Voids/openings are represented as explicit polygons and deducted only where applicable. Variation zones remain separately identified and are included/excluded according to their approved scope status.

### 5.5 Ceiling area
Ceiling area must come from the ceiling geometry or an explicitly approved derivation from the corresponding floor/room geometry. It is not universally equal to floor area. Bulkheads, drops, coves, soffits, slopes, voids, and stepped ceilings require separate geometric components. A leakage/perimeter allowance is not added to area by default.

### 5.6 Net, waste, and order quantity
`Net = Gross − Σ(ApprovedDeductions) + Σ(ApprovedAdditions)`
`Waste = Net × ApprovedWasteRate`
`OrderQuantity = ApplyApprovedPackagingAndRounding(Net + Waste)`

If no approved waste rate exists, return net quantity and mark procurement quantity as not determined. Do not use generic default waste percentages. Negative net, deductions exceeding their applicable gross, or additions without evidence must be flagged.

## 6. MEP quantities

Electrical, plumbing, drainage, and HVAC quantities require system-specific design inputs. Point counts may be counted from an approved drawing or verified schedule. Cable, conduit, pipe, duct, insulation, and accessory lengths/areas must be measured from routes, dimensions, and system details. Room area alone is not sufficient to determine circuit count, pipe routes, duct sizes, or equipment quantities. Missing design information results in Needs Review/Tentative, not an invented takeoff.

## 7. Cost calculation boundary

Quantities and prices are separate domains. A quantity result does not contain markup.

Recommended cost ledger:
- Direct materials.
- Direct labor.
- Direct equipment/plant.
- Direct transport or other explicitly classified direct cost.
- Indirect/project overhead.
- Engineer/professional fees.
- Contingency/risk allowance.
- Profit/markup.
- Applicable taxes and statutory charges, if in scope.

Each percentage or fixed amount must define its calculation base and order. Do not calculate profit on a total that already includes profit. Do not add the same administrative/overhead cost in more than one category. Cost rules require an approved commercial policy before implementation.

## 8. Verification contract

The verification path must independently reconstruct expected quantities from source inputs and rule metadata. It must not merely invoke the primary calculation implementation with the same arguments.

Verification checks include:
- Unit normalization and dimensional consistency.
- Polygon validity and area bounds.
- Opening-to-face association and deduction bounds.
- Reconciliation: Net = Gross − Deductions + Additions.
- Waste and order quantity basis.
- Primary-vs-independent result difference against a rule-specific tolerance.
- Completeness and provenance of inputs.

A discrepancy or missing critical evidence changes the result state to Needs Review. Approval is a separate, audited human action.

## 9. Minimum deterministic test vectors

| ID | Inputs | Expected |
|---|---|---|
| GE-01 | Rectangle 5 m × 4 m | 20 m² |
| GE-02 | Rectangle 5 m × 4 m | Perimeter 18 m |
| WALL-01 | One face 10 m × 3 m | Gross 30 m² |
| OPEN-01 | One rectangular opening 2 m × 0.9 m | 1.8 m² |
| WALL-02 | Gross 30 m², applicable opening 1.8 m² | Net 28.2 m² |
| UNIT-01 | 5000 mm | 5 m |
| UNIT-02 | 3/4 inch | 19.05 mm |
| NET-01 | Gross 20, deduction 2, addition 1 | Net 19 |
| WASTE-01 | Net 20, explicitly approved rate 5% | Waste 1; pre-packaging order 21 |

These are arithmetic fixtures, not evidence of an adopted measurement standard. Production rule tolerances and rounding must be defined per rule.

## 10. Non-goals

- AI-generated quantities without source evidence and deterministic validation.
- Unreferenced industry defaults.
- Automatic engineering approval.
- Claiming DWG/BIM support before format and licensing validation.
