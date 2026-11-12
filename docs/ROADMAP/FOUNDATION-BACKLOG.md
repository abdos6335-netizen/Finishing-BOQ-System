# Foundation Backlog — Phase 1 to Phase 2

**Status:** Draft work breakdown  
**Rule:** Items are not complete until implementation evidence and checks are linked.

## P0 — Required before production implementation

| ID | Work item | Deliverable | Acceptance evidence |
|---|---|---|---|
| FB-001 | Reconcile project documentation | One consistent README, status, roadmap, SRS, and architecture set | Cross-document review |
| FB-002 | Correct quantity definitions and formulas | Versioned geometry/quantity rule catalogue | Formula tests and reviewed examples |
| FB-003 | Remove unsupported default waste and allowances | Explicit rule-source and approval metadata | No implicit default in rules or tests |
| FB-004 | Define dimension evidence and mismatch handling | Source model for written/extracted/manual dimensions | Conflict and provenance test cases |
| FB-005 | Define calculation result states | Verified, Tentative, Needs Review, Rejected/Invalid state definitions | State transition and approval tests |
| FB-006 | Approve v1 scope and file-format support | Scope matrix and exclusions | SRS sign-off |
| FB-007 | Complete architecture decision register | Confirmed/Recommended/TBD decisions | All P0 dependencies closed or explicitly deferred |
| FB-008 | Define independent verification contract | Separate input/output and verification interfaces | Seeded discrepancy tests |

## P1 — Application foundation

| ID | Work item | Deliverable | Acceptance evidence |
|---|---|---|---|
| FB-101 | Select desktop/web architecture | Decision record and tested minimal prototype | Clean build and launch on target environment |
| FB-102 | Define persistence and migrations | Schema v1 and migration policy | Fresh install and upgrade tests |
| FB-103 | Define project hierarchy | Project/building/floor/unit/room/zone model | Relationship and validation tests |
| FB-104 | Define drawing/document model | Drawing set, sheet, revision, file metadata, checksum | Import and revision tests |
| FB-105 | Define audit history | Append-only domain event/audit contract | Before/after traceability test |
| FB-106 | Define local backup/restore | Documented consistent backup strategy | Restore-to-new-profile test |
| FB-107 | Define synchronization protocol | Outbox/inbox, idempotency, cursor/checkpoint, conflict records | Two-client offline conflict suite |
| FB-108 | Build localization shell | Arabic/English, RTL/LTR foundations | UI smoke tests |

## P2 — Drawing and engineering foundation

| ID | Work item | Deliverable | Acceptance evidence |
|---|---|---|---|
| FB-201 | Build drawing ingestion adapter | Format adapters and immutable source file references | Fixture import tests |
| FB-202 | Build scale calibration model | Calibration evidence and tolerance metadata | Known-length calibration tests |
| FB-203 | Extract text and dimensions | Candidate extraction records with source coordinates | Precision/recall report on approved fixtures |
| FB-204 | Build geometry primitives | Polygon, segment, opening, face, zone models | Property and degeneracy tests |
| FB-205 | Build deterministic calculation API | Versioned input/output contract | Determinism and unit tests |
| FB-206 | Build independent verification adapter | Independent recomputation and comparison | Mutation/seeded-error tests |

## P3 — Commercial and release foundation

| ID | Work item | Deliverable | Acceptance evidence |
|---|---|---|---|
| FB-301 | Define BOQ item catalog and revisions | Item coding and immutable BOQ snapshots | Duplicate/version regression tests |
| FB-302 | Define cost model | Direct/indirect/fee/contingency/profit model | No-double-counting tests |
| FB-303 | Define variation orders | Linked additional-work BOQ and approvals | Revision reconciliation tests |
| FB-304 | Define productivity model | Source-controlled rates, crew/calendar/dependency model | Schedule calculation tests |
| FB-305 | Define report templates | Arabic/English internal and client exports | Export content and layout tests |
| FB-306 | Define release pipeline | Build, package, deployment, rollback, release notes | Reproducible release candidate |

## User testing policy

The project team performs automated, integration, calculation, recovery, and regression testing during development. The user is asked to test only after an end-to-end usable release candidate is available.
