# Scolar — User

> Domain: `user/`. Related domains: `org/`, `paper/`.
> Part of: [Scolar Specifications](../scolar-specs.md)
> See also: [Paper](../paper/paper.md) | [Org Overview](../org/org-overview.md)

---

## Authentication

Handled by **Firebase Authentication**. The only supported method is **email + password**.

**Registration collects:**
- **Name** — display name; how Scolar addresses and identifies the user across the app
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

## Users (App-Wide)

- **No global roles** — all users are equal at the app level
- A user's role/permissions only exist *within an Org* (see Org specs)
- **User profile data:**
  - Name (display name, set at registration)
  - Email
  - No avatar
- **Premium status** is tracked separately — handled in the Premium Account, Plans & Billing chunk

---

## Account Deletion

When a user deletes their Scolar account:
- They are **removed from all Orgs** they are a member of
- All papers they shared to those Orgs are **automatically unshared** (same as voluntarily leaving each Org)
- Their **library entries are removed**; the underlying global paper data is unaffected (it remains for other users who reference it)
- **If they are the Admin of any Org**, that Org is deleted (enters Ghost Mode) — see [Org Membership](../org/org-membership.md). The user is warned before deletion proceeds (e.g., *"This will delete X Orgs with Y members."*) and may transfer Admin first to preserve an Org.
- **All pending items tied to the user are cascaded (invalidated)** — anywhere in the system. This includes: invites sent to them, join requests they submitted, transfer offers they sent or received, and any "request to be Admin" they made. Deleting an account leaves no dangling pending state referencing that user.
