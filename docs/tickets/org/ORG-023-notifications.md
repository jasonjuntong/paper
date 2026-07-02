# ORG-023 — Notifications (in-app onSnapshot + email for high-priority events)

**Domain:** org  
**Status:** Todo  
**Spec:** docs/specs/org/org-papers-permissions.md#notifications  
**Depends on:** —

## Context
Two channels. **In-app is the baseline for every event**, delivered real-time via Firestore `onSnapshot` on `/users/{uid}/notifications/`. A subset of **high-priority, time-sensitive** events is **additionally emailed** (via Resend) so users not in the app don't miss them. **No push.** This is a prerequisite for every action that notifies a user.

## Scope / Tasks
- Notifications subcollection + write helper; client `onSnapshot` listener + UI feed.
- Emit for the spec'd events: invited; invite declined (→Admin); kicked; transfer offer sent; transfer declined (→Admin); transfer accepted (→new + former Admin); Step Down initiated (→all members); request-to-be-Admin (→Admin); request accepted/declined (→member); Step-Down expiry deletion (→all); join request approved/rejected (→requester); org deleted (→all members).
- **Email channel (Resend):** additionally email the high-priority events — invited, kicked, transfer offer sent, Step Down initiated, admin-request result (accept/decline), Step-Down expiry deletion, org deleted. Gate email on the recipient's `notificationPrefs.email` (default on, USER-005); the in-app write always fires regardless. Address email to the user's verified email using their display `name`. No per-event granularity (single on/off switch).
- Do **not** notify on invite acceptance or join-request submission (surfaced via live lists instead).

## Acceptance criteria
- [ ] A notifications subcollection exists with a real-time `onSnapshot` client feed; the in-app write fires for all listed events regardless of email prefs.
- [ ] All listed events emit a notification to the correct recipient(s).
- [ ] The marked high-priority events also send a Resend email, suppressed only when the recipient's `notificationPrefs.email` is off; non-high-priority events never email.
- [ ] Invite acceptance and join-request submission do not emit notifications.

## Affected files
- `src/lib/notifications.ts` (new — in-app write helper + email dispatch)
- `src/lib/email.ts` / Resend integration (notification email templates)
- client notifications feed component + `onSnapshot` hook
