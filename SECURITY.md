# Security & Data Protection

This document describes the security model, data protection, and backup
requirements for the Finishing BOQ & Cost Estimation System.

## 1. Core Principles

1. **No auto approval of uncertain data.** Uncertain or unverified data must
   not be committed to a BOQ without explicit review.
2. **Trust, don't assume.** Each calculated item carries a source and a
   verification status.
3. **Offline-first, then sync.** Local-first operation, encrypted sync,
   conflict-aware resolution.
4. **Least privilege.** Roles and permissions are explicit.
5. **Audit by default.** Every change is traceable.
6. **Defense in depth.** Encryption at rest, in transit, and during use.

---

## 2. Data Protection

### 2.1 Encryption

| Layer | Requirement | Details |
|-------|-------------|---------|
| At rest | Encryption | Local DB and backups encrypted (e.g., SQLCipher or file-level). |
| In transit | TLS | All sync/API traffic over HTTPS/TLS. |
| In use | Access control | Role-based, least privilege. |

### 2.2 Sensitive Data

- Drawings, project metadata, quantities, and costs must not be exposed to
  unauthorized users.
- Client-facing BOQ may omit internal cost or personnel data, where required.

### 2.3 Keys and Credentials

- No secrets, API keys, or credentials in the repository.
- Keys are managed by the deployment environment or a secrets manager.

---

## 3. Synchronization and Conflicts

### 3.1 Model

- **Offline-first**: local writes succeed without network.
- **Sync on reconnect**: changes are pushed to cloud (PostgreSQL) when online.
- **Conflict resolution**: last-write-wins with a decision log, or a custom
  resolution policy (e.g., "server wins for audit fields").

### 3.2 Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Same field edited on two clients | User selects merged/resolved version; audit log records decision. |
| Delete vs edit | Deleted record is retained as a logical deletion (soft); restored on conflict unless forced. |
| Uploaded drawing replaced | Version is kept; server keeps both with version comparison. |

### 3.3 Conflict Log

Every conflict is recorded in an `audit_log` table with:
- user who made the decision,
- timestamp,
- fields affected,
- reason for the resolution.

---

## 4. Backup and Restore

### 4.1 Backup Policy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Local DB backup | Every 15 min (or when offline) | 30 days |
| Cloud backup | On sync | 90 days |
| Important exports | Manual / on checkpoint | 1 year |

### 4.2 Restore

- Restore paths are tested regularly (test restore on a disposable copy).
- Restoration returns to the latest known-good state, never overlaying an
  existing project without confirmation.

---

## 5. Access Control

- Container of roles: `Admin`, `Project Manager`, `Viewer`, `Estimator`, `Client` (read-only).
- Each role enforces a permission matrix; actions outside a role's scope are rejected.
- External contributors have only read/privileged access inside GitHub workflows, never write access to production data.

### 6. Audit Trail

- All changes (create, update, delete) are recorded with:
  - timestamp,
  - user,
  - entity and affected fields,
  - reason (if audited),
  - old and new values (redacted where required).
- Audit entries are append-only and protected from deletion.

---

## 6. Security & Compliance

- **Offline dependencies**: embedded libraries are scanned for vulnerabilities.
- **Dependencies**: periodically updated and reviewed.
- **Logging**: access logs are centrally recorded; no sensitive data is logged.

---

## 7. Reporting and Response

- Security issues are reported to the project owner.
- Assessors follow a policy of traceability and reversibility (reversible data changes first).
- No production data is used for tests without explicit approval.

---

## 8. Non-Goals (for the initial release)

- No cloud-only operation.
- No public API for external integrations unless independently specified.
- No auto-approval of estimates/price changes without stakeholder approval.
