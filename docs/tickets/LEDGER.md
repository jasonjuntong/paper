# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-07-04. PAPER-010 completed (paper visibility derivation: `checkVisibility` now returns a `list` tier for public orgs the user hasn't joined — derived from the denormalized `publicOrgIds`, dormant-but-correct until PAPER-015 populates it, see nuance N-003 — with pure `accessTier`/`isDedupVisible` helpers; PDF proxy gated to full-only and the commit borderline branch to `isDedupVisible`; unit `paper-dedup.test.ts` list/precedence + integration `paper-dedup.test.ts` public-org list-only/member-full/private-none; e2e N/A — no list-only UI surface yet). Added INFRA-002 (code review, recurring rounds; Round 1 open). PAPER-018 completed (read tracking: e2e `read-tracking.spec.ts` — seed→empty state→open (touch)→surfaces, plus two-paper recency ordering + re-open reorder — and component `continue-reading.test.tsx` — empty state, paperId href, keyword normalization). PAPER-006 completed (library entry CRUD: three component specs — `library-client` filter + view-toggle/`localStorage`, `edit-paper-dialog` validation/submit, `delete-paper-dialog` state machine — plus `e2e/library-crud.spec.ts` seeding entries into the emulator then driving browse → detail → edit → delete)._

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`.

| Bucket | Count |
|--------|-------|
| ✅ Completed | 15 |
| 🟡 In progress | 13 |
| ⬜ Backlog | 24 |
| **Total** | **52** |

## Needs attention

Only tickets with something non-obvious to track.

- **ORG-025 — cross-cutting, intentionally iterative.** Stays in progress by design; it accretes security rules + indexes as each feature lands. Its `/handles` and `/orgs` rules are now covered by the INFRA-001 security-rules suite (`tests/rules/`).
- **INFRA-002 — code review, recurring rounds.** Intentionally never `Done`; stays in progress and gains a new `## Round N` section each pass. **Round 1 is open** (opened 2026-07-03) — scope TBD, findings to be recorded and follow-up tickets filed from there.

## Project notes

- **Tests are now a hard Definition of Done (2026-07-02).** Default bar is a unit **and** an e2e test; a ticket may drop a lane only when it genuinely doesn't apply, documented in its own `## Test coverage` section (integration/rules lanes count where they fit). The **unit lane accepts a React component test** (`@testing-library/react` + jsdom) as well as a pure-logic test.
- **Component-test lane added + re-audit (2026-07-02).** Stood up component testing (`@testing-library/react`, `@testing-library/user-event`, jsdom; `vitest.config.ts` → jsdom, `vitest.setup.ts`). Two component specs so far: `login-form.test.tsx` (USER-002) and `register-form.test.tsx` (USER-001) — both keep their tickets `Done`. **ORG-006** names a component test as its required unit lane (still `Partial`); **PAPER-006** now has its three component specs and is `Done`.
- **Acceptance-criteria reconciliation (2026-07-02).** Swept every ticket's `## Acceptance criteria` checkboxes against the actual code so a box is ticked only where the behavior is implemented. Fully-implemented (tests-only-gap) `Partial` tickets are now fully checked; genuinely-partial ones have only their built criteria ticked (per-criterion detail lives in each ticket). **ORG-002** (edit name/description) was found unimplemented — the `[orgId]` PATCH + `org-manage.tsx` only handle visibility/join policy — so it moved **`Partial` → `Todo`** (0/2 checked).
>   - **`Done` (15):** INFRA-001 (harness), USER-001 (component + e2e + integration), USER-002 (component + e2e), USER-003, USER-004 (e2e both enumeration surfaces; unit N/A), USER-005 (both lanes), USER-007 (unit + integration + rules; e2e N/A — no standalone UI), PAPER-001 (unit `pdf-upload.test.ts` + e2e `add-paper.spec.ts`), PAPER-002 (unit `groq.test.ts` + component `add-paper-dialog.test.tsx` + e2e `paper-details-review.spec.ts`), PAPER-003 (unit `paper-dedup.test.ts` `decideVisibility` + integration `paper-dedup.test.ts`; e2e N/A — offline commit can't embed/store), PAPER-005 (unit `gemini.test.ts` — pure `buildPaperEmbeddingInput` + stubbed-provider `generatePaperEmbedding`; e2e N/A — external provider), PAPER-004 (unit `paper-dedup.test.ts` `classifyDedupDistance` + component `add-paper-dialog.test.tsx` borderline confirm; e2e N/A — vector search not emulated), PAPER-006 (component `library-client.test.tsx` + `edit-paper-dialog.test.tsx` + `delete-paper-dialog.test.tsx` + e2e `library-crud.spec.ts` seed→browse→detail→edit→delete), PAPER-018 (component `continue-reading.test.tsx` empty-state/paperId-href/keyword-normalization + e2e `read-tracking.spec.ts` open→touch→surfaces + recency ordering/reorder), PAPER-010 (unit `paper-dedup.test.ts` `decideVisibility` list-tier/precedence + `accessTier` + `isDedupVisible`; integration `paper-dedup.test.ts` `checkVisibility` public-org list-only / member-full / private-none / in-library precedence; e2e N/A — no list-only UI surface yet).
>   - **`Partial` (from the old `Done` set):** PAPER-009, ORG-001, ORG-004, ORG-006, ORG-014 — each ticket's Status line + `## Test coverage` section state the precise gap and any lane that legitimately doesn't apply.
- **Testing infrastructure ([INFRA-001](./infra/INFRA-001-test-emulator-playwright.md)) — done.** JDK installed (Temurin 25) and the Firebase emulator (Auth + Firestore) boots via `firebase.json`. All four lanes are live: `npm test` (pure units, src/**), `npm run test:rules` (security-rules, `tests/rules/`), `npm run test:integration` (registration transaction, `tests/integration/`), and `npm run test:e2e` (Playwright, offline `demo-paper` project). The emulator-backed lanes each wrap their runner in `firebase emulators:exec`. No longer a standing gap.
