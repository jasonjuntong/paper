# USER-004 — Email-enumeration protection

**Domain:** user
**Status:** Done
**Spec:** docs/specs/user/user.md#authentication
**Depends on:** USER-001

## Context
Neither registration nor forgot-password may reveal whether an email is already registered, to prevent user enumeration. Uniqueness is still enforced by Firebase Auth.

## Scope / Tasks
- Registration route catches `auth/email-already-in-use` and returns the same "Check your email" success response as a genuine new registration.
- Forgot-password route silently catches `auth/user-not-found` and returns the same success state (see USER-003).

## Acceptance criteria
- [ ] Registering with an existing email shows the identical success state as a new registration; no error is surfaced.
- [ ] No duplicate Firebase Auth account is ever created.
- [ ] Forgot-password never reveals whether an email is registered.

## Affected files
- `src/app/api/auth/` (registration route)
- `src/app/api/auth/forgot-password/route.ts`
