# Integration Test Matrix

Source: `tests/engineering-workflow.integration.test.ts`. Status reflects a local run on 2026-11-13 (all passing). CI has not yet run this state.

| # | Scenario | What is asserted |
|---|----------|------------------|
| 1 | Written vs extracted dimensions | Unit conversion, explicit tolerance, matched vs needs-review, reported difference |
| 2 | Room, openings, deductions, BOQ link, cost | 5×4×3 m room: floor 20, ceiling 20, gross walls 54, deductions 3.69, net walls 50.31; BOQ lines; priced total |
| 3 | Commercial approvals survive geometry updates | Quantity updates in place; waste approval, unit rate and item id are preserved |
| 4 | Wall quantities blocked while dimensions need review | Audit blocks approval; no wall BOQ line for an unreconciled wall; review note in the report |
| 5 | Save and reload | Project, rooms, openings and BOQ items round-trip through IndexedDB unchanged |
| 6 | Legacy migration | Missing fields default to `unspecified` / `apartment`, nothing is guessed |
| 7 | Invalid record isolation | Corrupt records are dropped; valid projects are kept |
| 8 | Full workflow | Assembly → hierarchy roll-up → cost with approved profit → CPM schedule → report → xlsx |

Related suites: `tests/sync-storage-export.test.ts` (conflicts, offline queue, idempotent replay, IndexedDB, migration, HTML/XLSX) and `tests/engines-extended.test.ts` (per-engine rules).

## Not covered

- Real two-device sync: the queue is tested against an in-memory server only.
- Opening the `.xlsx` in Microsoft Excel itself (checked with an independent reader, `openpyxl`).
- Browser UI behaviour (no end-to-end browser tests yet).
