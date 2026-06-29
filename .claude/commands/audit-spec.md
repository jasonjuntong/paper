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

Group findings by tier. Format **every** item as a checkbox with the spec
location on the top line, then one labelled sub-bullet per part — never pack
the problem, fix, and resolution into a single paragraph:

```
- [ ] <spec file + section>
  - **Problem:** <one line>
  - **Proposed fix:** <one line>
  - **Resolution:** <left blank while open; filled when DECIDED>
```

When an item is DECIDED, check the box (`- [x]`) and fill the **Resolution**
line with the date + the decision (e.g. `RESOLVED 2026-06-29 — single attempt,
no retries`) or `ACCEPTED-RISK — <why>`. Keep the **Problem** and
**Proposed fix** lines intact so the history stays readable.

## Blocker
Would cause a wrong or divergent implementation. Must fix before tasking.
- [ ] <spec file + section>
  - **Problem:** ...
  - **Proposed fix:** ...
  - **Resolution:** ...

## Should-fix
Real, but coding could start and patch later.
- [ ] <spec file + section>
  - **Problem:** ...
  - **Proposed fix:** ...
  - **Resolution:** ...

## Nit
Wording, style, or hypothetical edge.
- [ ] <spec file + section>
  - **Problem:** ...
  - **Proposed fix:** ...
  - **Resolution:** ...

End with a CONVERGENCE verdict: counts of Blocker / Should-fix / Nit. If a
previous audit exists, compare severity — are findings getting more marginal?
State plainly CONVERGED (zero new blockers) or NOT CONVERGED.