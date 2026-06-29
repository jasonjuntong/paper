# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-06-29._

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`.

| Bucket | Count |
|--------|-------|
| ✅ Completed | 13 |
| 🟡 In progress | 13 |
| ⬜ Backlog | 24 |
| **Total** | **50** |

## Needs attention

Only tickets with something non-obvious to track.

- **USER-007 — verification gap, not an implementation gap.** Mechanism + rules shipped and counted as completed, but only 1 of 4 acceptance criteria is fully proven (the pure validators, via Vitest). The transactional reserve, the deletion tombstone, and the `/handles` security rules can't be verified without the Firebase emulator, which needs a JDK that isn't installed. Deferred, not blocked by code.
- **USER-001 — scope reopened (now in progress).** Was completed, then moved back when the `@handle` requirement was promoted into the spec after the fact. Now depends on USER-007; still needs the handle field + live availability UI + server-side registration ordering.
- **PAPER-004 — scope reopened (now in progress).** Was completed, then reopened when the borderline-dedup tier (0.85–0.92 confirm) was promoted into the spec. The implementation predates the requirement.
- **ORG-025 — cross-cutting, intentionally iterative.** Stays in progress by design; it accretes security rules + indexes as each feature lands. Also home to the `/handles` rules whose verification is pending (see USER-007).

## Project notes

- **Testing infrastructure:** only Vitest pure-unit tests exist today. Integration (Firestore emulator), security-rules (`@firebase/rules-unit-testing`), and e2e (Playwright) are not set up — the emulator-based lanes are blocked until a JDK is installed. This is why some completed / in-progress tickets still have unproven Firestore and security-rule behavior.
