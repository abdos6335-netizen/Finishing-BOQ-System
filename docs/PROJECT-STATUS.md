# Finishing BOQ & Cost Estimation System — Project Status

**Delivery stage:** 1 of 3 — Build the usable application  
**Current version:** 0.1.0-foundation  
**Default branch:** main  
**Active implementation branch:** implementation/four-phase-roadmap

## Verified implementation state

The active implementation branch now contains a first runnable web vertical slice:
- TypeScript + Vite application shell.
- Local project creation and persistence in browser storage.
- Room dimension entry and explicit wall-face generation.
- Deterministic floor, ceiling, gross wall, opening deduction, net wall, and perimeter calculations.
- Independent arithmetic reconciliation for wall quantities.
- Arabic/English interface switching and responsive layout.
- CSV takeoff export.
- Initial Vitest unit tests and GitHub Actions CI workflow.

This is a foundation, not the completed product. No successful build or CI result is claimed until the workflow has run and its result is inspected.

## Three delivery stages

1. **Build:** complete drawing intake and review, calculation engine, independent verification, BOQ, costing, productivity, reports, durable data, offline sync, security, and Windows/Web delivery.
2. **Review:** audit code against every approved requirement, validate engineering rules, run automated/integration/security/recovery tests, and resolve defects.
3. **Trial release:** publish a controlled web preview and Windows trial package only after review gates pass.

## Current limitations

- No drawing import, DXF/PDF/image extraction, scale calibration, or written-vs-extracted dimension comparison.
- No per-opening UI or wall-specific geometry editor.
- No durable database, server API, user authentication/roles, audit log, backup/restore, or cloud synchronization.
- No full BOQ catalog, pricing engine, variation orders, productivity/scheduling, or professional PDF/Excel reports.
- No Windows desktop packaging yet.
- Browser local storage is temporary foundation storage and must not be treated as production-grade project-data persistence.

## Engineering guardrails

- Deterministic calculations remain independent from AI.
- Inputs must be explicit; no guessed dimensions or unapproved waste factors.
- Every result must eventually link to drawing evidence, dimensions, formula/rule version, assumptions, and verification status.
- Independent verification must use a separately designed calculation path.
- User acceptance testing starts only after a usable release candidate exists.

## Next implementation work

1. Add detailed wall-face/opening editing and project/building/floor/room hierarchy.
2. Add persistence abstraction and migration path to durable local database.
3. Add drawing upload and revision metadata before automated extraction.
4. Expand deterministic geometry and verification tests using the reference project.
5. Add BOQ and costing only after the quantity result contract is stable.
