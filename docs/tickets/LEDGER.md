# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-07-01._

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`.

| Bucket | Count |
|--------|-------|
| ✅ Completed | 14 |
| 🟡 In progress | 13 |
| ⬜ Backlog | 24 |
| **Total** | **51** |

## Needs attention

Only tickets with something non-obvious to track.

- **USER-007 — verification gap, not an implementation gap.** Mechanism + rules shipped and counted as completed, but only 1 of 4 acceptance criteria is fully proven (the pure validators, via Vitest). The transactional reserve, the deletion tombstone, and the `/handles` security rules still lack automated proof — the emulator is now available (JDK installed, INFRA-001), and the registration transaction is exercised by the new Playwright e2e, but the dedicated security-rules + integration suites that would assert these directly are still pending (INFRA-001 remaining lanes). Deferred, not blocked by code.
- **PAPER-004 — scope reopened (now in progress).** Was completed, then reopened when the borderline-dedup tier (0.85–0.92 confirm) was promoted into the spec. The implementation predates the requirement.
- **ORG-025 — cross-cutting, intentionally iterative.** Stays in progress by design; it accretes security rules + indexes as each feature lands. Also home to the `/handles` rules whose verification is pending (see USER-007).

## Project notes

- **Testing infrastructure ([INFRA-001](./infra/INFRA-001-test-emulator-playwright.md)):** JDK installed (Temurin 25) and the Firebase emulator (Auth + Firestore) now boots via `firebase.json`. The **Playwright e2e** lane is live (`npm run test:e2e` — registration → verify → login → app gate, offline `demo-paper` project). Still pending: the **security-rules** suite (`@firebase/rules-unit-testing`) and the **integration** lane — until those land, some completed / in-progress tickets still have unproven Firestore and security-rule behavior. Tracked as INFRA-001.
