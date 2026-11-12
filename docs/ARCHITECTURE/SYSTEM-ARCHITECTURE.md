# System Architecture — Finishing BOQ & Cost Estimation System

## 1. Purpose & Scope

This document defines the proposed system boundaries. Technology selections remain provisional and are governed by [ARCHITECTURE-DECISION-REGISTER.md](ARCHITECTURE-DECISION-REGISTER.md). This is a design document, not evidence that these components have been implemented.

## 2. Architecture Styles

The **recommended logical separation** is layered (presentation → application → engineering core → data/sync) so that:

- The deterministic quantity engine is **isolated** and testable without UI.
- Drawing processing (CAD/DXF, PDF, OCR) is also isolated and swappable.
- The presentation tier (Desktop + Web) shares a large part of the code path.

Recommended logical structure (technology-neutral):
```
Presentation Layer  (Web + Desktop)
  ↓
Application Layer (Projects, Drawings, BOQ, Cost, Schedule, Reports)
  ↓
Engineering Core (Geometry, Quantity, Deduction, Verification, Pricing)
  ↓
Data & Sync (SQLite local + PostgreSQL cloud)
```

## 3. Why Deterministic Engine & Not AI?

- The quantity/engineering core **must be deterministic and auditable** before any AI is allowed to "calculate".
- AI is limited to *interpretation* tasks (e.g., reading text from drawings, proposing boundaries, flagging gaps).
- The verification engine runs an **independent** path over the same inputs and only then does a decision-maker act.

## 4. Technology & Platform Comparison

| Area | Status | Candidate / constraint | Open evaluation |
|------|--------|-----------|-------------------------------------|-------------|
| Desktop | TBD | Tauri, Electron, and native Windows are candidates | Python engine packaging, installer/update/signing, Windows compatibility, support burden |
| Engineering core | Recommended: Python candidate | Python ecosystem is suitable for geometry and calculation prototypes | Runtime packaging, performance, licensing, and deployment must be tested |
| Web UI | TBD | Shared typed web UI is a candidate | RTL/accessibility, offline storage, deployment, maintainability |
| Local data | Recommended: SQLite candidate for desktop | Local relational store may support offline workflows | Encryption, migration, concurrency, backup/restore, file lifecycle |
| Cloud data | TBD; PostgreSQL candidate | Relational server storage is plausible | Hosting, tenant isolation, sync protocol, backups, operational cost |
| Drawing formats | Recommended: evaluate DXF and PDF first | Keep format adapters replaceable | Representative fixture support, accuracy, licensing; DWG not promised |
| OCR / AI | TBD | Local and cloud providers may be evaluated | Accuracy, privacy, consent, cost, offline fallback, model licensing |
| Sync and backup | TBD | Durable change log, idempotency, checkpoints, conflict records, consistent backups are requirements | Detailed two-client conflict and restore tests |
| Tests | TBD | Automated unit, integration, calculation, UI, recovery tests are required | Select tools after stack decision |

## 5. Shared Calculation Logic Between Platforms

The key requirement is that **web and desktop share one logic for the calculations**.

**Recommended principle:** one shared engineering calculation contract must serve both clients. Python is a candidate for the core, but API/process topology is not frozen until packaging and deployment spikes pass.
- Backend exposes a JSON-RPC/HTTP endpoint `POST /v1/engine/quantity`.
- Both Desktop (Tauri) and Web call it.
- The UI receives JSON and renders local-side; no business logic is duplicated in JS.

Concerns:
- Versioning: use semantic versioning on the API contract; compatibility tests.
- Performance: for heavy calculations, the engine may operate in-process via a local binding, but exposed externally the same way.
- Testing: the same suite is run against both clients.

## 6. Data Model Overview (preview)

Classes (entities):
```
Project { id, code, name, location, type, state }
Building { id, project_id, code, name }
Room { id, building_id, code, name, area, height }
Drawing { id, project_id, version, path, type, status }
Item { id, project_id, code, description, unit, net, waste, gross }
BOQ { id, project_id, version, internal, client_upload }
Audit { id, user, operation, entity_type, entity_id, payload }
```

Full model and relationships are in `docs/ARCHITECTURE/DATABASE-DESIGN.md`.

## 7. Interfaces

- **Desktop:** a desktop shell must invoke the shared engineering core through a supported local interface; shell and interface remain TBD.
  - `dev` mode: local API UI for generation.
  - `prod` mode: self-hosted API or connected to cloud API.
- **Web:** the browser client must call the same versioned calculation contract through an authenticated application service.
- **API:** versioned JSON contract is recommended; REST versus RPC details remain TBD.

## 8. Deployment

| Environment | Desktop | Web |
|-------------|---------|-----|
| Development | `tauri dev` / `npm run dev` (api locally) | `npm run dev` ↔ local API |
| Production | Tauri package (tauri build) | Hosted site, connects to cloud API |

---

*Last reviewed: 12 November 2026*
