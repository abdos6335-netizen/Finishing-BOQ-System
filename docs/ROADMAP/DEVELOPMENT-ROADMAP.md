# Development Roadmap — Finishing BOQ & Cost Estimation System

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Overview

| Stage | Goal | Status |
|-------|------|--------|
| 0 | Requirements & Architecture | 🚧 Audit in progress |
| 1 | Project Foundation & Database | ⏳ Blocked by Phase 1 exit gate |
| 2 | Project & Drawing Management | ⏳ Planned |
| 3 | Drawing Interpretation & Measurement | ⏳ |
| 4 | Deterministic Quantity Engine | ⏳ |
| 5 | Independent Verification | ⏳ |
| 6 | Materials & BOQ | ⏳ |
| 7 | Cost Estimation | ⏳ |
| 8 | Scheduling & Productivity | ⏳ |
| 9 | Reports & Exports | ⏳ |
| 10 | AI Assistance | ⏳ |
| 11 | Offline Sync & Backups | ⏳ |
| 12 | Internal QA & Release | ⏳ |
| 13 | User Acceptance Testing | ⏳ |

## 2. Stage Detail

The stage numbering below is a work breakdown, not a claim that earlier stages are complete. The consolidated delivery gates are defined in [FOUR-PHASE-EXECUTION-PLAN.md](FOUR-PHASE-EXECUTION-PLAN.md). The repository currently has no application source or executable test suite.

| Stage | Goal | Key Tasks | Output | Test |
|-------|------|-----------|--------|------|
| 0 | Requirements & Architecture | Spec, architecture, data design | SRS, ARCH, DB | Gates |
| 1 | Foundation & DB | Repo, tools, schema, engine skeleton | Repo, DB, engine API | Unit tests |
| 2 | Project & Drawing Management | Projects, buildings, drawings, versions | CRU modules | Unit+integration |
| 3 | Drawing Interpretation | Import, classify, extract dimensions | Drawing pipeline | Data tests |
| 4 | Quantity Engine | All quantity rules | Engine | Calc tests |
| 5 | Independent Verification | Verify engine, metadata | Verify module | Verify tests |
| 6 | Materials & BOQ | BOQ items, exports | BOQ | BOQ tests |
| 7 | Cost Estimation | Cost rules, profit, client/internal | Cost module | Cost tests |
| 8 | Scheduling | Schedule, productivity, risks | Schedule module | Schedule tests |
| 9 | Reports & Exports | Excel/PDF/Word, annotated | Exports | Export tests |
| 10 | AI Assistance | OCR, suggestions | AI module | AI tests |
| 11 | Offline Sync & Backup | Sync, backups, restore | Sync/Backup | Sync tests |
| 12 | Internal QA & Release | QA, stable release | Release | QA tests |
| 13 | User Acceptance Testing | UAT, improvements | Versions | UAT |

---

*Last updated: 12 November 2026*
