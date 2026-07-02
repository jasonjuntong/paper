# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-07-02. PAPER-003 completed (extracted pure `decideVisibility` unit + emulator-backed integration lane; e2e N/A — offline commit can't embed/store)._

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`.

| Bucket | Count |
|--------|-------|
| ✅ Completed | 10 |
| 🟡 In progress | 17 |
| ⬜ Backlog | 24 |
| **Total** | **51** |

## Needs attention

Only tickets with something non-obvious to track.

- **PAPER-004 — scope reopened (now in progress).** Was completed, then reopened when the borderline-dedup tier (0.85–0.92 confirm) was promoted into the spec. The implementation predates the requirement.
- **ORG-025 — cross-cutting, intentionally iterative.** Stays in progress by design; it accretes security rules + indexes as each feature lands. Its `/handles` and `/orgs` rules are now covered by the INFRA-001 security-rules suite (`tests/rules/`).

## Project notes

- **Tests are now a hard Definition of Done (2026-07-02).** Default bar is a unit **and** an e2e test; a ticket may drop a lane only when it genuinely doesn't apply, documented in its own `## Test coverage` section (integration/rules lanes count where they fit). The **unit lane accepts a React component test** (`@testing-library/react` + jsdom) as well as a pure-logic test.
- **Component-test lane added + re-audit (2026-07-02).** Stood up component testing (`@testing-library/react`, `@testing-library/user-event`, jsdom; `vitest.config.ts` → jsdom, `vitest.setup.ts`). Two component specs so far: `login-form.test.tsx` (USER-002) and `register-form.test.tsx` (USER-001) — both keep their tickets `Done`. **ORG-006 / PAPER-006** name a component test as their required unit lane (still `Partial`).
- **Acceptance-criteria reconciliation (2026-07-02).** Swept every ticket's `## Acceptance criteria` checkboxes against the actual code so a box is ticked only where the behavior is implemented. Fully-implemented (tests-only-gap) `Partial` tickets are now fully checked; genuinely-partial ones have only their built criteria ticked (per-criterion detail lives in each ticket). **ORG-002** (edit name/description) was found unimplemented — the `[orgId]` PATCH + `org-manage.tsx` only handle visibility/join policy — so it moved **`Partial` → `Todo`** (0/2 checked).
>   - **`Done` (10):** INFRA-001 (harness), USER-001 (component + e2e + integration), USER-002 (component + e2e), USER-003, USER-004 (e2e both enumeration surfaces; unit N/A), USER-005 (both lanes), USER-007 (unit + integration + rules; e2e N/A — no standalone UI), PAPER-001 (unit `pdf-upload.test.ts` + e2e `add-paper.spec.ts`), PAPER-002 (unit `groq.test.ts` + component `add-paper-dialog.test.tsx` + e2e `paper-details-review.spec.ts`), PAPER-003 (unit `paper-dedup.test.ts` `decideVisibility` + integration `paper-dedup.test.ts`; e2e N/A — offline commit can't embed/store).
>   - **`Partial` (from the old `Done` set):** PAPER-005, PAPER-006, PAPER-009, PAPER-018, ORG-001, ORG-004, ORG-006, ORG-014 — each ticket's Status line + `## Test coverage` section state the precise gap and any lane that legitimately doesn't apply.
- **Testing infrastructure ([INFRA-001](./infra/INFRA-001-test-emulator-playwright.md)) — done.** JDK installed (Temurin 25) and the Firebase emulator (Auth + Firestore) boots via `firebase.json`. All four lanes are live: `npm test` (pure units, src/**), `npm run test:rules` (security-rules, `tests/rules/`), `npm run test:integration` (registration transaction, `tests/integration/`), and `npm run test:e2e` (Playwright, offline `demo-paper` project). The emulator-backed lanes each wrap their runner in `firebase emulators:exec`. No longer a standing gap.
