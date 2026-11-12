# Finishing BOQ & Cost Estimation System

**نظام حصر كميات ومقايسات وتسعير أعمال التشطيبات**

A planned engineering-focused application for quantity surveying and cost estimation of residential finishing projects (apartments and villas).

> **Project status: preparation and technical audit.** This repository currently contains project documentation and configuration only. It does not yet contain a runnable application, production calculation engine, or executable test suite.

## Product objective

Turn reviewed architectural information into traceable finishing quantities, internal and client BOQs, cost estimates, and reports.

Core requirements:

- Room-by-room and element-by-element quantity surveying.
- Arabic and English interface with RTL/LTR support.
- Windows desktop and web delivery targets.
- Offline-capable workflows with explicit, recoverable synchronization.
- Deterministic engineering calculations independent of AI.
- Independent verification of calculated quantities.
- Traceability from every result to source drawings, dimensions, rules, assumptions, and approvals.
- No silent approval of uncertain engineering or financial data.

## Non-negotiable engineering principles

1. AI may assist with drawing interpretation, OCR, classification, and suggestions. It does not approve or replace the deterministic calculation engine.
2. A calculation result must retain its input evidence, units, formula/rule version, deductions, additions, assumptions, and verification status.
3. Waste, deductions, productivity, routing allowances, and engineering defaults require a cited source or explicit project approval.
4. Missing or ambiguous source information must be surfaced for review rather than converted into invented quantities.
5. Internal automated verification must precede user acceptance testing.

## Current delivery status

| Area | Status |
|---|---|
| Product scope and requirements | Draft; under audit |
| Architecture and technology selection | Not frozen; decision register in progress |
| Database design | Draft; requires normalization and sync review |
| Engineering calculation rules | Draft; corrections required |
| Application source code | Not started |
| Executable automated tests | Not started |
| First usable release | Not available |

See [Project Status](docs/PROJECT-STATUS.md), [Four-Phase Execution Plan](docs/ROADMAP/FOUR-PHASE-EXECUTION-PLAN.md), and [Architecture Decision Register](docs/ARCHITECTURE/ARCHITECTURE-DECISION-REGISTER.md).

## Planned architecture boundaries

The design will keep these responsibilities separate:

- **Presentation:** desktop and web user experience.
- **Application services:** projects, drawings, BOQ, costing, schedule, and reporting workflows.
- **Engineering core:** deterministic geometry, quantity, unit conversion, and validation.
- **Drawing interpretation:** file import, extraction, OCR, and candidate geometry.
- **Data and synchronization:** local persistence, remote persistence, audit history, backup, and conflict handling.

The implementation technologies are not considered final until the architecture decision register is reviewed and the offline, deployment, security, and licensing constraints are evaluated.

## Planned capabilities

- Project, client, building, floor, unit, room, and zone management.
- Drawing sets, sheet classification, scale calibration, and revision history.
- Written-versus-extracted dimension comparison.
- Finishing quantity takeoff and independently verified calculations.
- Electrical, plumbing, and HVAC takeoff only where the required design information exists.
- Separate internal and client BOQs.
- Material, labor, equipment, supplier, and cost breakdowns.
- Additional works / variation orders.
- Productivity, duration, and schedule estimation.
- Arabic/English PDF and spreadsheet reports.
- Offline operation, synchronization, backup, and restore.

## Repository structure

The folders shown below are planned module boundaries. A folder is not considered implemented merely because it appears in this diagram.

```text
docs/              Product, requirements, architecture, engineering, QA
apps/              Desktop and web clients (planned)
backend/           Application API and services (planned)
engineering/       Deterministic calculation core (planned)
drawing_engine/    Drawing import and interpretation (planned)
boq/               BOQ domain (planned)
costing/           Cost estimation (planned)
scheduling/        Productivity and scheduling (planned)
reporting/         Reports and exports (planned)
database/          Migrations and persistence (planned)
tests/             Automated test suite (planned)
```

## Contributing and change control

- Requirements and engineering rules must be reviewed before dependent production code is written.
- Every material architecture choice must be recorded as Confirmed, Recommended, or TBD.
- Substantial work must use feature branches and reviewed pull requests.
- Never force-push or rewrite shared history.
- Do not commit client drawings, private project data, credentials, API keys, or local database files.
- A phase is complete only when its exit criteria are evidenced by implementation and passing checks.

## Links

- [GitHub repository](https://github.com/abdos6335-netizen/Finishing-BOQ-System)
- [Project status](docs/PROJECT-STATUS.md)
- [Four-phase execution plan](docs/ROADMAP/FOUR-PHASE-EXECUTION-PLAN.md)
- [Architecture decision register](docs/ARCHITECTURE/ARCHITECTURE-DECISION-REGISTER.md)
