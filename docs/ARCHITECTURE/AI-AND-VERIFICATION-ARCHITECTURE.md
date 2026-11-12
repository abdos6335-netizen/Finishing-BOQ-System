# AI & Verification Architecture

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Principles

1. **AI is an assistant, not a calculator.** AI proposes, and the deterministic engine computes.
2. **Verification is independent.** The verification path uses a different calculation method where possible, so that errors in the primary path do not quietly pass.
3. **Human approval is required** for any uncertain or divergent result.

---

## 2. Separation

| Component | Role | Uses AI? |
|-----------|------|----------|
| Primary calculation engine | Computes quantity, cost using formulas | No (deterministic) |
| Verification engine | Re-derivation of the same rule path from the source, flagging when it differs from the primary | No (or uses only from deterministic checks) |
| AI assistant | Extracts text, suggests room boundaries, proposes units, flags gaps | Yes (for interpretation tasks only) |

## 3. What AI Does

AI is used for:
- Reading text from drawings (notes, labels, size annotations).
- Suggesting room boundaries (proposal, not final).
- Proposing item types from the notes.
- Flagging missing or insufficient data.

AI does **not**:
- Calculate final quantities.
- Approve a BOQ.
- Compute costs.

## 4. Verification Architecture

The Verification Engine:
1. Re-reads the same source (drawing + entered measurements).
2. Applies a different path or re-derives the quantity (e.g., if the primary path uses wall gross area, then the verification recalculates from the openings × perimeter).
3. Compares results:
   - If difference within tolerance → "Verified".
   - If difference exceeds tolerance → "Discrepancy: Needs Decision".
4. Stores the decision history.

## 5. Trust & Review Metadata

Each result stores:
- **source**: how the data was obtained (drawing, user, AI suggestion, default).
- **dimension**: extracted or entered dimension.
- **formula**: which rule produced it.
- **trust**: 0–1 (composite of source confidence, data coverage, verification pass).
- **status**: fixed, tentative, needs review.
- **diff_reason**: explanation of any discrepancy.
- **history**: user, timestamp, decision.

## 6. Decision Flow

```
AI reading drawing
   ↓
Extract dimensions, text, gaps
   ↓
Present to user (with source notation)
   ↓
User confirms / corrects (audit record)
   ↓
Primary engine computes quantity
   ↓
Verification engine recomputes independently
   ↓
If discrepancy → "Needs Decision" (user)
   ↓
If match → mark as fixed / verified
```

## 7. Incident Handling

- Result allowance difference across rules is a flag to the human, not an automatic fix.
- Human decides whether to accept the calculation, enter a correction, or escalate.

## 8. Non-goals

- Full automation of estimation without human review.
- Complete replacement of verifying engineers.

---

*Last updated: 12 November 2026*
