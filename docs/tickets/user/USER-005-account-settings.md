# USER-005 — Account settings page

**Domain:** user
**Status:** Done
**Spec:** docs/specs/user/user.md#users-app-wide
**Depends on:** USER-002

## Context
Users need a settings surface to view their profile and manage their account. Profile data is minimal: name (display name), `@handle` (immutable, read-only), and email; no avatar. Settings also expose the notification email toggle. Account deletion lives in USER-006.

## Scope / Tasks
- Settings page: view email; view `@handle` (read-only — immutable); view/edit display name.
- Notification email toggle: read/write `notificationPrefs.email` on `/users/{uid}` (default on); gates whether high-priority org events are also emailed (the in-app channel is always on, see ORG-023).
- Change password (re-auth + update).
- Enable the currently-disabled "Account settings" entry in the nav dropdown and route it here.
- Entry point to account deletion (USER-006).

## Acceptance criteria
- [x] Authenticated users can open a settings page from the nav.
- [x] Display name can be edited and persists to the Firebase user + user doc; handle is shown read-only and cannot be changed.
- [x] Notification email toggle reads/writes `notificationPrefs.email`; turning it off stops email but not in-app notifications.
- [x] Email is shown (read-only for now); password can be changed.
- [x] No avatar field is presented.

## Affected files
- `src/components/nav-user.tsx` (enable disabled item → links to `/settings`)
- `src/app/(app)/settings/page.tsx` (new — server page, reads user doc)
- `src/components/settings/settings-client.tsx` (new — profile / notifications / change-password / danger-zone sections)
- `src/app/api/account/route.ts` (new — profile + notification-pref updates; password change is client-side re-auth)
- `src/components/ui/switch.tsx` (new — shadcn primitive)

## Notes
- Password change is done **client-side** (Firebase `reauthenticateWithCredential` + `updatePassword`), not via the API route — re-auth must run in the browser where the user's credential lives.
- "Delete account" is a **disabled stub** here; the flow is built in USER-006.
- Nav display name stays stale after a rename until next login — logged as N-002 in `docs/nuances.md`.
