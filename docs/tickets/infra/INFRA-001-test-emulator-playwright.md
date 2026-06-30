# INFRA-001 — Test infrastructure: Firebase emulator + Playwright

**Domain:** infra (cross-cutting)
**Status:** Todo
**Spec:** — (testing infrastructure; see LEDGER "Project notes")
**Depends on:** —

## Context
Today only Vitest pure-unit tests exist (`test`, `test:watch`). The integration, security-rules, and end-to-end lanes are unbuilt, so a large share of `Partial`/`Done` tickets carry **unproven Firestore and security-rule behavior** — transactional writes, no-orphan-on-race cleanup, `/handles` rules, the permissions table (USER-001, USER-007, ORG-025, PAPER-004, …) can only be verified against a running backend.

Two pieces are needed:
- **Firebase emulator** (Auth + Firestore) for integration tests and security-rules tests (`@firebase/rules-unit-testing`). The emulator requires a **JDK**, which is **not installed** on the current machine — this is the standing blocker called out in the LEDGER. The ticket includes documenting/installing the JDK prerequisite.
- **Playwright** for end-to-end browser flows (registration → verify-email → login → app gate is the first candidate, exercising USER-001 the way it was just verified manually).

There is no `firebase.json` yet; one must be added with an `emulators` block (Auth + Firestore ports, plus the existing `firestore.rules` / `firestore.indexes.json`).

## Scope / Tasks
- Install/document the **JDK** prerequisite (emulator dependency); fail fast with a clear message when absent.
- Add `firebase.json` with an `emulators` block (Auth + Firestore); wire to existing `firestore.rules` and `firestore.indexes.json`.
- Add **`@firebase/rules-unit-testing`** + a security-rules test suite covering the permissions table and the `/handles` read-open / client-write-locked rules (ORG-025, USER-007).
- Add an **integration** lane that runs Vitest (or the chosen runner) against the emulator: transactional handle reservation, no-orphan-on-race cleanup, user-doc writes (USER-001, USER-007).
- Add **Playwright**: config, browser install, and a first e2e spec for the registration → verify-email → login → `(app)` gate flow, including the unverified-blocked path. Seed/reset emulator state between runs.
- Add npm scripts: `test:rules`, `test:integration`, `test:e2e` (and an emulator-exec wrapper that boots the emulator, runs the suite, tears down).
- Document local + CI usage in the README (emulator boot, JDK requirement, how to run each lane).

## Acceptance criteria
- [ ] `firebase.json` defines Auth + Firestore emulators and they boot locally with one command.
- [ ] Security-rules suite runs against the emulator and asserts the permissions table + `/handles` rules (allowed reads, denied client writes).
- [ ] Integration lane proves the registration transaction: handle reserved, user doc written, and no orphaned Auth user/handle on a simulated race.
- [ ] Playwright e2e covers registration → verification → login → app access, and asserts an unverified user is blocked from the `(app)` area.
- [ ] Missing JDK produces a clear, actionable error rather than an opaque emulator crash.
- [ ] `test:rules`, `test:integration`, and `test:e2e` scripts exist and are documented.

## Affected files
- `firebase.json` (new — `emulators` block)
- `package.json` (add `@firebase/rules-unit-testing`, `@playwright/test`; add `test:rules` / `test:integration` / `test:e2e` scripts)
- `playwright.config.ts` (new)
- `tests/rules/` (new — security-rules specs)
- `tests/integration/` (new — emulator integration specs)
- `e2e/` (new — Playwright specs)
- `docs/tickets/README.md` / project docs (emulator + JDK setup notes)
