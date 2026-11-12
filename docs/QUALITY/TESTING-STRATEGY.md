# Testing Strategy

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Define the quality assurance plan for quantity calculation, BOQ, sync, and integrations.

## 2. Test Types

| Test Type | Target |
|-----------|--------|
| Unit | Individual rules, utilities, engine |
| Integration | API, DB, file IO, drawing import |
| Calculation | Determinism, edge cases, waste/deduction |
| Independent Verification | Re-derive and compare |
| Database | Schema, relations, migrations |
| Drawing import | DXF, PDF, image |
| Scale Calibration | Scale extracted vs. known |
| Revision | Versioning, rollback |
| Synchronization | Conflicts, offline, restore |
| Backup/Restore | Restore integrity |
| Security | Access control, encryption |
| Regression | After refactor, ensure no regression |

---

*Last updated: 12 November 2026*
