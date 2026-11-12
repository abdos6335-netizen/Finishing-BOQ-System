# Release Plan

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Define the release process for the project, including gates and criteria for each release.

---

## 2. Release Gates

| Release | Gate |
|---------|------|
| 0.1.0 | Specs, architecture, and testing strategy drafted |
| 0.2.0 | Project foundation, database, and drawing management |
| 0.3.0 | Quantity engine + independent verification |
| 0.4.0 | BOQ + cost estimation + export |
| 0.5.0 | Schedule + reporting + sync |
| 1.0.0 | Internal QA + stable release |

---

## 3. Release Process

1. **Feature freeze** — only approved changes.
2. **Stage review** — review documentation and code.
3. **Test** — unit, integration, calculation, verification, DB, drawing import, scale calibration, versioning, sync, backup/restore, security, regression.
4. **Alpha / Beta** — if needed.
5. **Promotion** — from `develop` to `main` with a release tag.
6. **Deploy** — offline desktop + web hosting update.

---

## 4. Versioning

- Versioning follows **Semantic Versioning (MAJOR.MINOR.PATCH)**.
- Example: 1.0.0, 1.1.0, 1.1.1.

---

## 5. Release Artifacts

- Desktop: packaged application (Tauri)
- Web: hosted build
- Documentation: updated docs

---

*Last updated: 12 November 2026*
