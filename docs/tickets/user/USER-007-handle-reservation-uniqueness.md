# USER-007 — Handle reservation & uniqueness (`/handles/{handle}`)

**Domain:** user
**Status:** Done — mechanism + rules shipped; exercised end-to-end when USER-001 lands
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
- [ ] A `/handles/{handle}` doc reserves a handle keyed by its lowercased form; `Alice` and `alice` cannot coexist.
- [ ] Handle validation enforces 3–20 chars, the allowed/excluded character set, and the reserved blocklist; invalid handles are rejected and never stored.
- [ ] Reservation runs in a transaction that re-checks availability and treats a tombstoned doc as taken.
- [ ] Deletion tombstones the handle (uid cleared/retired) rather than removing it; the handle is never recycled.

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
