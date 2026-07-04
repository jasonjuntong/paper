# INFRA-002 — Code review (rounds)

**Domain:** infra (cross-cutting)  
**Status:** Partial  
**Spec:** — (quality process; recurring)  
**Depends on:** —

## Context
The backlog has grown to ~51 tickets with a mix of `Done`, `Partial`, and `Todo` work landing across `user/`, `paper/`, and `org/`. As features accumulate, we want periodic, deliberate passes over the codebase to catch drift the per-ticket flow misses — spec/code mismatches, inconsistent patterns across domains, dead or duplicated code, security-rule gaps, and test-coverage holes.

This ticket is **recurring and iterative by design.** It is never fully `Done`; it stays `Partial` and accretes a new round each time we run one. Each round reviews the state of the codebase at that point in time, records findings, and spins off follow-up tickets (or fixes) for anything actionable. Think of it like a periodic health check: each round is a snapshot, and the ticket is the running log of all checks.

## How rounds work
- A **round** is one full review pass over the current codebase (or an agreed subset).
- Each round gets its own `## Round N` section below with: date, scope, reviewer/tooling used, findings, and outcomes (follow-up tickets filed or fixes applied inline).
- Reviews run along the project's two standing axes (see the `code-review` skill): **Standards** (does the code follow this repo's documented conventions — CLAUDE.md rules, shadcn `ui/` no-edit rule, Next.js 16 conventions, test-lane Definition of Done?) and **Spec** (does the code match `docs/specs/`?).
- Findings that need work become their own tickets and are linked from the round; the round itself just records them.

## Scope / Tasks (per round)
- Pick the review scope (whole tree, or a domain / phase / recent diff).
- Run the two-axis review (Standards + Spec), using the `code-review` skill where it fits.
- Record findings in a new `## Round N` section: what was reviewed, what was found, severity.
- File follow-up tickets for actionable findings and link them from the round.
- Update this ticket's `Last round` line and the LEDGER note.

## Round 1 — <span id="round-1">in progress</span>
**Date:** 2026-07-03  
**Scope:** _TBD — first full pass over the current codebase._  
**Tooling:** `code-review` skill (Standards + Spec axes).  

**Findings:** _to be filled in as the round runs._

**Outcomes / follow-up tickets:** _to be filled in._

## Notes
- This ticket intentionally never reaches `Done`; it mirrors ORG-025's "cross-cutting, intentionally iterative" pattern. Closing it would mean we've stopped reviewing.
- Keep each round's findings terse and link out — the detail lives in the follow-up tickets, not here.
