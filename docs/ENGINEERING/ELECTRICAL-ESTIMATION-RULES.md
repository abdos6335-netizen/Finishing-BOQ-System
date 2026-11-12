# Electrical Estimation Rules

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

Estimate electrical quantities. Rules require data from the drawing; where data is missing, results are marked as "Tentative" pending review.

## 2. Inputs

- Points (lights, sockets)
- Circuits (number, length per circuit)
- Cable length
- Equipment (ladder, panel, control)
- Lighting / power design (boxes, etc.)

## 3. Rules

### 3.1 Points
- Formula: `points = Σ(points for room)`
- Unit: point

### 3.2 Circuits
- Formula: `circuits = ceiling(room area / per circuit)`.
- Notes: ceiling rules based on standard or drawing.

### 3.3 Cable
- Formula: `cable = Σ(circuit length)`
- Add a wrap-up factor to the total.

### 3.4 Equipment
- Points and equipment per drawing.

## 4. Non-Goals (v1)

- Electrical excavations (conduits, etc.) are not estimated from drawings without data.

---

*Last updated: 12 November 2026*
