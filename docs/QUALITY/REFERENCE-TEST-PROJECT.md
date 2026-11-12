# Reference Test Project — Kitchen + Laundry

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Kitchen + Laundry is the first reference project for testing the system. Scope: **kitchen and laundry only**.

## 2. Scope

- Room boundaries from the drawing (or synthetic data).
- Floor, walls, ceiling quantities.
- Variations and openings.
- Materials and related items.
- BOQ and verification.

## 3. Data

Two fixture classes must remain separate:

- **Verified Drawing Data:** dimensions and geometry extracted from an authorized, traceable drawing with sheet/revision references and review status.
- **Synthetic Test Data:** deliberately constructed inputs used only to test deterministic arithmetic and software behavior. Synthetic values are never presented as measurements from a real project or as engineering standards.

| Fixture field | Synthetic fixture value | Status |
|---|---:|---|
| Room scope | Kitchen + Laundry | Synthetic fixture label |
| Kitchen floor area | 12 m² | Synthetic; not drawing-derived |
| Laundry floor area | 8 m² | Synthetic; not drawing-derived |
| Wall height | 2.8 m | Synthetic; not drawing-derived |
| Door size | 2.0 × 0.9 m | Synthetic; not drawing-derived |
| Variation zone | 1.5 m² | Synthetic; not drawing-derived |
| Material rates | Not specified | Must not be invented |

---

*Last updated: 12 November 2026*
