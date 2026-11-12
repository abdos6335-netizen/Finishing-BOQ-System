# Quantity Surveying Rules

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Standard values and formulas for quantities in finishing works. Each rule has:
- Inputs
- Units
- Formula
- Assumptions
- Validation / checks
- Edge cases
- Test cases

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| Net | Quantity after deductions |
| Gross | Quantity before deductions |
| Waste | Extra % added to cover losses |
| Addition | Extra quantity added by the user after review |
| Input | A value read from drawing or user |
| Out | Value calculated by the rule |

## 3. Base Definitions

| Term | Value |
|------|-------|
| Length unit | m |
| Area unit | m² |
| Volume unit | m³ |
| Count unit | pcs / pieces |
| Weight unit | kg |

## 4. Rules

### 4.1 Rectangular Area (from length × width)
- **Input:** length, width, unit
- **Formula:** `area = length × width`
- **Assumption:** rectangular, orthogonal dimensions
- **Check:** area >= 0
- **Edge cases:** 0 or negative length → flag "invalid input"

### 4.2 Rectangular Wall Area (length × height × number of faces)
- **Input:** length, height, faces, openings (width, height)
- **Formula:** `gross = length × height × faces`
- **Deduction:** `Σ(openings area)`

### 4.3 Floor Area (net, gross, variation)
- **Input:** polygon corners, openings (other floors), variation zones
- **Formula:** `gross = Σ(area of polygon)`
- **Net = floor area after by floor deduction**

### 4.4 Ceiling Area
- **Input:** ceiling plan area, leakage path
- **Formula:** `area = floor plan area + leakage`
- **Assumption:** ceiling follows floor plan

### 4.5 Opening (Door / Window)
- **Input:** number, width, height, type
- **Formula:** `area = number × width × height`
- **Deduction:** from net area

### 4.6 Waste, Net, Gross
- **Formula:** `waste = net × waste%`, `bulk = net + waste`
- **Usable values:** waste% default: 5% (brick), 10% (plaster), 3% (tile)

### 5.7 Unit Conversion
- mm → m: /1000
- cm → m: /100
- inch → mm: *25.4

### 6.8 Recurring
- When an item repeats in the same room, multiply the unit rate by count.

---

## 7. Test Cases

| Test | Inputs | Expected |
|------|--------|----------|
| Area Rect | L=5, W=4 | 20 m² |
| Wall Deduction | L=10, H=3, door 2×0.9 | Net = 27.3 |
| Waste | Net=20, waste=5% | Waste=1, bulk=21 |
| Unit | mm | Convert to m |

---

## 8. Notes

- No rules are invented arbitrarily: each rule must have a clear source.
- If there is insufficient data, the result is "Tentative" until confirmed.
- All rules must be tested before they are used in production.

---

*Last updated: 12 November 2026*
