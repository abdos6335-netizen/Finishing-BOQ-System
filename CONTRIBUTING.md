# Contributing Guide

Thanks for taking the time to contribute. This document describes standards,
processes, and expectations for working on this project.

## 1. Scope and Vision

This repository documents the **Finishing BOQ & Cost Estimation System** — a
deterministic quantity-surveying and estimating application for residential
finishing works. It is **not** a full construction project management suite.

The goal is a **grounded, verifiable, and reviewable** foundation before any
production code is written.

## 2. Specs Before Code

1. **SRS + acceptance criteria are the source of truth.** No production code
   is written until the SRS and acceptance tests are agreed.
2. **No single phase counts as complete** if its acceptance tests are not met
   and recorded.
3. **Engineering rules must be documented** before code. Use
   `docs/ENGINEERING/` as the source of truth for quantity rules.

## 3. Documentation Standards

- Every document must state a **purpose**, **audience**, and **scope**.
- Prerequisite knowledge must be stated.
- Divergent decisions must be recorded as `TBD — Requires decision`.
- No secrets, credentials, keys, or private project data in the repository.

### File purpose quick map

| Path | Purpose |
|------|---------|
| `docs/SRS/*.md` | Functional and non-functional requirements + acceptance tests |
| `docs/ARCHITECTURE/*.md` | System design, data model, calculation engine, sync, security |
| `docs/ENGINEERING/*.md` | Quantity, materials, electrical, plumbing/HVAC, schedule rules |
| `docs/QUALITY/*.md` | Test strategy, reference project, acceptance criteria |
| `docs/ROADMAP/*.md` | Development roadmap and release plan |

## 4. Git Workflow

- **Branch types:** `feature/<short-name>`, `docs/<short-name>`, `fix/<short-name>`.
- **Commits:** imperative, scoped: `feat: …`, `docs: …`, `refactor: …`,
  `test: …`, `chore: …`.
- **Do not** merge `main` into feature branches unexpectedly; open a PR.
- **Do not** commit secrets, keys, credentials, or private drawings.

## 5. Code and Documentation Review

Before opening a PR, ensure:

1. Documentation is internally consistent and links resolve.
2. Equations have inputs, units, assumptions, and edge cases.
3. Tests are specified for each rule.
4. No confidential or redundant material is included.

## 6. Document Conventions

- Headers match the document purpose.
- Use tables for structured data.
- Italics for emphasis only when required.
- No unexplained jargon; define terms.

## 7. Questions and Support

Open a GitHub issue or comment on the relevant document.

---

*Last updated: 12 November 2026*
