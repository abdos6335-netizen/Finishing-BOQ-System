# Material Library

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Define the material reference for the project and provide price and quantity basis for items in BOQ.

## 2. Types

| Category | Examples |
|----------|----------|
| Masonry | brick, block, stone, mortar, plastering |
| Finishing | tile, marble, wood, floor gasket |
| Equipment | windows, doors, window frames |
| Electrical | wiring, switch, socket, lamp, circuit breaker |
| Sanitary | pipes, fittings, sinks, WC, shower |
| HVAC | ducts, insulation, refrigerant, filters |
| Labor | masonry, plastering, tiling, painting, cleaning |
| Equipment | generator, pump, mixer |

## 3. Data

| Field | Description |
|-------|-------------|
| code | unique within category |
| name | material name |
| unit | unit of measurement |
| unit_price | unit cost (user-curated, audited) |
| default_waste% | standard waste rate |
| notes | source, validity |

## 4. Rules

1. Unit price is a user-curated estimate (or supplied by vendor), not AI.
2. Waste% given is a default value, subject to adjustment.
3. Items must carry an audit trail for unit_price.

---

*Last updated: 12 November 2026*
