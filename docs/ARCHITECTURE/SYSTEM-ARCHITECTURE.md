# System Architecture — Finishing BOQ & Cost Estimation System

## 1. Purpose & Scope

This document defines the end-to-end system architecture: layers, boundaries, technology choices, how calculation logic is shared, and how data exists and flows. It is the architectural reference for the Engineering, Drawing, BOQ, and Reporting modules.

## 2. Architecture Styles

We select **layered vertical separation** (representation → application → engineering core → data/sync) so that:

- The deterministic quantity engine is **isolated** and testable without UI.
- Drawing processing (CAD/DXF, PDF, OCR) is also isolated and swappable.
- The presentation tier (Desktop + Web) shares a large part of the code path.

Selected structure:
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

| Area | Choice | Rationale | Alternatives (Rejected or Deferred) | Constraints |
|------|--------|-----------|-------------------------------------|-------------|
| Desktop | **Tauri 2 + React + TS** | Lightweight, fast, WinterCG ecosystem, rich UI | Electron (heavier), native C# (Windows only) | macOS/Linux not in initial scope |
| Backend | **Python + FastAPI** | Deterministic engine, clear orchestration, DB mapping | Node.js (duplicated logic, divergent rules) | — |
| Web UI | **React + TypeScript** | Single codebase with desktop | — | — |
| Data (local) | **SQLite (via SQLCipher for encryption optional)** | Offline-first, zero network needed, trusted | PostgreSQL-only (no offline) | — |
| Data (cloud) | **PostgreSQL** | Strong relational model, sync-ready | — | — |
| Drawing | **ezdxf (DXF), PyMuPDF / pdfplumber (PDF), OpenCV/PIL (images)** | DXF is priority; PDF/PNG extended into v1/v2 | First-party DWG SDK (cost, license), OpenCascade (overhead) | DWG support is not guaranteed |
| OCR | **PaddleOCR / Tesseract** | Read text/notes | Azure Computer Vision (external, cost, upload privacy) | — |
| Version | **SQLite WAL + backup tasks** | Local point-in-time recovery | — | — |
| Tests | **Pytest + Playwright** | Python weight, backend coverage, UI integration | — | — |

## 5. Shared Calculation Logic Between Platforms

The key requirement is that **web and desktop share one logic for the calculations**.

**Recommended approach: shared Python core for "orders of calculation" and execute through a single API.**
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

- **Desktop:** Tauri bridges → Python FastAPI backend.
  - `dev` mode: local API UI for generation.
  - `prod` mode: self-hosted API or connected to cloud API.
- **Web:** React → Fetch API to FastAPI.
- **API:** REST/JSON (with JSON-RPC style for computation later).

## 8. Deployment

| Environment | Desktop | Web |
|-------------|---------|-----|
| Development | `tauri dev` / `npm run dev` (api locally) | `npm run dev` ↔ local API |
| Production | Tauri package (tauri build) | Hosted site, connects to cloud API |

---

*Last reviewed: 12 November 2026*
