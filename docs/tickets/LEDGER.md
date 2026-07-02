# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-07-02._

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`.

| Bucket | Count |
|--------|-------|
| ✅ Completed | 6 |
| 🟡 In progress | 22 |
| ⬜ Backlog | 23 |
| **Total** | **51** |

## Needs attention

Only tickets with something non-obvious to track.

- **USER-007 — now Partial under the test-DoD rule.** Mechanism + rules shipped and are well covered by unit (`src/lib/handles.test.ts`), integration (`tests/integration/registration.test.ts`), and security-rules (`tests/rules/firestore-rules.test.ts`) lanes — but it has no dedicated **e2e** spec, so it drops to `Partial` until one lands. This is the smallest remaining gap of the reclassified tickets.
- **PAPER-004 — scope reopened (now in progress).** Was completed, then reopened when the borderline-dedup tier (0.85–0.92 confirm) was promoted into the spec. The implementation predates the requirement.
- **ORG-025 — cross-cutting, intentionally iterative.** Stays in progress by design; it accretes security rules + indexes as each feature lands. Its `/handles` and `/orgs` rules are now covered by the INFRA-001 security-rules suite (`tests/rules/`).

## Project notes

- **Tests are now a hard Definition of Done (2026-07-02).** Default bar is a unit **and** an e2e test; a ticket may drop a lane only when it genuinely doesn't apply, documented in its own `## Test coverage` section (integration/rules lanes count where they fit). Applying this, then re-reviewing each ticket for which lanes actually apply, left **8 `Done` and 11 `Partial`** among the previously-`Done` set (Completed 17 → 6 overall):
>   - **Stay/return to `Done` (6 total):** USER-003, USER-005 (both lanes); **USER-007** (unit + integration + rules; e2e N/A — no standalone UI); **USER-001** (e2e + integration; no isolatable pure unit surface); **USER-002** (e2e; no pure logic); INFRA-001 (the harness).
>   - **`Partial` (11):** USER-004, PAPER-001, PAPER-003, PAPER-005, PAPER-006, PAPER-009, PAPER-018, ORG-001, ORG-004, ORG-006, ORG-014 — each ticket's Status line and `## Test coverage` section state the precise remaining gap (and any lane that legitimately doesn't apply, e.g. PAPER-005 e2e, PAPER-009 browser-e2e).
- **Testing infrastructure ([INFRA-001](./infra/INFRA-001-test-emulator-playwright.md)) — done.** JDK installed (Temurin 25) and the Firebase emulator (Auth + Firestore) boots via `firebase.json`. All four lanes are live: `npm test` (pure units, src/**), `npm run test:rules` (security-rules, `tests/rules/`), `npm run test:integration` (registration transaction, `tests/integration/`), and `npm run test:e2e` (Playwright, offline `demo-paper` project). The emulator-backed lanes each wrap their runner in `firebase emulators:exec`. No longer a standing gap.
