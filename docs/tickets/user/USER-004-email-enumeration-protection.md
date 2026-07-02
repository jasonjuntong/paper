# USER-004 — Email-enumeration protection

**Domain:** user  
**Status:** Partial — needs e2e for the registration duplicate-email path (unit N/A)  
**Spec:** docs/specs/user/user.md#authentication  
**Depends on:** USER-001

## Context
Neither registration nor forgot-password may reveal whether an email is already registered, to prevent user enumeration. Uniqueness is still enforced by Firebase Auth.

## Scope / Tasks
- Registration route catches `auth/email-already-in-use` and returns the same "Check your email" success response as a genuine new registration.
- Forgot-password route silently catches `auth/user-not-found` and returns the same success state (see USER-003).

## Acceptance criteria
- [x] Registering with an existing email shows the identical success state as a new registration; no error is surfaced.
- [x] No duplicate Firebase Auth account is ever created.
- [x] Forgot-password never reveals whether an email is registered.

## Affected files
- `src/app/api/auth/` (registration route)
- `src/app/api/auth/forgot-password/route.ts`

## Test coverage
- **e2e** ~ partial — `e2e/auth.spec.ts` asserts the forgot-password unknown-email case returns the identical success state. **Still needed:** an assertion that registering an already-registered email returns the same "check your email" success (no error, no enumeration).
- **Unit — not required.** Enumeration protection is cross-route behavior (same response either way), not isolatable pure logic.
