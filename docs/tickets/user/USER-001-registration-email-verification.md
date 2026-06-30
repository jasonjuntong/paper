# USER-001 — Registration + email verification

**Domain:** user
**Status:** Done
**Spec:** docs/specs/user/user.md#authentication
**Depends on:** USER-007

## Context
Email + password registration via Firebase Auth. Collects name, **handle**, email, password; sends a verification email on signup; unverified users cannot use the app. The handle is reserved via the `/handles/{handle}` mechanism (USER-007), and registration follows a strict order so a handle is **never persisted until every precondition passes**.

The verification email **must be sent server-side** (via the **Resend** library) so genuine and duplicate-email registrations return an identical response — sending client-side would require a sign-in that behaves differently for a duplicate, leaking whether the email exists (enumeration protection, USER-004). The server generates the link with `admin.auth().generateEmailVerificationLink(email, { url: APP_URL/login })` and delivers it as a branded Resend email. **Resend** has no dedicated setup ticket — this ticket (or whichever of USER-003 / ORG-023 lands first) introduces the shared `src/lib/email.ts` wiring.

## Scope / Tasks
- Registration form (name, `@handle`, email, password) with validation (handle format + XSS filter validated client- and server-side).
- Enforce the registration order (see USER-007): (1) validate inputs; (2) create the Firebase Auth user (`email-already-in-use` → silent "Check your email" success, no handle written); (3) only then reserve `/handles/{handle}` + write the user doc in a transaction (re-check inside); (4) on race-loss, delete the just-created Auth user and surface "handle already taken".
- Set display name, then send the verification email **server-side via Resend** (`generateEmailVerificationLink` → branded transactional email). No client-side `sendEmailVerification` (would break enumeration protection).
- Surface "handle already taken" to the user (unlike duplicate email, this is shown — handles are public).
- Block app access until the email is verified; verify-email landing page.

## Acceptance criteria
- [x] Registration collects name, handle, email, password and creates a Firebase Auth user with the display name set.
- [x] A taken handle is reported to the user; a duplicate email still shows the silent success state (no enumeration).
- [x] A failed registration leaves no orphaned Auth user and no orphaned handle reservation.
- [x] A verification email is sent on registration, server-side via Resend.
- [x] Unverified users cannot access the app and are routed to the verify-email state.
- [x] No OAuth or magic-link paths exist.

## Affected files
- `src/components/auth/register-form.tsx` (add handle field + validation)
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/verify-email/page.tsx`
- `src/app/api/auth/` (registration route handler — ordering + handle reservation, USER-007; calls Resend to send the verification email)
- `src/lib/email.ts` (new — shared **Resend** wiring; also used by USER-003 / ORG-023)
- `package.json` (add `resend` dependency), `.env.local.example` (add `RESEND_API_KEY`)
