# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-07-02._

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`.

| Bucket | Count |
|--------|-------|
| ✅ Completed | 15 |
| 🟡 In progress | 12 |
| ⬜ Backlog | 24 |
| **Total** | **51** |

## Needs attention

Only tickets with something non-obvious to track.

- **USER-007 — verification gap now closed.** Mechanism + rules shipped earlier; the automated proof that was missing (transactional reserve, deletion tombstone, `/handles` security rules) now lands with INFRA-001's integration + security-rules lanes: `tests/integration/registration.test.ts` exercises the reserve/no-orphan-on-race/tombstone paths against the emulator, and `tests/rules/firestore-rules.test.ts` asserts the `/handles` read-open / client-write-locked rules. No open verification gap remaining.
- **PAPER-004 — scope reopened (now in progress).** Was completed, then reopened when the borderline-dedup tier (0.85–0.92 confirm) was promoted into the spec. The implementation predates the requirement.
- **ORG-025 — cross-cutting, intentionally iterative.** Stays in progress by design; it accretes security rules + indexes as each feature lands. Its `/handles` and `/orgs` rules are now covered by the INFRA-001 security-rules suite (`tests/rules/`).

## Project notes

- **Testing infrastructure ([INFRA-001](./infra/INFRA-001-test-emulator-playwright.md)) — done.** JDK installed (Temurin 25) and the Firebase emulator (Auth + Firestore) boots via `firebase.json`. All four lanes are live: `npm test` (pure units, src/**), `npm run test:rules` (security-rules, `tests/rules/`), `npm run test:integration` (registration transaction, `tests/integration/`), and `npm run test:e2e` (Playwright, offline `demo-paper` project). The emulator-backed lanes each wrap their runner in `firebase emulators:exec`. No longer a standing gap.
