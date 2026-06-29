---
description: Bounded spec audit — tiered, no re-litigation
---

Read the most recent file in `./.claude/session/audits/` (if any exist).
From it:
- Items marked RESOLVED or ACCEPTED-RISK are DECIDED. Do NOT re-raise them.
- Items still open (`- [ ]`, no resolution line) must be CARRIED FORWARD
  into the new file below.

Also treat anything settled in this session as decided.

Audit `./docs/specs/` for readiness to implement. Write a NEW file
`./.claude/session/audits/<yyyy-mm-dd_hh_mm>.md` (current date/time, zero-padded).
This new file is the full current picture: carried-forward open items PLUS
any newly found ones. Do NOT edit the specs.

Group findings by tier:

## Blocker
Would cause a wrong or divergent implementation. Must fix before tasking.
- [ ] <spec file + section> — <one-line problem> → <proposed fix>

## Should-fix
Real, but coding could start and patch later.
- [ ] ...

## Nit
Wording, style, or hypothetical edge.
- [ ] ...

End with a CONVERGENCE verdict: counts of Blocker / Should-fix / Nit. If a
previous audit exists, compare severity — are findings getting more marginal?
State plainly CONVERGED (zero new blockers) or NOT CONVERGED.