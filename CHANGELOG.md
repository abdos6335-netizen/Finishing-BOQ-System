# Finishing BOQ & Cost Estimation System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Schedule screen: sourced productivity rates (no built-in table), activities whose quantity comes from a BOQ line, FS/SS/FF dependencies with lag, critical path, and calendar dates from an explicit start date, working weekdays and holidays. Rules live in `src/domain/project-schedule.ts`.
- 4 tests for the schedule helpers and store round-trip (108 total).
- UI screens for finishing assemblies (explicit ratio and rule reference per component, versioned, idempotent apply to all rooms) and MEP takeoff (points with drawing reference and review flag, circuit schedule, cable runs from documented segments and approved allowances, verified-only sync to the BOQ). Rules live in `src/domain/project-takeoff.ts`.
- 6 tests for assemblies, MEP and store round-trip (104 total).
- UI screens for project currency, cost adjustments (approval reference and explicit base required) and variation orders (draft/submitted/approved/rejected, approved is immutable, revised total); exports now use the project's currency, adjustments and variations. Rules live in `src/domain/project-costing.ts`.
- 7 tests for project costing and store round-trip (98 total).
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
