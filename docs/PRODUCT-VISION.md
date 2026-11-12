# Product Vision — Finishing BOQ & Cost Estimation System

## 1. Statement of the Product

The Finishing BOQ & Cost Estimation System is a **deterministic quantity surveying and estimating** application for residential finishing works (apartments and villas).

It converts architectural drawings (DXF/PDF/images) into **Room by Room, Element by Element** quantities — walls, floors, ceilings, openings, electrical, sanitary, and HVAC — then builds a **Bill of Quantities (BOQ)** with unit costs, labor, overhead, contingency, profit, and client- and internal-facing exports.

## 2. Core Principles

- **Deterministic engineering calculation engine independent from AI.** Quantities and BOQ calculations are computed by a verified engine, not inferred by a language model.
- **Independent quantity verification.** A separate verification path re-derives results and flags discrepancies.
- **Full traceability.** Every result carries source, formula, assumption, and approval state.
- **Revision-controlled BOQs and audit history.** Versioned report, exports, and an audit log.
- **Offline-first with secure synchronization.** Works without a network; syncs when available with conflict resolution.
- **Arabic and English interface (RTL/LTR).**
- **No automatic approval of uncertain engineering or financial data.**

## 3. Target Users

| Role | Needs |
|------|-------|
| Estimator / Quantity Surveyor | Fast, accurate groundwork; auditable BOQ; export to Excel/PDF/Word |
| Project Manager | Quantity tracking, scheduling, cost control, revision history |
| Client | Clear, professional BOQ presentation without internal cost detail |
| Engineer | Independent validation; discrepancies flagged for decision |

## 4. Core Capabilities (v1)

1. **Project & drawing management** — create projects, upload and version drawings, classify types, extract dimensions.
2. **Room understanding & boundaries** — propose room boundaries from drawings; allow manual confirmation.
3. **Deterministic quantity calculation** — walls, floors, ceilings, openings, doors, electrical, sanitary, HVAC.
4. **Dual verification engine** — independent recalculation and discrepancy detection.
5. **BOQ & cost estimation** — items, codes, unit costs, contingencies, profit, export to Excel/PDF/Word.
6. **Scheduling & productivity** — durations, labor, dependencies, and risk.
7. **Reporting and exports** — technical report, Excel, PDF, Word.
8. **Offline-first sync** — local-first operation with encrypted, conflict-aware synchronization.

## 5. Users and Interfaces

- Primary: desktop (Windows) with Web companion sharing the same data model.
- Interface: bilingual (Arabic/English), RTL/LTR aware, clean and efficient design.

## 6. Constraints

- DWG/RVT support is **not** guaranteed; initial scope targets **DXF, PDF, and images**.
- Cost data for unit prices is curated by the user; non-auto-approval is required.
- Electrical, sanitary, and HVAC scopes require adequate data before auto-estimation.

## 7. Status

- Requirements and architecture are drafted.
- Portfolio of engineering rules and testing strategy is drafted.
- Repository is being established; documentation is committed incrementally.

---

*Last reviewed: 12 November 2026*
