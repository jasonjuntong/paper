# USER-008 — Session-cookie hardening

**Domain:** user (auth)  
**Status:** Todo — **security, should-fix** (INFRA-002 Round 1, auth lane)  
**Spec:** docs/specs/user/user.md#authentication  
**Depends on:** [USER-002](USER-002-login.md) (login / session endpoint)

## Context
INFRA-002 Round 1 (auth lane, `firebase-auth-basics` conformance) flagged two hardening gaps
in the session-cookie endpoint `src/app/api/auth/session/route.ts`. Neither is exploited by
current flows, but both are standard Firebase session-cookie recommendations.

## Scope / Tasks
1. **Require a recent sign-in before minting a session cookie** (`session/route.ts:22`).
   `createSessionCookie(idToken, …)` is called on **any** valid `idToken` with no `auth_time`
   check, so an idToken minted up to an hour earlier (or replayed) can be exchanged for a
   14-day session cookie. Firebase's guidance is to only mint session cookies for *recent*
   sign-ins: after `verifyIdToken`, reject if `Date.now()/1000 - decoded.auth_time` exceeds a
   short window (e.g. 5 min) with a `401`/`403`, so the client re-authenticates.
2. **Revoke refresh tokens on logout** (`session/route.ts:41-45`). `DELETE` only clears the
   cookie; a copied cookie stays valid until expiry. `getSession` already calls
   `verifySessionCookie(cookie, true)` (checkRevoked=true, `src/lib/session.ts:12`), so calling
   `adminAuth.revokeRefreshTokens(uid)` on logout would actually be **enforced**. Resolve the
   uid from the current cookie in `DELETE` before deleting it, then revoke.
3. **Zod-validate the request body + guard JSON parse** (`session/route.ts:6-9`). `idToken` is
   read from a raw `await request.json()` with no Zod schema, violating `tech-stack.md §Zod`
   ("API route handlers validate all incoming request bodies with Zod"); worse, `request.json()`
   sits *outside* the try/catch, so a malformed body throws an unhandled `500` instead of the
   `400` the endpoint intends. Move the parse inside the guard and validate `{ idToken }` with a
   Zod schema. *(Found in INFRA-002 R1 tech-stack conformance pass.)*

## Acceptance criteria
- [ ] A stale idToken (older than the recency window) is rejected by `POST` and no cookie is set.
- [ ] A fresh sign-in still mints the session cookie as today (verified email still required).
- [ ] `DELETE` revokes the user's refresh tokens; a cookie captured before logout is rejected
      by `getSession` on the next request.
- [ ] `POST` body is Zod-validated; a malformed/empty body returns `400` (not `500`).
- [ ] Existing login/verify e2e still passes.

## Affected files
- `src/app/api/auth/session/route.ts`

## Test coverage
- **Unit (route handler) — primary.** Mock `adminAuth`; assert: stale `auth_time` → reject
  (no `createSessionCookie`); fresh → cookie set; `DELETE` calls `revokeRefreshTokens` with the
  cookie's uid then deletes the cookie.
- **e2e.** Extend the auth spec: log in, log out, confirm the app area is no longer reachable
  (cookie rejected). Integration N/A — no forgeable session offline.
