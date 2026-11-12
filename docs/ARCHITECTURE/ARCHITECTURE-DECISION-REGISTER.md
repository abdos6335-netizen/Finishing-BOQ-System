# Architecture Decision Register

**Status:** Working register — no production stack is frozen yet  
**Last reviewed:** 12 November 2026

This register is authoritative for the status of technology and architecture decisions. A recommendation is not an approval. Decisions must include rationale, alternatives, constraints, consequences, and the evidence needed to close them.

## Status definitions

- **Confirmed:** A product constraint or architectural principle explicitly required by the project.
- **Recommended:** A candidate direction supported by current analysis, but still subject to implementation and deployment validation.
- **TBD:** Evidence or a product decision is still missing; dependent implementation must not assume an answer.

## Decision register

| ID | Topic | Status | Current position | Closure evidence |
|---|---|---|---|---|
| ADR-001 | Deterministic engineering core independent of AI | Confirmed | AI can interpret and propose; deterministic rules produce final calculated quantities. | Domain boundary tests and architecture review |
| ADR-002 | Independent quantity verification | Confirmed | Verification must use a separately designed calculation path, not simply call the primary function again. | Seeded-error tests and independent examples |
| ADR-003 | Quantity traceability | Confirmed | Store source evidence, canonical units, formula/rule version, assumptions, deductions, additions, waste basis, and approval state. | Data model and end-to-end traceability test |
| ADR-004 | Arabic/English and RTL/LTR | Confirmed | Both languages and directions are product requirements. | Localization and layout acceptance tests |
| ADR-005 | Windows desktop + web targets | Confirmed | Both delivery targets are required; implementation and hosting details remain open. | Packaging and deployment spike |
| ADR-006 | Offline-capable workflows | Confirmed | Critical project workflows must remain usable without continuous network access. | Offline workflow and recovery tests |
| ADR-007 | Desktop shell | TBD | Tauri, Electron, and native Windows options require comparison against Python engine packaging, updates, signing, and maintenance. | Working packaging spike and operational comparison |
| ADR-008 | Web frontend | Recommended | A shared typed web UI is a candidate, not an approved framework choice. | Prototype, accessibility, RTL, and maintenance review |
| ADR-009 | Backend/API | TBD | Python is a strong candidate for the engineering core; API framework and process topology are not frozen. | API spike, packaging test, performance test |
| ADR-010 | Local persistence | Recommended | SQLite is a candidate for single-user/local-first desktop storage. | Migration, concurrency, encryption, backup, and recovery tests |
| ADR-011 | Browser persistence | TBD | Web offline persistence technology and limits must be evaluated separately from desktop SQLite. | Browser storage prototype and quota/recovery tests |
| ADR-012 | Cloud persistence | TBD | PostgreSQL is a candidate relational server store; hosting, tenancy, backup, and operations remain open. | Deployment and data isolation design |
| ADR-013 | Synchronization protocol | TBD | Must use durable change tracking, idempotent operations, checkpoints, retries, and explicit conflict states. No silent last-write-wins for engineering/financial records. | Two-client offline conflict test matrix |
| ADR-014 | Drawing formats | Recommended | Start evaluation with DXF and PDF; image support requires scale calibration and evidence capture. DWG is not promised until licensing and SDK feasibility are proven. | Representative format import spike and test corpus |
| ADR-015 | OCR and AI providers | TBD | Provider, local/cloud execution, privacy, cost, and fallback policy are unresolved. | Accuracy/privacy/cost evaluation on approved sample data |
| ADR-016 | Calculation numeric model | Recommended | Use decimal-safe monetary arithmetic and a documented geometric tolerance policy; avoid binary floating point for currency. | Numeric design note and boundary/property tests |
| ADR-017 | File storage | TBD | Separate drawing binaries from relational metadata; define local paths, cloud object storage, checksums, retention, and restore. | File lifecycle and restore prototype |
| ADR-018 | Authentication and roles | TBD | Identity provider, local-only mode, authorization model, and recovery flow require threat modeling. | Security design and permission tests |

## Cross-cutting constraints

- No client drawing or private project data is to be uploaded to third-party AI/OCR services without an explicit privacy and consent design.
- A sync retry must be safe to repeat; duplicate delivery must not duplicate BOQ items or financial operations.
- Conflicts in dimensions, quantities, BOQ revisions, approvals, and prices must be visible and auditable. A generic timestamp-based overwrite is not an acceptable universal policy.
- Local database backups must be transactionally consistent. A raw copy of a live SQLite database is not assumed safe without a documented backup procedure.
- Technology choices must account for licenses, deployment, Windows compatibility, update mechanism, offline behavior, and ongoing maintenance.

## Decision workflow

1. Record the problem and product constraints.
2. Compare at least two viable options where alternatives exist.
3. Build a small spike for high-risk unknowns.
4. Record the decision, consequences, and rollback path.
5. Update affected architecture, database, security, and release documents.
6. Only then allow dependent production implementation.
