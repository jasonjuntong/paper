# USER-003 — Forgot/reset password (custom flow + Resend)

**Domain:** user  
**Status:** Done  
**Spec:** docs/specs/user/user.md#authentication  
**Depends on:** USER-002

## Context
Fully custom, Scolar-hosted password reset — no Firebase-hosted pages. Server generates a Firebase `oobCode`, emails a branded Scolar reset link via Resend, and the user resets on `/reset-password`.

## Scope / Tasks
- `POST /api/auth/forgot-password`: `admin.auth().generatePasswordResetLink(email, { url: APP_URL/login })`, extract `oobCode`, build `APP_URL/reset-password?code={oobCode}`, send via Resend.
- Silently catch `auth/user-not-found` (enumeration protection — see USER-004); always show the same "Check your email" state.
- `/reset-password?code=` page: new password (min 8) + confirm → `confirmPasswordReset(auth, oobCode, newPassword)` → redirect to `/login`.
- Error state for expired/invalid `oobCode` (24h default) with a link back to `/forgot-password`.

## Acceptance criteria
- [x] Submitting an email always shows the same "Check your email" success state regardless of whether the email exists.
- [x] Reset email is a branded Resend transactional email linking to a Scolar-hosted `/reset-password` URL (no Firebase-hosted page).
- [x] `/reset-password` validates the code, enforces min-8 password + confirm, and redirects to `/login` on success.
- [x] Expired/invalid code shows a clear error with a path to request a new email.

## Affected files
- `src/components/auth/forgot-password-form.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx` (verify/new)
- `src/app/api/auth/forgot-password/route.ts` (verify/new)
- Resend integration in `src/lib/`

## Progress (2026-07-02) — done
Swapped the client-SDK `sendPasswordResetEmail` (which used Firebase-hosted pages) for the custom Scolar-hosted flow, mirroring the registration verify-email pattern:
- **New** `POST /api/auth/forgot-password` — Admin SDK `generatePasswordResetLink(email, { url: APP_URL/login })`, extracts the `oobCode`, rewrites to `APP_URL/reset-password?code=`, and sends a branded email via `sendEmail` (Resend). Always returns `{ ok: true }` and silently swallows `auth/user-not-found` (enumeration protection, USER-004).
- **Rewired** `forgot-password-form.tsx` to POST that route; unchanged enumeration-safe "Check your email" success state.
- **New** `reset-password/page.tsx` (reads `?code=`; missing-code → invalid Card → `/forgot-password`) + `reset-password-form.tsx` (`'use client'`): verifies the code on mount behind a Strict-Mode ref guard, min-8 password + matching confirm, `confirmPasswordReset` → redirect to `/login`; expired/used/invalid code → clear error with a "Request a new link" path.
- Verified: `tsc --noEmit` + `eslint` clean on all new/edited files. Manual emulator e2e pending as with other auth tickets; a Playwright reset-password spec is a noted follow-up (INFRA-001 lanes).

## Test commands
- **Unit:**
  - Lane: `npm test`
  - Single file: `npx vitest run src/lib/password.test.ts`
- **E2E:**
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test e2e/auth.spec.ts'`
