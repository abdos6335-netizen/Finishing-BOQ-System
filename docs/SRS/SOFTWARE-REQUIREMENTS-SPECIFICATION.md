# Software Requirements Specification (SRS)
## Finishing BOQ & Cost Estimation System

**Version:** 1.0 (Draft for architecture phase)  
**Date:** 12 November 2026  
**Status:** Draft — awaiting review and gating

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the
Finishing BOQ & Cost Estimation System. It is the source of truth for design,
development, and acceptance testing.

### 1.2 Scope
The system provides:
- Importing architectural drawings (DXF, PDF, images) and extracting dimensions.
- Room understanding, boundaries, and key measurements.
- Deterministic quantity calculation (Room by Room, Element by Element).
- Dual verification for independent check of results.
- Bill of Quantities (BOQ) with codes, unit costs, and export.
- Cost estimation, scheduling, productivity, and reporting.

The initial scope is residential finishing works; full scope for commercial is
future work. DWG/RVT is **not** guaranteed in v1; DXF, PDF, and images are first.

### 1.3 Definitions

| Term | Meaning |
|------|---------|
| BOQ | Bill of Quantities — a structured list of items with codes and unit costs |
| Deterministic engine | Calculation engine that always gives the same output for the same input |
| Dual verification | Independent recalculation path to detect errors |
| Net / Gross / Waste | Quantity-level definitions used in every calculation |
| Trust | A numeric indicator of the confidence in a result based on source and verification |
| OT | Outstanding or corrected item pending an engineer decision |

---

## 2. Overall Architecture

The system is separated into layers mounted on Desktop (Tauri) + Web.

```
┌───────────────────────────────┐  ┌───────────────────────────────┐
│  Presentation (Web + Desktop) │  │  App (Project, BOQ, Cost)     │
│  React + TypeScript (Tauri)   │  │  FastAPI services               │
└───────────────┬───────────────┘  └───────────────┬───────────────┘
                │                                      │
┌───────────────┴───────────────┐  ┌───────────────┴───────────────┐
│   Engineering Core (Python)   │  │   Drawing Engine                │
│  Geometry · Quantity · Verify │  │  CAD (DXF/PDF) · OCR · BIM    │
└───────────────┬───────────────┘  └───────────────┬───────────────┘
                │                                      │
┌───────────────┴───────────────┐  ┌───────────────┴───────────────┐
│   Data & Sync (SQLite + PgSQL) │                         Sync/Backup│
└───────────────────────────────┘  └───────────────────────────────┘
```

### Architecture constraints and pending decisions

The logical separation and engineering principles are requirements. Concrete technology selections are tracked in [the Architecture Decision Register](../ARCHITECTURE/ARCHITECTURE-DECISION-REGISTER.md) and are not frozen in this draft.

Confirmed constraints:
- A deterministic engineering core must be independent from AI and UI.
- Primary calculation and independent verification must be separately designed.
- Desktop and web clients must use the same versioned calculation contract.
- Critical workflows must be offline-capable; local and remote persistence must reconcile safely.
- DXF/PDF/image support and any DWG support must be validated against representative files and licensing.
- Synchronization must detect conflicts and preserve both versions; silent last-write-wins is not acceptable for engineering or financial records.

Desktop shell, web framework, API framework, local/browser/cloud database, sync technology, OCR/AI providers, and deployment topology remain subject to architecture evaluation.

---

## 3. Functional Requirements

### 3.1 Project & Building Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Create and manage projects (name, code, location, type, state) | Must |
| FR-02 | Create and manage buildings within a project | Must |
| FR-03 | Define user roles and permissions | Must |
| FR-04 | Store project metadata and audit trail | Must |
| FR-05 | Define units and default assumptions per project | Should |

### 3.2 Drawing Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-06 | Import drawings (DXF, PDF, images) | Must |
| FR-07 | Version drawings with rollback and history | Must |
| FR-08 | Classify drawings (plan, section, elevation, RCP, etc.) | Should |
| FR-09 | Link drawings to the drawing set and order | Should |
| FR-10 | Detect and flag version conflicts | Must |

### 3.3 Drawing Interpretation & Measurement

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-11 | Extract text and dimensions from drawings | Must |
| FR-12 | Identify characters and notes | Must |
| FR-13 | Propose room boundaries and interior zones | Should |
| FR-14 | Identify openings (doors, windows) and estimate their dimensions | Must |
| FR-15 | Highlight mismatches between extracted and written dimensions | Must |
| FR-16 | Allow manual correction of extracted data | Must |
| FR-17 | Detect changes in size or scale between drawings | Must |

### 3.4 Deterministic Quantity Calculation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-18 | Calculate floor area (net, gross, with variation) | Must |
| FR-19 | Calculate wall area (gross, opening deduction, waste) | Must |
| FR-20 | Calculate ceiling area and soffit | Must |
| FR-21 | Calculate volumes for volumes | Should |
| FR-22 | Apply waste and deduction percentages | Must |
| FR-23 | Convert and check units consistently | Must |
| FR-24 | Mark results as Verified, Tentative, or Need review | Must |
| FR-25 | Support recurring units (e.g., unit per room) | Must |

