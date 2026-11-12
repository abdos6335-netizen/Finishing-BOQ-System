# Four-Phase Execution Plan
## Finishing BOQ & Cost Estimation System

**Status:** Execution baseline — draft pending engineering audit  
**Prepared:** 12 November 2026  
**Target platforms:** Windows Desktop + Web  
**Primary scope:** Residential finishing works (apartments and villas)

This plan consolidates the existing multi-stage roadmap into four delivery phases. Workstreams may be prepared in parallel, but implementation gates must be respected: later modules may not treat unresolved engineering rules or architecture decisions as approved.

## Delivery principles
1. The engineering calculation engine is deterministic and independent of AI.
2. AI may extract, classify, interpret, and propose; it must not silently approve engineering quantities or financial values.
3. Every quantity must retain its source, units, formula/rule version, assumptions, deductions, additions, waste basis, verification result, and approval state.
4. No default waste, deduction, productivity, electrical circuit, plumbing route, or HVAC allowance is authoritative without a cited standard, project-specific source, or explicit user approval.
5. Preserve Git history. No force push, destructive reset, or unreviewed deletion.
6. No private drawings, client data, credentials, API keys, or secrets in this public repository.
7. Internal automated tests and engineering checks precede user acceptance testing. The user tests only after a usable release candidate exists.

## Phase 1 — Technical Audit, Requirements & Engineering Baseline
**Goal:** Establish one consistent, testable source of truth before production implementation.

### Work items
- Audit all current repository files and identify contradictions, duplicated sections, missing decisions, and unsupported claims.
- Reconcile README, SRS, project status, architecture, database design, engineering rules, quality documents, and roadmap.
- Classify every technical decision as Confirmed, Recommended, or TBD; do not present unapproved technology choices as final.
- Freeze v1 scope and exclusions, including supported drawing formats and residential finishing coverage.
- Define project/building/unit/floor/room/zone/element states and project types.
- Define drawing intake, drawing-set classification, revision control, scale calibration, and traceability.
- Define written-vs-extracted dimension comparison, confidence, mismatch severity, missing-data handling, and engineer review gates.
- Correct and source engineering rules for geometry, wall faces, floors, ceilings, openings, deductions, additions, waste, and units.
- Define separate treatment for electrical, plumbing, and HVAC quantities; require design/load/route inputs and relevant code review where applicable.
- Define pricing structure without double counting direct costs, indirect costs, engineer fees, contingency, and profit.
- Separate verified drawing data from explicitly synthetic test data.
- Define acceptance criteria and reference test fixtures without inventing values from unavailable drawings.

### Exit gate
- Documents agree with each other.
- Every critical rule has inputs, units, formula, assumptions, source/approval status, validation, edge cases, and test cases.
- All unresolved matters are explicitly listed as TBD; no unsafe default is silently adopted.
- User-specific decisions are requested only when genuinely necessary.

## Phase 2 — Application Foundation, Data Model & Project/Drawing Management
**Goal:** Deliver a stable application skeleton and trustworthy data lifecycle.

### Work items
- Select the final implementation architecture after Phase 1 evaluation.
- Establish repository layout, development tooling, formatting, linting, type checks, CI, and test commands.
- Implement the application shell, Arabic/English localization, RTL/LTR, and responsive desktop/web navigation.
- Implement project, client, building, floor, unit, room, zone, and element records.
- Implement user roles, permissions, audit history, and project-level settings.
- Implement drawing upload/import, metadata, sheet classification, drawing sets, revisions, and rollback.
- Implement local-first persistence, migrations, transaction safety, and attachment/file references.
- Design and implement backup/restore and sync/conflict semantics before enabling multi-device writes.
- Implement secure file handling and ensure private project files remain outside the public source repository.

### Exit gate
- Clean setup can install and launch the application from documented instructions.
- Database migrations and CRUD flows pass automated tests.
- Project and drawing revisions are auditable and recoverable.
- Backup/restore integrity is tested; sync cannot silently overwrite conflicting work.
- Arabic/English and RTL/LTR smoke tests pass.

