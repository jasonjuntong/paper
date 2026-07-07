# INFRA-002 — Code review (rounds)

**Domain:** infra (cross-cutting)  
**Status:** Recurring  
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

## Round 1 — <span id="round-1">complete</span>
**Date:** 2026-07-07 (opened 2026-07-03)  
**Scope:** First full pass over the whole Phase 0 tree (auth/user, paper, org, Firestore
rules/indexes, UI), reviewed in **5 domain lanes** so findings stay attributable.  
**Tooling:** `code-review` skill (Standards vs repo docs + Fowler smell baseline; Spec vs
`docs/specs/`) applied per lane, **plus** a six-skill conformance sweep — each lane anchored to
its yardstick: auth→`firebase-auth-basics`/`next-best-practices`, paper & org→
`firebase-firestore`/`next-best-practices`, rules/indexes→`firebase-firestore`/`firebase-basics`,
UI→`shadcn`/`frontend-design`. Nuances **N-001…N-004** treated as accepted (not re-flagged);
framework-only nits dropped per the CLAUDE.md testing philosophy. All `should-fix`+ findings
were re-verified against source before filing. A **6th supplementary lane** checked the whole
tree against the architecture spec `docs/specs/tech-stack.md` (Zod-at-every-boundary, Groq
single-attempt/JSON-mode, gemini-embedding-2 768-dim, client-side pdfjs, Firestore collection
shapes, tsconfig, Tailwind-v4, dependency versions) — most mandates conform.

**Findings (terse — detail lives in the linked tickets):**
- **Security (should-fix).** Public-org read rule lacks an `isSignedIn()` guard
  (`firestore.rules:33`, unauthenticated read); the `{sub=**}` catch-all exposes
  invites/joinRequests/adminTransferOffers to every member (`:46-48`). Session cookie is minted
  with no `auth_time` recency check and logout doesn't `revokeRefreshTokens`
  (`api/auth/session/route.ts`). *(Latent today — client SDK doesn't read those paths, N-004 —
  but the rules are the only client gate.)*
- **Data integrity (should-fix).** `commit` stores `hash ?? ''` from unvalidated formData
  (empty Layer-1 dedup key); `ensureLibraryEntry` is read-then-write, not transactional
  (duplicate library entries under concurrency).
- **Spec — Zod-at-every-boundary (should-fix, tech-stack lane).** Two boundaries skip the
  mandated Zod validation: the Groq extraction output is `JSON.parse`'d with `?? ''` (no schema,
  `groq.ts`), and `api/auth/session` reads `idToken` from a raw `request.json()` (no schema, and
  the parse sits outside the try → malformed body = unhandled `500`). `paperCount` is documented
  as an atomic counter but is derived via a `count()` aggregation instead (Phase-3 divergence).
  Dependency versions show only minor forward drift (`next` 16.2.7 vs pinned 16.2.6, etc.).
- **Consistency / DRY (mostly nice-to-have).** Org-profile schema/limits + form duplicated
  across routes and dialogs; raw `oklch(...)` inlined where `bg-pill` exists + assorted
  design-language drift; `aria-busy`/`<form>`/toggle-role a11y gaps where the correct pattern
  already exists elsewhere; duplicated read-only inputs, org-mark algorithm (×5), segmented
  toggles (×3), password input, email templates, and the `SESSION_COOKIE` literal.
- **Clean / accepted.** Indexes back every shipped query (deferred composites are N-003); the
  dedup core/Firestore split, handle-reservation atomicity, Next 16 conventions (`proxy.ts`,
  awaited async APIs), and the org join transaction all pass. `src/components/ui/` history shows
  no hand-edits.

**Outcomes / follow-up tickets:**
- [INFRA-003](INFRA-003-firestore-read-rule-hardening.md) — Firestore read-rule hardening (SEC).
- [USER-008](../user/USER-008-session-cookie-hardening.md) — session-cookie hardening (SEC).
- [PAPER-019](../paper/PAPER-019-paper-write-path-integrity.md) — paper write-path integrity.
- [ORG-027](../org/ORG-027-org-route-profile-consolidation.md) — org route + profile-form consolidation.
- [INFRA-004](INFRA-004-design-language-conformance.md) — design-language token conformance sweep.
- [INFRA-005](INFRA-005-accessibility-form-semantics.md) — accessibility & form-semantics pass.
- [INFRA-006](INFRA-006-shared-ui-auth-primitives.md) — extract shared UI/auth primitives (DRY).
- **Folded into existing tickets (no new ticket):** member-table client-side search that hides
  paginated matches → [ORG-026](../org/ORG-026-member-table-sort-filter.md) (preview-vs-roster
  constraint); join-request↔pending-invite collision guard → invite work
  [ORG-016](../org/ORG-016-create-invites.md)/[ORG-017](../org/ORG-017-invite-recipient-flow.md);
  unused `tombstoneHandle` → [USER-006](../user/USER-006-account-deletion-cascade.md).
  Tech-stack lane: Groq-output Zod validation → [PAPER-019](../paper/PAPER-019-paper-write-path-integrity.md);
  `api/auth/session` idToken Zod + JSON guard → [USER-008](../user/USER-008-session-cookie-hardening.md);
  `paperCount` atomic-counter divergence → [ORG-024](../org/ORG-024-paper-count-counter.md).
- **Spec doc-gaps (noted, no ticket):** `groq.ts` extra 12k-char truncation is unspecified; the
  `lastOpenedAt`/"Continue reading" feature (PAPER-018) was never written into `paper.md §4`.

## Round 2 — <span id="round-2">not started</span>
Opens on the next review pass (post-Phase-2/3 work). Scope TBD.

## Notes
- This ticket intentionally never reaches `Done`; it mirrors ORG-025's "cross-cutting, intentionally iterative" pattern. Closing it would mean we've stopped reviewing.
- Keep each round's findings terse and link out — the detail lives in the follow-up tickets, not here.
