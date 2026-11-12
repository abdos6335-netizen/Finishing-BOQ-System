# Finishing BOQ & Cost Estimation System — Project Status

**Delivery stage:** 1 of 3 — Build the usable application  
**Current version:** 0.1.0-foundation  
**Default branch:** main  
**Active implementation branch:** implementation/four-phase-roadmap

## Verified implementation state (2026-11-13)

Verified by running `npm test` and `npm run build` locally on this branch: **91 tests in 8 files pass and the production build succeeds.** CI has not been run for this state until it is pushed.

Engines (`src/domain`, framework-free, deterministic, each result carries its source/approval reference):
- Quantities and BOQ: room quantities, BOQ lines, room-to-BOQ synchronization that preserves commercial approvals, finishing assemblies.
- Verification: written-vs-extracted dimension comparison and batch dimension audit (blocks dependent quantities).
- Costing: project cost roll-up with approved adjustments, client view that keeps hidden adjustments inside the total, variation orders with an approval workflow.
- Time: productivity engine (no built-in rates), CPM with FS/SS/FF and lags, working-day calendar mapping.
- MEP: takeoff from approved points, circuit schedules and documented cable routes only.
- Structure: project hierarchy with quantity roll-up.
- Data: IndexedDB storage with one-time localStorage migration, offline queue with idempotent replay, three-way conflict resolution (protected fields are never auto-resolved).
- Reports: bilingual (AR/EN) HTML report for print-to-PDF and a dependency-free `.xlsx` export (opened and checked with an independent reader).

The web UI uses IndexedDB storage and offers CSV, Excel and print/PDF export. The other engines are tested and available as a library but do not have their own screens yet.

## Three delivery stages

1. **Build:** complete drawing intake and review, calculation engine, independent verification, BOQ, costing, productivity, reports, durable data, offline sync, security, and Windows/Web delivery.
2. **Review:** audit code against every approved requirement, validate engineering rules, run automated/integration/security/recovery tests, and resolve defects.
3. **Trial release:** publish a controlled web preview and Windows trial package only after review gates pass.

## Current limitations

- No drawing import, DXF/PDF/image reading, OCR, or scale calibration. Dimension observations must be entered or supplied by a future extraction component.
- No server, user accounts, roles, or audit log. The sync queue and conflict resolution are implemented and tested against an in-memory reference server only; real cross-device sync needs a backend that implements the `SyncTransport` contract.
- No screens yet for assemblies, MEP, variation orders, cost adjustments, schedule, or conflict review.
- PDF output is produced by the browser's print dialog from the HTML report, not by a PDF library.
- No Windows desktop packaging.
- No productivity-rate or material-price library: rates and prices must always be entered with a source.

## Engineering guardrails

- Deterministic calculations remain independent from AI.
- Inputs must be explicit; no guessed dimensions or unapproved waste factors.
- Every result must eventually link to drawing evidence, dimensions, formula/rule version, assumptions, and verification status.
- Independent verification must use a separately designed calculation path.
- User acceptance testing starts only after a usable release candidate exists.

## Next implementation work

1. Screens for adjustments, assemblies, MEP, variation orders, schedule, and conflict review.
2. Backend implementing `SyncTransport`, with authentication and roles.
3. Drawing upload with revision metadata, then DXF/PDF extraction feeding the dimension audit.
4. Windows packaging (e.g. Tauri) once the web application is stable.
5. Independent engineering review of the quantity rules against the reference project.
