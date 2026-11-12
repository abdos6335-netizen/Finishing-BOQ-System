# Finishing BOQ & Cost Estimation System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Domain engines: dimension audit, finishing assemblies, productivity, cost roll-up, variation orders, MEP takeoff, critical path, project hierarchy.
- IndexedDB project storage with one-time migration from localStorage.
- Offline sync queue (idempotent replay), in-memory reference server, and three-way conflict resolution.
- Bilingual HTML report and dependency-free Excel (.xlsx) export; Excel and print/PDF buttons in the UI.
- 57 new unit and integration tests (91 total), including the 7 workflow scenarios in docs/QUALITY/INTEGRATION-TEST-MATRIX.md.
- Initial project foundation: README, technical documentation, architecture, and project roadmaps.
- Core data models: Project, Building, Room, Drawing, BOQ, Item, Cost, Schedule, Audit.
- Deterministic quantity calculation engine specification.
- Dual-verification calculation engine design.
- Draft documentation: product vision, architecture, quality, and roadmap.

### Changed
- Project governance shifted to documented architecture and testing strategy.

## [0.1.0] — Requirements & Architecture

### Added
- Product vision and target scope.
- Software Requirements Specification (SRS) draft.
- Technical architecture and database design.
- Engineering quantity calculation rules.
- Estimation rules: electrical, plumbing/HVAC, time & productivity.
- Reference testing strategy and Kitchen + Laundry project specification.

### Updated
- Project state: moved from speculative design to architecture and foundation phase.

---

## [0.0.1] — Foundation

### Added
- Initial project seed and repository structure.
- Root documentation files (README, CHANGELOG, CONTRIBUTING, SECURITY, .editorconfig, .gitignore).
