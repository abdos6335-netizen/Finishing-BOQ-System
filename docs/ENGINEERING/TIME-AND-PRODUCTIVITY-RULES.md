# Time & Productivity Estimation Rules

**Version:** 1.1 Draft — project rates require calibration  
**Last reviewed:** 12 November 2026

## 1. Purpose

Provide transparent duration and resource estimates. A calculated duration is a planning estimate, not a guaranteed completion date.

## 2. Required activity data

Each activity should define:
- Work item and measurable quantity with source.
- Unit and approved productivity rate.
- Rate source, date, location, work conditions, and confidence.
- Crew composition and effective crew size.
- Work calendar, shifts, working hours, and non-working days.
- Predecessors, successors, access/readiness constraints, and required approvals.
- Work zones and possible interference with other trades.
- Risk/uncertainty and any explicit contingency policy.

## 3. Base calculation

When productivity is expressed as quantity per crew-day:

`BaseDurationDays = Quantity / CrewProductivityPerDay`

When productivity is expressed per worker-day:

`BaseDurationDays = Quantity / (RatePerWorkerDay × EffectiveCrewSize)`

The rate definition must state whether it is per worker, crew, shift, or machine. Do not multiply by crew size twice.

## 4. Schedule logic

- Calculate earliest start/finish from dependencies and the project work calendar.
- Model overlaps only where work fronts, access, curing/drying, inspections, and trade interfaces permit.
- Resource constraints may delay an otherwise dependency-ready activity.
- Distinguish working duration from elapsed calendar duration.
- Record baseline and subsequent revisions; progress updates must not silently rewrite the baseline.

## 5. Uncertainty and risk

Productivity rates are project- or organization-curated and must retain provenance. If a rate is unavailable, return an unpriced/unestimated duration or an explicitly labeled provisional range; do not invent a universal productivity value. Risk allowances must be separate from base duration and tied to a documented risk method.

## 6. Validation

Check unit compatibility, positive quantities/rates, crew assumptions, calendar validity, dependency cycles, and impossible date constraints. Show the rate and assumptions behind every duration.

## 7. Non-goals

This model does not guarantee contractor performance or replace a detailed construction programme prepared and approved by the project team.
