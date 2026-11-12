# Quantity Surveying Rules

**Version:** 1.1 Draft — engineering review required  
**Last reviewed:** 12 November 2026

## 1. Rule record requirements

Every production rule must define:
- Unique rule ID and version.
- Scope and applicable measurement item.
- Required inputs and canonical units.
- Formula and calculation order.
- Source: drawing, contract/specification, named standard, manufacturer data, or explicit project approval.
- Assumptions and exclusions.
- Validation, tolerance, edge cases, and test vectors.
- Whether the result is Verified, Tentative, Needs Review, or Invalid.

No generic default is authoritative merely because it appears in a template.

## 2. Quantity definitions

| Term | Meaning |
|---|---|
| Gross | Quantity before applicable deductions |
| Deduction | Documented subtraction linked to its target item/surface |
| Addition | Documented addition with reason and approval |
| Net | Gross − deductions + additions |
| Waste | Approved procurement/process allowance |
| Order quantity | Net plus approved waste and packaging/rounding rules |

## 3. Base units

| Quantity | Canonical unit |
|---|---|
| Length | m |
| Area | m² |
| Volume | m³ |
| Count | pcs |
| Mass | kg |

Preserve source values and source units; never discard the original measurement when normalizing.

## 4. Geometry rules

### 4.1 Rectangular area
Input: perpendicular length L and width W in compatible units.  
Formula: `A = L × W`.  
Validation: finite positive dimensions; result in m².

### 4.2 Polygon area
Input: ordered vertices in a common calibrated coordinate system.  
Formula: polygon area using a documented algorithm (for example, the shoelace formula).  
Validation: at least three distinct vertices, non-zero area, no self-intersection, known coordinate scale. Ambiguous or invalid geometry requires review.

### 4.3 Wall faces
Calculate each face independently:
`GrossFaceArea = FaceLength × FaceHeight`
`GrossWallArea = Σ(GrossFaceArea)`

Do not assume opposite faces have identical dimensions or openings. A face is an explicit measurement entity with its own finish, height, and openings.

### 4.4 Openings and deductions
For a rectangular opening:
`OpeningArea = Count × Width × Height`

Deduct only from the associated surface and item. Keep each opening as a separate source-linked record. No universal minimum opening deduction threshold is defined here; apply a threshold only when a selected contract/measurement standard explicitly requires it.

### 4.5 Floor areas and zones
Calculate each valid floor polygon separately. Represent voids and openings as explicit geometry. Keep zones with different finish/scope/level separate. A variation zone must have a scope status and must not be silently mixed into the base quantity.

### 4.6 Ceiling areas
Use ceiling-plan geometry where available. Derive from floor geometry only when the ceiling is explicitly confirmed to follow that geometry. Drops, bulkheads, coves, soffits, slopes, steps, and voids require separate geometry. Do not add a generic leakage allowance.

## 5. Net, waste, and order quantity

`Net = Gross − ApprovedDeductions + ApprovedAdditions`

`Waste = Net × ApprovedWasteRate`

`OrderQuantity = ApplyApprovedPackagingAndRounding(Net + Waste)`

Waste rate must be tied to a source, supplier/installation method, contract requirement, or explicit project approval. If no approved rate exists, report Net and leave Waste/Order Quantity undetermined. Do not apply generic brick, plaster, or tile percentages by default.

## 6. Repeated items and assemblies

For a repeated item, quantity is the measured per-unit quantity multiplied by a verified count. Assemblies must preserve component-level quantities and avoid counting the same component both inside an assembly and as a separate BOQ item.

## 7. Validation and review states

- Invalid dimensions or units: Invalid.
- Missing scale or uncalibrated image geometry: Needs Review.
- Conflicting written and extracted dimensions: Needs Review until resolved.
- Unapproved assumptions or waste rates: Tentative.
- Independently reconciled result with adequate evidence: eligible for Verified.
- Human approval is recorded separately from calculation status.

## 8. Arithmetic test vectors

| Test | Inputs | Expected |
|---|---|---|
| QS-AREA-01 | 5 m × 4 m | 20 m² |
| QS-WALL-01 | One face 10 m × 3 m | 30 m² gross |
| QS-OPEN-01 | 2 m × 0.9 m opening | 1.8 m² |
| QS-NET-01 | Gross 30, deduction 1.8 | 28.2 m² |
| QS-NET-02 | Gross 20, deduction 2, addition 1 | 19 m² |
| QS-WASTE-01 | Net 20, explicitly approved rate 5% | Waste 1; pre-packaging order 21 |
| QS-UNIT-01 | 5000 mm | 5 m |

These are arithmetic fixtures only; they do not establish a contractual measurement method or industry allowance.

## 9. References and unresolved items

No national or international measurement standard is selected in this draft. Before a production rule cites a standard, record its exact title, edition, clause, jurisdiction, applicability, and any project/contract precedence. Where no authoritative source is available, require explicit project approval and label the rule accordingly.
