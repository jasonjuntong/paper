# USER-002 — Login (email + password)

**Domain:** user
**Status:** Done
**Spec:** docs/specs/user/user.md#authentication
**Depends on:** —

## Context
Email + password login only. Establishes an httpOnly session cookie verified server-side.

## Scope / Tasks
- Login form (email, password) against Firebase Auth.
- Exchange the ID token for an httpOnly session cookie; verify it server-side.
- "Forgot password?" link to `/forgot-password`.

## Acceptance criteria
- [ ] Valid credentials sign the user in and establish a session.
- [ ] Session is verified server-side on protected routes.
- [ ] Only email + password is supported (no OAuth / magic links).

## Affected files
- `src/components/auth/login-form.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/lib/session.ts`
- `src/app/api/auth/session/route.ts`
