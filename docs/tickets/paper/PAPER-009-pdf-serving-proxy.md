# PAPER-009 — PDF serving proxy (access-gated, Range, ETag)

**Domain:** paper  
**Status:** Done  
**Spec:** docs/specs/paper/paper.md#4-pdf-reader  
**Depends on:** PAPER-010

## Context
`/api/papers/{paperId}/file` streams the PDF from Cloud Storage through the server (same-origin, no signed URLs). Access is re-checked on every request via `checkVisibility`; supports Range and revalidation so reopen is near-instant while revocation is enforced.

## Scope / Tasks
- Run `checkVisibility` first on every request (and on `If-None-Match` revalidation); `403` if denied.
- Honor HTTP Range (`206 Partial Content`); stream bytes (no full buffering).
- `Cache-Control: private, no-cache`; `ETag` from the object `md5Hash`; `304` when allowed + unchanged.

## Acceptance criteria
- [x] Every request (including revalidation) re-runs the access check; lost access → `403`, cached copy not served.
- [x] Range requests return `206`; allowed unchanged revalidation returns `304` with no body.
- [x] Responses are `private, no-cache` with a stable ETag.

## Affected files
- `src/app/api/papers/[paperId]/file/route.ts`
- `src/lib/paper-dedup.ts` (`checkVisibility`)

## Test coverage
- **Unit — done.** `src/app/api/papers/[paperId]/file/route.test.ts` drives the `GET` handler with `getSession`, `checkVisibility`, and firebase-admin mocked: `401` no session, `403` for both `none` and `list`-only tiers, `404` missing `storagePath`, `304` on matching `If-None-Match` (with `304`-vs-`403` precedence proving access is re-checked before revalidation), `206`/`416` Range with the slice passed through to `createReadStream`, and `200` full stream with `private, no-cache` + a stable `md5Hash` ETag. The pure gate logic the route relies on (`accessTier`/`decideVisibility`) is already covered by `src/lib/paper-dedup.test.ts` (PAPER-010).
- **Integration — N/A.** Cloud Storage is not emulated (no `storage` block in `firebase.json`) and `getSession` → `verifySessionCookie` can't be forged when the handler is invoked directly, so an emulator-backed test would exercise firebase-admin/emulator behavior (a library) rather than our logic. The Firestore-backed `checkVisibility` the route calls is separately integration-tested in `tests/integration/paper-dedup.test.ts` (PAPER-010); the route's own HTTP semantics are fully asserted with mocked collaborators above. Same lane-drop rationale as PAPER-003/004/010.
- **Browser e2e — N/A.** Range/ETag/304 are HTTP-level assertions with no distinct UI surface; PDF loading in the UI is exercised via the reader (PAPER-008).

## Test commands
- **Unit:**
  - Lane: `npm test`
  - Single file: `npx vitest run 'src/app/api/papers/[paperId]/file/route.test.ts'`
- **E2E:** none — lane is N/A (see Test coverage above).
