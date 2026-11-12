# Deterministic Quantity Calculation Engine

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

This document specifies the **rules, equations, and verification** of the deterministic quantity calculation engine. It is the foundation for all quantity computations in the system.

## 2. Core Principles

1. **Deterministic** — same input → same output.
2. **Documented per rule** — inputs, units, equation, assumptions, check, edge cases, and test cases.
3. **No invented rules** — any rule is sourced from drawing, standard, or explicit user data.
4. **Given or Assumed** — every quantity must have an explicit source and, where assumed, a noted assumption.
5. **No auto-acceptance** — results below the verification threshold are flagged for human decision.

## 3. Terminology

| Term | Meaning |
|------|---------|
| Net | Quantity after deductions |
| Gross | Quantity before deductions |
| Waste | Extra quantity to account for losses (mud, cutting loss, etc.) |
| Input dimension | A dimension read from a drawing or explicitly entered |
| Output | The value produced by the rule |
| Rule | A single formula/calculation |

## 4. Notation

- Lengths: meters (m) or millimeters (mm), always converted to a canonical form.
- Areas: m².
- Volumes: m³.
- Counts: number (pcs, pieces).
- Weights: kg, ton.

Unit conversion table (selected):
| From | To | Factor |
|------|-----|--------|
| mm | m | /1000 |
| cm | m | /100 |
| inch | mm | *25.4 |
| ft | m | *0.3048 |

## 5. Rules

### 5.1 Geometry (Area & Length)

#### Wall Area
- Input: wall length (L), height (H), opening list (width, height, type).
- Formula: `gross = L × H`; `net = gross − Σ(openings dimensions)`.
- Units: m.
- Assumption: vertical wall, no floor-to-ceiling adjustment.
- Correction: if openings > 15% (relative to gross) then flag for check.
- Check: `net >= 0`.
- Test: L=10, H=3 → gross=30; subtract door 2×0.9 → 27.3 m².

#### Floor Area
- Input: polygon corner points, openings (none).
- Formula: `area = Σ(triangular decomposition of polygon)`.
- Units: m².
- Assumption: floor plan is rectilinear or polygon.
- Correction: when it is a variation zone, do not include in main area.
- Check: area >= 0.
- Test: square 5×4 → 20 m².

#### Ceiling
- Input: ceiling plan area, moisture path.
- Formula: `area = floor area + leakage;`
- Assumption: ceiling follows the floor plan.
- Correction: The soffit (exposed grating) is calculated in a separate rule.
- Check: area >= 0.

#### Volumes
- Input: wall lengths, heights, widths.
- Formula: `volume = Σ(length × height × width)`.
- Units: m³.
- Use only when explicitly required.

### 5.2 Openings, Deduction and Addition

- Opening: a window/door that is subtracted from the wall or ceiling area.
- Deduction: any cut from the net quantity (opening, furniture, and a permanent structure).
- Addition: an extra quantity added after review (e.g., extra padding, a repair).
- Rule: Deduction ≤ gross (a deduction larger than the gross is invalid → flag "needs review").

### 5.3 Quantities (Waste, Bulk, Net)

For each item:

```
Gross  = sum of raw quantities (before deductions)
Net    = Gross − (deductions) + (additions)
Waste  = Net × (waste %)
Bulk   = Net + Waste
```

- Waste %: defaults to a standard (e.g., 5% for masonry, 10% for plastering, 3% for tiling).
- When the waste % is not provided, the rule uses the default from the library of the item.
- The rule runs a check: `Bulk >= Net` and `Waste >= 0`.

### 5.4 Units & Conversions

Every rule defines units; the engine converts to canonical units:
- All lengths → m.
- All areas → m².
- All volumes → m³.
- Counts → number.
- Weights → kg.

Conversion factors:
- 1 mm = 0.001 m
- 1 cm = 0.01 m
- 1 inch = 25.4 mm
- 1 ft = 0.3048 m

### 5.5 Recurring Units & Roles

When the same quantity occurs repeatedly:
- Example: number of tiles = floor area / tile area.
- The rule stores the formula and applies it to each element.

### 5.6 Electrical, Sanitary, HVAC Estimations

These are **derived estimates** that require adequate source data:
- Electrical: circuits, points, cable lengths (from drawings, initially estimated by rule).
- Sanitary: pipe runs, connection points (by the rule of the drawing, not only by AI).
- HVAC: ductwork, pipes, insulation (by the rule of the drawing).

Rules exist for each; until there is sufficient data, results are labeled "Tentative".

## 6. Engineering Cost Calculation

### 6.1 Unit Price

```
unit_price = (material + labor + equipment + transport) × (1 + overhead) + profit
material_cost = quantity × unit_material_price
labor_cost = quantity × unit_labor_price
total_item = quantity × (material_unit_price + labor_unit_price + ...)
```

### 6.2 Cost Report

```
Direct Cost   = Σ(items)
Indirect      = Direct × (indirect %)
Admin         = Direct × (admin %)
Risk          = Direct × (risk %)  [optional]
Total         = Direct + Indirect + Admin + Profit
Profit        = Total × (profit %)
Client_price  = Total + Profit
```

---

## 7. Verification & Test Cases

| Test | Rule | Expected |
|------|------|----------|
| TC-GE-01 | Area of square 5×4 | 20 m² |
| TC-GE-02 | Wall area with opening 2×0.9 | Net = gross − 1.8 |
| TC-OPEN-01 | Deduction = opening area | Equals opening area |
| TC-UNIT-01 | mm → m conversion | Correct |
| TC-WASTE-01 | Waste = Net × %. Check Bulk >= Net | Pass |
| TC-VF-01 | Sum of net = (sum gross) − (sum deduction) + (sum addition) | Correct |

---

## 8. Non-goals

- AI will not produce the final amount without calibration.
- We will not include architectural standards without checking the source data.

---

*Last updated: 12 November 2026*
