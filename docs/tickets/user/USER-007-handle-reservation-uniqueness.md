# USER-007 — Handle reservation & uniqueness (`/handles/{handle}`)

**Domain:** user  
**Status:** Done  
**Spec:** docs/specs/user/user.md#handle  
**Depends on:** —

## Context
Every user has a unique, permanent, never-recycled `@handle`. Firestore has no native unique constraint, so handles are reserved via a dedicated `/handles/{handle}` lookup collection (doc id = the **lowercased** handle, value = `{ uid }`). This ticket owns the data-model mechanism — reservation, validation, blocklist, case-insensitive uniqueness, and the deletion tombstone — that USER-001 (registration) and USER-006 (deletion) consume.

## Scope / Tasks
- `/handles/{handle}` lookup collection: doc id = lowercased handle, value `{ uid }`.
- Zod handle validator (server-side, mirrored client-side):
  - Length 3–20 chars.
  - Allowed: `a–z A–Z 0–9` and special characters; **excluded** for safety: whitespace/control chars, `/` (doc-id delimiter), the HTML/JS-injection chars `< > & " '` and backtick, and all non-ASCII (homoglyph guard).
  - **XSS guard:** reject anything outside the allowed set; handles are always HTML-escaped on output (output encoding is the primary guard, input filter is defense-in-depth).
- Reserved-handle blocklist (checked against lowercased form): `admin`, `support`, `help`, `scolar`, `api`, `app`, `system`, `root`, `me`, `you`, `null`, `undefined`.
- Case-insensitive uniqueness: lowercased form is the uniqueness key + doc id; original casing preserved for display.
- Reservation transaction helper (re-checks availability inside the transaction) — a pre-existing **or tombstoned** doc means "taken".
- Tombstone-on-deletion helper: on account deletion the doc is **retained** with `uid` cleared/marked retired (never deleted), so the handle can never be reclaimed (consumed by USER-006).

## Acceptance criteria
- [x] Handle validation enforces 3–20 chars, the allowed/excluded character set, and the reserved blocklist; invalid handles are rejected and never stored. — **unit-tested** (`src/lib/handles.test.ts`)
- [x] A `/handles/{handle}` doc reserves a handle keyed by its lowercased form; `Alice` and `alice` cannot coexist. — key normalization **unit-tested** (`normalizeHandle`); doc-level collision **integration-tested** (`tests/integration/registration.test.ts`).
- [x] Reservation runs in a transaction that re-checks availability and treats a tombstoned doc as taken. — **integration-tested** (reserve, no-orphan-on-race, tombstone-stays-taken).
- [x] Deletion tombstones the handle (uid cleared/retired) rather than removing it; the handle is never recycled. — **integration-tested** (`keeps a tombstoned handle out of the pool`).

> **Verification status:** all criteria verified. Pure validators via Vitest units (`npm test`); the Firestore-touching criteria via the emulator-backed integration lane (`npm run test:integration`) and the `/handles` security rules via the rules lane (`npm run test:rules`). Legend: `[x]` verified · `[~]` partially verified · `[ ]` not yet verified.

## Affected files
- `src/lib/handles.ts` (new — pure/isomorphic: `normalizeHandle`, `RESERVED_HANDLES`, `handleSchema`, `HandleTakenError`)
- `src/lib/handles.server.ts` (new — Admin SDK: `reserveHandleInTransaction`, `tombstoneHandle`)
- `src/lib/handles.client.ts` (new — client SDK: `checkHandleAvailability` for live form feedback)
- `src/lib/firebase/client.ts` (add `db` Firestore export for the `/handles` read exception)
- `firestore.rules` (`/handles/{handle}` — public read, server-only write; documented exception)

## Notes
- Pure validators are split from Admin-SDK code so the client form (USER-001) and server can share them without bundling `firebase-admin`.
- `/handles` is deliberately client-readable (registration is pre-auth) for live "handle available?" feedback; the authoritative reservation is still a server transaction, so the read is UX-only, never a security boundary.
- `reserveHandleInTransaction` is designed to be called inside USER-001's registration transaction (reserve handle + write user doc atomically); run all other reads before it.

## Test coverage
- **Unit** ✓ — `src/lib/handles.test.ts` covers `normalizeHandle` (case-insensitive uniqueness key) and `handleSchema` (length, allowed/excluded chars, leading-char, blocklist).
- **Integration** ✓ — `tests/integration/registration.test.ts` proves the transactional reserve, no-orphan-on-race, and tombstone-stays-taken paths against the emulator.
- **Rules** ✓ — `tests/rules/firestore-rules.test.ts` asserts `/handles` public-read / server-only-write.
- **e2e — not required.** The mechanism has no standalone UI; its only user-facing surface is registration (USER-001), which is already e2e-tested. A dedicated e2e would duplicate that flow.

## Test commands
- **Unit:** `npx vitest run src/lib/handles.test.ts`
- **E2E:** N/A — no standalone UI; handle reservation is exercised through registration.
- **Integration:** `npm run test:integration` (`tests/integration/registration.test.ts`)  ·  **Rules:** `npm run test:rules` (`tests/rules/firestore-rules.test.ts`)
