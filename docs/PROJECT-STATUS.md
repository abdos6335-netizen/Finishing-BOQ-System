# Finishing BOQ & Cost Estimation System — Project Status

**Current status:** Phase 1 — technical audit and requirements baseline  
**Current version:** 0.1.0-preparation  
**Default branch:** main  
**Active planning branch:** implementation/four-phase-roadmap

## Verified repository state

The repository currently contains documentation and configuration files. There is no runnable application source, production engineering engine, database migration set, or executable automated test suite yet.

The four-phase plan is documented in [FOUR-PHASE-EXECUTION-PLAN.md](ROADMAP/FOUR-PHASE-EXECUTION-PLAN.md).

## Objective

Build a professional quantity surveying and cost estimation application for residential finishing projects, including apartments and villas.

## Core principles

- Deterministic engineering calculations independent from AI.
- An independently designed verification path.
- Traceability of drawing evidence, dimensions, formulas, assumptions, rule versions, and approvals.
- Revision-controlled drawings and BOQs with audit history.
- Offline-capable operation with explicit and recoverable synchronization.
- Arabic and English interface with RTL/LTR.
- No automatic approval of uncertain engineering or financial data.
- Internal tests before user acceptance testing.

## Four delivery phases

1. **Technical audit and engineering baseline:** reconcile documents, correct unsupported rules, freeze scope, and record architecture decisions.
2. **Application foundation and data lifecycle:** application shell, project/drawing management, persistence, audit, backup, and sync design.
3. **Drawing intelligence and engineering core:** drawing extraction, dimension comparison, deterministic quantities, and independent verification.
4. **BOQ, costing, productivity, reporting, hardening, and first release.**

## Current work

- Consolidating the four-phase plan.
- Auditing formulas and removing unsupported default assumptions.
- Recording technology choices and unresolved decisions.
- Defining a practical foundation backlog and internal test gates.

## Important rules

- Planning is not implementation.
- A phase is complete only after implementation evidence and verification.
- No private client drawings, project information, credentials, API keys, or secrets may be committed to this public repository.
- Synthetic test data must be labeled and kept separate from verified drawing data.
- The user is not asked to perform acceptance testing until a usable release candidate exists.

## Reference test project

Kitchen + Laundry is the initial reference scope. Any synthetic dimensions must be explicitly labeled as synthetic and must never be represented as measurements from an actual drawing.

## Known blockers

- Final desktop/web architecture and packaging model are not yet selected.
- Data synchronization and conflict semantics require a detailed design before multi-device editing is enabled.
- Engineering standards, waste factors, and productivity rates require sources or project-specific approval.
- No application code or executable tests exist yet.
