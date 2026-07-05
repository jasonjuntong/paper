# PAPER-009 — PDF serving proxy (access-gated, Range, ETag)

**Domain:** paper  
**Status:** Partial — needs unit + integration (browser e2e N/A)  
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
- **Unit — needed.** `checkVisibility` (allow/deny given ownership + org membership + shares) is pure and should be unit-tested.
- **Integration — needed.** HTTP semantics of the file route: `403` on revoked access (incl. `If-None-Match` revalidation), `206` for Range, `304` for allowed-unchanged, `private, no-cache` + stable ETag.
- **Browser e2e — not the right tool.** Range/ETag/304 are HTTP-level assertions best made at the integration layer; PDF loading in the UI is exercised via the reader (PAPER-008).

## Test commands
- **Unit:** _No unit test yet._
  - Lane: `npm test`
  - Single file: `npx vitest run <path>` (add `src/…/<name>.test.{ts,tsx}`)
- **E2E:** _No e2e spec yet._
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test <name>'` (add `e2e/<name>.spec.ts`)
