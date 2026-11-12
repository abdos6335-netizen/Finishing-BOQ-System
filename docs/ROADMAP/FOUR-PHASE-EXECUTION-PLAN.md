# Technical Work Plan
## Finishing BOQ & Cost Estimation System

**User-facing delivery model:** 3 stages  
**Technical work packages:** internal implementation sequence  
**Target platforms:** Windows Desktop + Web  
**Primary scope:** Residential finishing works (apartments and villas)

The user-facing delivery stages are:
1. Build the usable application.
2. Review code against requirements and engineering rules.
3. Publish a trial release after the review gates pass.

The technical work packages below are internal sequencing only; they do not add extra user-facing phases.

## Stage 1 — Build the usable application

### A. Foundation and data lifecycle
- Complete application shell, Arabic/English localization, RTL/LTR, responsive web and desktop UX.
- Implement project/client/building/floor/unit/room/zone/element hierarchy.
- Implement roles, permissions, audit history, and project settings.
- Replace browser-only foundation storage with durable local persistence and versioned migrations.
- Design and implement backup/restore and sync/conflict semantics before multi-device writes.
- Implement secure file handling; private project drawings remain outside this public source repository.

### B. Drawing intake and intelligence
- Support the approved v1 formats (initial candidates: DXF, PDF, images; DWG only after compatibility and licensing validation).
- Implement drawing sets, revisions, sheet classification, scale calibration, and source references.
- Extract text, dimensions, symbols, candidate geometry, and room boundaries with page/layer/coordinate traceability.
- Compare written dimensions with extracted dimensions and surface mismatches, confidence, and severity for review.
- Allow manual correction while preserving original extraction and edit history.
- AI may suggest interpretations; it must not silently approve dimensions or quantities.

### C. Deterministic engineering engine
- Implement validated geometry primitives and unit conversion.
- Calculate room-by-room and element-by-element floors, wall faces, ceilings, openings, deductions, additions, and supported finishing assemblies.
- Keep gross, net, waste, and order quantities separate.
- Apply waste only from a cited rule or explicit project input.
- Implement a separately designed verification path that does not merely call the primary calculation function again.
- Add electrical, plumbing, and HVAC takeoff only where sufficient design inputs exist; otherwise return Needs Review/Tentative.
- Maintain source, formula/rule version, assumptions, and review status for every result.

### D. BOQ, costing, productivity, and reports
- Implement item catalog, WBS, units, assemblies, materials, labor, equipment, and supplier prices.
- Generate separate internal and client BOQs with controlled cost visibility.
- Implement direct/indirect costs, transport, engineer fees, contingency, profit, and taxes where approved, without double counting.
- Implement additional works / variation orders linked to original revisions.
- Estimate productivity and duration using editable, sourced rates, crew sizes, calendars, dependencies, and readiness constraints.
- Generate Arabic/English Excel and PDF reports with formulas, source references, assumptions, and revision history.

## Stage 2 — Code and requirements review

- Map every functional and non-functional requirement to code, test evidence, and known limitations.
- Review engineering formulas, units, deductions, openings, tolerances, and edge cases.
- Run unit, property, regression, integration, UI, export, sync, backup/restore, security, and performance tests.
- Test independent verification using seeded calculation errors and independent hand checks.
- Verify offline behavior, conflict recovery, and data integrity.
- Fix all critical/high severity defects and repeat affected tests.
- Do not ask the user to test incomplete internal builds.

## Stage 3 — Publish the trial release

- Publish a controlled web preview.
- Package a Windows trial build after desktop compatibility and installation checks pass.
- Confirm first-run, sample project, backup/restore, and update/rollback paths.
- Publish release notes, setup instructions, known limitations, and a focused user acceptance checklist.
- Keep trial data isolated from production data.

## Engineering guardrails

1. AI assists with extraction and proposals; deterministic calculations decide numeric results.
2. No unapproved waste, productivity, deduction, electrical circuit, plumbing route, or HVAC defaults.
3. Missing or ambiguous inputs must be flagged, not silently guessed.
4. Every calculated quantity must be traceable to source evidence and a versioned rule.
5. Preserve Git history. Never force-push or rewrite shared history.
6. Do not commit private drawings, client data, credentials, API keys, or secrets.
7. A stage is complete only with implementation evidence and passing checks.

## Current baseline

The implementation branch has a first TypeScript/Vite web slice with local project records, room dimensions, deterministic geometry quantities, arithmetic reconciliation, CSV export, and initial unit tests. This is not yet a complete application and no successful CI/build result is asserted until verified from GitHub Actions.
