# Scolar — User

> Domain: `user/`. Related domains: `org/`, `paper/`.
> Part of the Scolar specs (`docs/specs/`).
> See also: [Paper](../paper/paper.md) | [Org Overview](../org/org-overview.md)

---

## Authentication

Handled by **Firebase Authentication**. The only supported method is **email + password**.

**Registration collects:**
- **Name** — display name; how Scolar addresses and identifies the user across the app
- **Handle** — a unique `@handle` (see [Handle](#handle) below)
- **Email**
- **Password**

**Email verification:**
- Required before access — unverified users cannot use the app
- A verification email is sent upon registration; the user must confirm it to proceed

**Duplicate email at registration:**
- Registering with an email that already belongs to an existing account **always shows the same "Check your email" success state** as a genuine new registration — no error is ever surfaced to the person filling out the form
- This is intentional: revealing whether an email is registered would enable user enumeration attacks
- Uniqueness is enforced by Firebase Authentication — no duplicate account is ever created
- The server Route Handler catches the `auth/email-already-in-use` error from Firebase and returns the same success response as a genuine registration, intentionally suppressing the error

**Login:**
- Email + password only

**Forgot password flow:**

Scolar uses a fully custom password reset experience — no Firebase-hosted pages involved.

1. User clicks "Forgot password?" on the login screen → taken to `/forgot-password`
2. User submits their email address
3. Server Route Handler (`POST /api/auth/forgot-password`):
   - Calls `admin.auth().generatePasswordResetLink(email, { url: APP_URL/login })` to obtain a Firebase-signed `oobCode`
   - Silently catches `auth/user-not-found` — **never reveals whether an email is registered** (same enumeration protection as registration)
   - Extracts the `oobCode` from the generated link and builds a Scolar-hosted reset URL: `APP_URL/reset-password?code={oobCode}`
   - Sends a branded transactional email via **Resend** containing a single CTA button linking to that URL
4. The UI always shows the same "Check your email" success state regardless of outcome
5. User clicks the link in the email → lands on `/reset-password?code={oobCode}` (on Scolar's own domain)
6. User enters a new password (minimum 8 characters) and confirms it
7. Client calls `confirmPasswordReset(auth, oobCode, newPassword)` — Firebase validates the code and updates the password
8. On success → redirect to `/login`
9. On error (expired or invalid code) → show a clear error message with a link back to `/forgot-password` to request a new email

**oobCode expiry:** Firebase's default is **24 hours**. An expired code triggers the error state in step 9.

**Not supported:**
- Google OAuth or any other OAuth provider
- Magic links

---

## Handle

Every user has a unique **`@handle`**, separate from their display name, collected at registration.

- **Required at registration** — a user cannot be created without a handle; uniqueness is enforced (no two users share a handle).
- **Permanent (immutable):** once set at registration, a handle can never be changed. It is a stable, public-facing identity that other users and future features (mentions/tagging) can rely on. There is no rename flow.
- **Never recycled:** a handle is **retired permanently** once claimed — even after the owner deletes their account it is **not** released back into the pool (see [Account Deletion](#account-deletion)). This prevents a new user from taking a known person's old handle and being mistaken for them. There is no way to reclaim a previously-used handle.
- **Format:** **3–20 characters**, from a safe ASCII set — letters (`a–z`, `A–Z`), digits (`0–9`), and special characters. **Must start with a letter** (`a–z`, `A–Z`) — no leading digit or special character (keeps handles readable and avoids odd leading punctuation); the remaining characters may be letters, digits, or the allowed special characters. **Excluded** for safety: whitespace and control characters; `/` (it is the `/handles/{handle}` doc-id delimiter); the HTML/JS-injection characters `< > & " ' ` and the backtick; and any non-ASCII characters (blocked to prevent Unicode-homoglyph look-alike handles). The leading `@` is presentation only — it is not stored as part of the handle value.
- **XSS guard:** the handle is validated server-side (Zod) against the allowed set above at registration — anything outside it is rejected and never stored. Because handles are user-supplied and rendered widely, they are **always HTML-escaped on output**; the input filter is defense-in-depth, output encoding is the primary guard.
- **Case-insensitive uniqueness:** uniqueness is enforced on the **lowercased** form, so `Alice` and `alice` cannot both exist (prevents case-only impersonation). The lowercased form is the uniqueness key and the `/handles/{handle}` doc id; the user's original casing is preserved for display.
- **Reserved handles:** a small blocklist of handles is rejected at registration (checked against the lowercased form) — Scolar/system terms and route-collision risks such as `admin`, `support`, `help`, `scolar`, `api`, `app`, `system`, `root`, `me`, `you`, `null`, `undefined`. Because handles are permanent and never recycled, this list is enforced from day one so reserved identities can't be grabbed first-come.
- **Why separate from name:** display names are not unique and can change, so they cannot reliably identify a specific user; the handle provides a consistent, stable identifier.
- **Uniqueness enforcement (data model):** Firestore has no native unique constraint, so handles are reserved via a dedicated `/handles/{handle}` lookup collection (doc id = the lowercased handle, value = `{ uid }`). A pre-existing **or tombstoned** `/handles/{handle}` doc means the handle is taken; registration is rejected with a "handle already taken" error. (Unlike duplicate **email**, a taken handle **is** surfaced to the user — it must be, so they can pick another; this is not an enumeration concern since handles are public by design.)
- **Never persisted until registration fully succeeds — order matters:**
  1. **Validate** inputs first (handle format + XSS filter, email, password) — reject before touching any account.
  2. **Create the Firebase Auth account** (email validity + uniqueness are enforced here). On `auth/email-already-in-use`, return the **silent "Check your email" success** and **stop — no handle is written** for a duplicate-email attempt.
  3. **Only then** reserve `/handles/{handle}` together with the user doc in a **transaction**, re-checking availability *inside* the transaction to catch races.
  4. If the handle was taken in that race, **delete the just-created Auth account** and surface "handle already taken" — so a failed registration leaves **no orphaned Auth user and no orphaned handle reservation**.
  The handle reservation is always the **final, gated write**: never saved until the email/auth step and the availability check have both passed.

---

## Users (App-Wide)

- **No global roles** — all users are equal at the app level
- A user's role/permissions only exist *within an Org* (see Org specs)
- **User profile data:**
  - Name (display name, set at registration)
  - Handle (unique `@handle`, set at registration, immutable — see [Handle](#handle))
  - Email
  - No avatar
  - **Notification email preference** (`notificationPrefs.email`, default on) — toggles whether high-priority Org events are also emailed; the in-app channel is always on. See [Org Papers & Permissions › Notifications](../org/org-papers-permissions.md#notifications).
- **Keyword preference profile** (`keywordProfile`) — a weighted keyword map maintained on the user doc from the papers they add to their library; powers Discover ranking. Defined in [Paper › Keyword Preference Profile](../paper/paper.md#7-keyword-preference-profile). Removed with the account (the user doc is deleted in the cascade).

---

## Account Deletion

When a user deletes their Scolar account:
- They are **removed from all Orgs** they are a member of
- All papers they shared to those Orgs are **automatically unshared** (same as voluntarily leaving each Org)
- Their **library entries are removed**; the underlying global paper data is unaffected (it remains for other users who reference it)
- **If they are the Admin of any Org**, that Org is deleted (enters Ghost Mode) — see [Org Membership](../org/org-membership.md). The user is warned before deletion proceeds (e.g., *"This will delete X Orgs with Y members."*) and may transfer Admin first to preserve an Org.
- **All pending items tied to the user are cascaded (invalidated)** — anywhere in the system. This includes: invites sent to them, join requests they submitted, transfer offers they sent or received, and any "request to be Admin" they made. Deleting an account leaves no dangling pending state referencing that user.
- **Their `@handle` is intentionally NOT released.** The `/handles/{handle}` reservation doc is **retained as a tombstone** (its `uid` is cleared / marked retired) rather than deleted, so the handle can never be reclaimed by anyone. This is deliberate — recycling a deleted user's handle would let a new account be confused with, or impersonate, the original owner. This is the one piece of user-scoped data that survives the cascade.
