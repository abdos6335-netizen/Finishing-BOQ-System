# Plumbing and HVAC Estimation Rules

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Estimating plumbing and HVAC quantities. Rules require sufficient data; in the absence of data, results are marked "Tentative" until confirmation.

## 2. Inputs

- Number of rooms
- Number of washbasins, WCs, showers
- Pipe route
- Panel location
- Duct route (HVAC)

## 3. Rules

### 3.1 Plumbing (Sanitary)
- **Points** (washbasin, WC, shower): count from the drawing or user input.
- **Pipe:** pipe length = sum of route + padding.
- **Connection:** by drawing count.

### 3.2 HVAC
- **Duct:** route + padding (main duct, branch)
- **Insulation:** area × thickness
- **Refrigerant:** route length

---

*Last updated: 12 November 2026*