## Phase 3 — Drawing Intelligence, Deterministic Quantity Engine & Independent Verification
**Goal:** Convert reviewed drawing information into traceable engineering quantities.

### Work items
- Build a drawing ingestion pipeline for the approved v1 formats.
- Extract text, dimensions, symbols, scale, geometry, and candidate room boundaries with source coordinates/page/layer references.
- Compare written dimensions with extracted dimensions and show mismatches for review.
- Allow manual correction while preserving original extraction and full edit history.
- Build geometry primitives and validated unit conversion.
- Implement room-by-room and element-by-element calculations for floors, walls/faces, ceilings, openings, deductions, additions, and supported finishing assemblies.
- Represent net, gross, waste, and order quantities separately; calculate waste only from an approved rule or explicit project input.
- Implement a separately designed verification path that does not merely call the primary calculation function again.
- Compare results, tolerances, source evidence, and rule versions; flag discrepancies and out-of-bounds inputs.
- Add MEP takeoff only where sufficient drawing/design data exists; otherwise return Needs Review or Tentative, never a fabricated quantity.
- Create deterministic fixtures, property tests, regression tests, and independent hand-check examples.

### Exit gate
- Same inputs and rule versions always produce identical results.
- Every result is traceable to source geometry/dimensions and a versioned rule.
- Independent verification detects seeded errors and discrepancies.
- Missing or ambiguous inputs never produce silently approved quantities.
- Reference fixtures pass within documented tolerances.

## Phase 4 — BOQ, Costing, Productivity, Reports, Hardening & First Release
**Goal:** Turn verified quantities into professional estimates and a usable release.

### Work items
- Implement item catalog, work breakdown, units, assemblies, material/labor/equipment resources, and supplier price records.
- Generate separate internal and client BOQs with controlled visibility of cost, markup, and notes.
- Implement direct costs, indirect costs, transport, engineer fees, contingency, profit, taxes (if in scope), and explicit calculation order without double counting.
- Implement additional works / variation orders linked to the original project and revision.
- Implement productivity and duration using editable, sourced rates, crew size, work calendars, dependencies, readiness constraints, overlap, and risk factors.
- Generate Arabic/English Excel and PDF reports with formulas, source references, assumptions, revisions, and review status.
- Add dashboard summaries and project-level progress/cost views where supported by reliable data.
- Complete security, permissions, performance, error handling, backup/restore, sync, and migration hardening.
- Run full CI, unit, integration, calculation, verification, UI, export, security, and recovery tests.
- Package Windows Desktop and deploy Web only after release gates pass.
- Deliver release notes, setup instructions, known limitations, and a post-release user acceptance checklist.

### Exit gate
- A clean installation produces a usable application.
- Core end-to-end flow passes: create project → import drawings → review measurements → calculate and verify → generate BOQ → price → export.
- No critical or high-severity calculation, data-loss, security, or release blocker remains open.
- The user receives a release candidate before being asked to perform acceptance testing.

## Parallel workstreams
The following can proceed in parallel where dependencies permit:
- Requirements/documentation audit and architecture comparison.
- Engineering rule research and test-case design.
- UX information architecture and localization planning.
- Data model review and security threat modeling.
- CI/test harness preparation.

Production implementation remains gated by approved interfaces and engineering rules. The four phases are not a reason to build dependent modules against speculative assumptions.

## Current repository baseline
At the start of this plan, the repository contains documentation and configuration files only; no application source tree or executable test suite is present. Existing README and roadmap statements that imply implementation is underway must be reconciled with the actual repository contents.

## Change control
- Record decisions and rationale in the relevant documents.
- Use feature branches and pull requests for substantial changes.
- Never force-push or rewrite shared history.
- Do not mark a phase complete based on documentation alone; require implementation evidence and passing tests.
- Maintain a Known Limitations list and explicit TBD register.