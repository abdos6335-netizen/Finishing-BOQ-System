# Finishing BOQ & Cost Estimation System

**نظام حصر كميات ومقايسات وتسعير أعمال التشطيبات**

An engineering-focused application for quantity surveying and cost estimation of residential finishing projects (apartments and villas).

> **Current status:** The first web application vertical slice has been added on the active implementation branch. It supports local project creation, room inputs, deterministic floor/ceiling/wall calculations, arithmetic reconciliation, and CSV export. It is an early foundation—not a complete or approved engineering BOQ system.

## Delivery stages

The delivery is managed in the three user-facing stages:

1. **Build the usable application:** complete the required workflows and engineering modules.
2. **Code and requirements review:** audit the implementation against the approved requirements, run automated and engineering tests, and fix findings.
3. **Publish a trial release:** deploy the web preview and package a Windows trial only after release gates pass.

Internal development work packages do not change these three delivery stages.

## Product requirements

- Room-by-room and element-by-element quantity surveying.
- Arabic and English interface with RTL/LTR support.
- Windows desktop and web delivery.
- Offline-capable workflows with explicit, recoverable synchronization.
- Deterministic engineering calculations independent of AI.
- Independent verification of calculated quantities.
- Traceability from every result to source drawings, dimensions, rules, assumptions, and approvals.
- No silent approval of uncertain engineering or financial data.

## Engineering principles

1. AI may assist with drawing interpretation, OCR, classification, and suggestions. It does not approve or replace the deterministic calculation engine.
2. A calculation result must retain its input evidence, units, formula/rule version, deductions, additions, assumptions, and verification status.
3. Waste, deductions, productivity, routing allowances, and engineering defaults require a cited source or explicit project approval.
4. Missing or ambiguous source information must be surfaced for review rather than converted into invented quantities.
5. Internal automated verification must precede user acceptance testing.

## Current implementation

The first vertical slice is a TypeScript/Vite web application with:
- Local project records (browser storage).
- Apartment/villa project selection.
- Room dimension entry and explicit wall-face geometry.
- Deterministic floor, ceiling, gross-wall, opening-deduction, net-wall, and perimeter calculations.
- A separate arithmetic reconciliation pass for wall quantities.
- CSV export.
- Arabic/English interface switching and responsive layout.
- Initial automated tests for geometry, opening deductions, and invalid inputs.

**Known limitations:** no drawing import or interpretation, per-opening editor, server/database, secure multi-user accounts, cloud sync, backup/restore, full BOQ/costing, MEP takeoff, scheduling, PDF/Excel reports, or Windows installer yet. Browser storage is not a substitute for a durable production database. The current room form creates wall faces from the entered room dimensions and does not yet capture wall-specific irregularities.

## Technology status

The current web slice uses TypeScript and Vite to establish a runnable baseline. This does not freeze the final Windows packaging, backend, database, offline synchronization, or drawing-processing architecture. Those choices must be validated before dependent production features are built.

## Repository structure

```text
src/domain/       Deterministic calculation and project domain
src/              Web application interface
tests/            Automated calculation tests
docs/             Product, requirements, architecture, engineering, QA
apps/             Future desktop packaging boundary
backend/          Future API and sync services
```

## Development rules

- Keep the engineering core independent from AI and UI.
- Preserve Git history; no force push or destructive reset.
- Do not commit private client drawings, project data, credentials, API keys, or local database files.
- Synthetic fixtures must be labeled and kept separate from verified drawing evidence.
- A trial release is not approved until the implementation review and release checks pass.

## Links

- [GitHub repository](https://github.com/abdos6335-netizen/Finishing-BOQ-System)
- [Project status](docs/PROJECT-STATUS.md)
- [Four-phase technical work plan](docs/ROADMAP/FOUR-PHASE-EXECUTION-PLAN.md)
- [Architecture decision register](docs/ARCHITECTURE/ARCHITECTURE-DECISION-REGISTER.md)
