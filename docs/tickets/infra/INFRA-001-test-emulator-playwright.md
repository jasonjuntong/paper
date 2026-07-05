# INFRA-001 — Test infrastructure: Firebase emulator + Playwright

**Domain:** infra (cross-cutting)  
**Status:** Done  
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
- [x] `firebase.json` defines Auth + Firestore emulators and they boot locally with one command.
- [x] Security-rules suite runs against the emulator and asserts the permissions table + `/handles` rules (allowed reads, denied client writes).
- [x] Integration lane proves the registration transaction: handle reserved, user doc written, and no orphaned Auth user/handle on a simulated race.
- [x] Playwright e2e covers registration → verification → login → app access, and asserts an unverified user is blocked from the `(app)` area.
- [x] Missing JDK produces a clear, actionable error rather than an opaque emulator crash. *(native firebase-tools behavior — the CLI prints "the Emulator requires Java version 11 or higher"; JDK requirement now documented in README.)*
- [x] `test:rules`, `test:integration`, and `test:e2e` scripts exist and are documented.

## Progress (2026-07-01)
**Done — emulator + e2e lane:**
- Installed **Temurin JDK 25** (the emulator's Java prerequisite; standing blocker cleared).
- Added the `emulators` block to `firebase.json` (Auth 9099, Firestore 8080, UI 4000); boots with `firebase emulators:start`.
- Wired both SDKs to the emulators, env-gated so production is byte-identical:
  `src/lib/firebase/client.ts` connects on `NEXT_PUBLIC_FIREBASE_EMULATOR=true`;
  `src/lib/firebase/admin.ts` skips the real service-account cert when `FIREBASE_AUTH_EMULATOR_HOST` is set.
- Added **Playwright**: `playwright.config.ts` (boots `next dev` with demo/emulator env; `demo-paper` project = fully offline), `e2e/auth.spec.ts` (register → verify → login → app, + unverified-blocked path), `e2e/helpers/emulator.ts` (state reset + pulls the verification `oobCode` from the Auth emulator REST API — no real email).
- Scripts `test:e2e` / `test:e2e:ui` wrap Playwright in `firebase emulators:exec --project demo-paper` (boot → run → teardown). **2/2 e2e pass, fully hermetic.**
- `.gitignore` covers emulator + Playwright artifacts.

**Remaining:** security-rules suite (`@firebase/rules-unit-testing`, `test:rules`) and the emulator integration lane (`test:integration`).

## Progress (2026-07-02) — ticket complete
**Done — security-rules + integration lanes:**
- Added **`@firebase/rules-unit-testing`** + `vitest.rules.config.ts` + `tests/rules/firestore-rules.test.ts` (13 specs): `/handles` read-open / client-write-denied; `/orgs` public-readable, private members-only, all writes denied; org subcollections members-only; default-deny on `/users` even for the owner. Script `test:rules` (Firestore emulator only). **13/13 pass.**
- Added `vitest.integration.config.ts` + `tests/integration/registration.test.ts` (4 specs) driving the real register `POST` against the Auth + Firestore emulators: handle + user doc written atomically; taken handle → 409 with the loser's Auth user cleaned up; **simulated race** (concurrent same-handle registers) → exactly one survivor, no orphaned Auth user/handle; tombstoned handle stays out of the pool. Hermetic — `RESEND_API_KEY` left unset so the route's send throws-and-is-caught with no network call. Script `test:integration` (Auth + Firestore). **4/4 pass.**
- Both lanes gated to their own vitest configs, so `npm test` (unit, src/**) stays fast/offline — still **23/23**. README Testing section updated with all three lanes.

## Affected files
- `firebase.json` (new — `emulators` block)
- `package.json` (add `@firebase/rules-unit-testing`, `@playwright/test`; add `test:rules` / `test:integration` / `test:e2e` scripts)
- `playwright.config.ts` (new)
- `tests/rules/` (new — security-rules specs)
- `tests/integration/` (new — emulator integration specs)
- `e2e/` (new — Playwright specs)
- `docs/tickets/README.md` / project docs (emulator + JDK setup notes)

## Test commands
- **Unit:** the whole pure/component lane (this ticket *is* the harness)
  - Lane: `npm test`
  - Single file: `npx vitest run <path>`
- **E2E:** Playwright over the offline `demo-paper` emulator
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'`
- **Integration:**
  - Lane: `npm run test:integration`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx vitest run --config vitest.integration.config.ts <path>'`
- **Rules:**
  - Lane: `npm run test:rules`
  - Single file: `firebase emulators:exec --project demo-paper --only firestore 'npx vitest run --config vitest.rules.config.ts <path>'`
