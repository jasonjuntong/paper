# USER-003 — Forgot/reset password (custom flow + Resend)

**Domain:** user
**Status:** Partial — verify reset-password page + Resend
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
- [ ] Submitting an email always shows the same "Check your email" success state regardless of whether the email exists.
- [ ] Reset email is a branded Resend transactional email linking to a Scolar-hosted `/reset-password` URL (no Firebase-hosted page).
- [ ] `/reset-password` validates the code, enforces min-8 password + confirm, and redirects to `/login` on success.
- [ ] Expired/invalid code shows a clear error with a path to request a new email.

## Affected files
- `src/components/auth/forgot-password-form.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx` (verify/new)
- `src/app/api/auth/forgot-password/route.ts` (verify/new)
- Resend integration in `src/lib/`