### 3.5 Independent Verification

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-26 | Run independent recalculation of all quantities | Must |
| FR-27 | Flag discrepancies between independent and primary path | Must |
| FR-28 | Show source, formula, and reviewer history for each result | Must |
| FR-29 | Allow results to be marked as approved/confirmed | Must |

### 3.6 BOQ & Cost Estimation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | Create BOQ items with code, description, unit, quantity, unit price | Must |
| FR-31 | Support material, labor, overhead, profit, contingency | Must |
| FR-32 | Export BOQ to Excel, PDF, Word | Must |
| FR-33 | Generate two versions: internal BOQ and client BOQ | Must |
| FR-34 | Assign suppliers/prices to items | Should |
| FR-35 | Estimate duration and productivity | Must |

### 3.7 Schedule & Productivity

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-36 | Define phases and activities | Must |
| FR-37 | Estimate durations and end dates | Must |
| FR-38 | Manage dependencies and sequence | Must |
| FR-39 | Track progress and report against baseline | Should |

### 3.8 Reporting & Exports

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | Generate technical report with quantities | Must |
| FR-41 | Export BOQ to Excel, PDF, Word | Must |
| FR-42 | Export drawings as annotated images/PDF | Should |
| FR-43 | Print friendly reports | Should |

### 3.9 Backup & Synchronization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-44 | Periodic local backups | Must |
| FR-45 | Sync local changes with cloud | Must |
| FR-46 | Allow restoring previous versions | Must |
| FR-47 | Detect and resolve conflicts | Must |

### 3.10 Users & Settings

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-48 | Multi-user support with role-based permissions | Must |
| FR-49 | Language and RTL/LTR support | Must |
| FR-50 | Audit log of all changes | Must |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement | Target |
|-------------|--------|
| Open a project with up to 50 drawings | < 1s |
| Calculate a typical 10-room apartment | < 3s |
| Handle 200 drawings without timeout | < 15s |
| Export Excel BOQ | < 5s |

### 4.2 Reliability

- All calculation results must be deterministic (same input → same output).
- The system must not silently accept unverified results.
- Error boundaries: any failure must be clearly reported.

### 4.3 Usability

- Interface in Arabic and English.
- RTL layout for Arabic; LTR for English.
- Clean, professional, efficient for daily estimation work.

### 4.4 Security

- Data encrypted at rest and in transit.
- Role-based access control.
- Audit trail for all changes.
- No credentials stored in the repository.

### 4.5 Compatibility

- Windows 10/11 (Desktop).
- Modern browsers (Web).
- Python 3.11+; Node 20+.

---

## 5. Acceptance Criteria

### 5.1 Geometry and Units

**TC-GE-01** | Rectangle 5.0 × 4.0 m → area = 20.0 m² (tolerance ±0.01)
**TC-GE-02** | Rectangle 5.0 × 4.0 m → perimeter = 18.0 m (tolerance ±0.01)
**TC-GE-03** | One wall face 10.0 × 3.0 m with one applicable opening 2.0 × 0.9 m → gross = 30.0 m²; deduction = 1.8 m²; net = 28.2 m²
**TC-GE-04** | Floor area with a 2.0 m² variation zone → net = total − variation

### 5.2 Openings & Deductions

**TC-OPEN-01** | Door 2.0 × 0.9 m → deduction = 1.8 m²
**TC-OPEN-02** | Window 1.5 × 1.5 m → deduction = 2.25 m²
**TC-OPEN-03** | Neglecting opening in the presence of area means test fails

### 5.3 Units & Conversion

**TC-UNIT-01** | 5000 mm = 500 cm = 5.0 m (tolerance ±0.001)
**TC-UNIT-02** | 3/4 inch = 19.05 mm (tolerance ±0.05 mm)

### 5.4 Independent Verification

**TC-VF-01** | Sum of wall gross areas = sum of openings + net (recalculation matches)
**TC-VF-02** | A deduction exceeding bounds flags as "Need review"

### 5.5 Drawings

**TC-DWG-01** | Open a DXF drawing and extract text + numeric values
**TC-DWG-02** | Scale calibration: when scale is 1:100, a 1.0 m line is 10.0 m when extrapolated (or handle scale rule)
**TC-DWG-03** | Two versions of a drawing with different measurements → flagged as conflict

### 5.6 BOQ & Cost

**TC-BOQ-01** | Sum of item totals = grand total (math check)
**TC-BOQ-02** | Unique item codes, no duplicates
**TC-BOQ-03** | Internal BOQ and client BOQ differ only in allowed fields

### 5.7 Sync & Backup

**TC-SC-01** | Edit in two places → no data loss, last-write decision option
**TC-DAT-01** | Restore previous version of a project → data intact

---

## 6. Document Management

- The SRS is living; versioned as the project evolves.
- Any change requires a review and, where required, user sign-off.
- Changes to acceptance tests require re-testing of affected areas.

---

*Last updated: 12 November 2026*
