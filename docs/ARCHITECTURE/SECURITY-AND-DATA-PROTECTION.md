# Security & Data Protection

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Core Principles

- **Offline-first** with encrypted sync.
- **No auto-approval** of uncertain engineering or financial data.
- **Least privilege** user roles.
- **Full audit trail** for all changes.
- **No secrets in the repository.**

---

## 2. Encryption & Data Protection

| Layer | Requirement |
|-------|-------------|
| At rest | SQLite encrypted (file-level or SQLCipher), backups encrypted |
| In transit | TLS/HTTPS for sync and API |
| Use | Role-based access, least privilege |

## 3. Data Classification

| Data type | Classification | Handling |
|-----------|----------------|----------|
| Drawings (CAD/PDF/images) | Confidential | Encrypted at rest, access-logged |
| Project metadata & quantities | Confidential | Encrypted at rest |
| Client BOQ export | Confidential to client | Filtered (no internal costs) |
| Audit trail | Confidential | Append-only, access-logged |
| Credentials & keys | Secret | Never in repo; in keyring / secrets manager |

## 4. Synchronization & Conflicts

- **Offline-first**: local writes succeed with no network.
- **Sync on reconnect**: pending changes pushed to cloud when online.
- **Conflict resolution**:
  - *Last-write wins* for metadata, with a decision log.
  - *Human review* for meaningful quantity differences.
- Every conflict records: user, timestamp, fields, reason.

## 5. Backup & Restore

| Type | Frequency | Retention |
|------|-----------|-----------|
| Local DB backup | Every 15 min (or when offline) | 30 days |
| Cloud backup | On sync | 90 days |
| Export/Checkpoint | Manual | 1 year |

## 6. Access Control

Roles: `Admin`, `Project Manager`, `Viewer`, `Estimator`, `Client` (read-only).

- Each role enforces a permission matrix.
- Actions outside a role's scope rejected.

## 7. Audit Trail

Every change records: timestamp, user, entity, affected fields, old/new values (redacted as needed), reason if audited. Entries are **append-only**.

## 8. Non-Goals

- Cloud-only operation in v1.
- Public API for external integration unless separately specified.
- Auto-approval of price changes without stakeholder approval.

---

*Last updated: 12 November 2026*
