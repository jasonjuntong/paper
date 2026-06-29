# Scolar — Org: Papers, Notifications & Permissions

> Domain: `org/`.
> Part of the Scolar specs (`docs/specs/`).
> See also: [Paper](../paper/paper.md) | [Org Membership](./org-membership.md) | [Org Joining & Invites](./org-joining-invites.md)

---

## Papers & Orgs

Papers are personal assets, not Org assets. Orgs are a way to share visibility, not a way to transfer ownership.

### Ownership
- A user's **library entry** for a paper is owned by that user, never by an Org
- The underlying global paper data is shared across all users who reference it (via deduplication)
- An Org does not "own" papers — it can only be a recipient of shares

### Paper Visibility (derived, not stored as a tag)
A library entry is in one of two states, derived from its share data:
- **Private:** zero Org shares → only the owner sees it
- **Shared:** one or more Org shares → owner + members of those Orgs can see it

There is no global/public visibility state for papers.

**Public-Org list exception:** when a paper is shared to a **public** Org, anyone viewing that Org (members or not) sees it in the Org's shared-paper **list** with metadata only — opening the full view (PDF reader + AI-generated insights) stays restricted to members and the owner. Full detail in [Paper › Two access tiers](../paper/paper.md#3-paper-visibility).

### Sharing
- A user can **share a paper to one or more Orgs**
- A user can **only share to Orgs they are currently a member of**
- Once shared, **all members of that Org** can see the paper
- The library entry still belongs to the original uploading user

### Auto-Unshare on Membership Change
- When a user **leaves an Org** (voluntarily), all of their shared papers are **automatically unshared from that Org**
- When a user is **kicked from an Org**, all of their shared papers are **automatically unshared from that Org**

> **Public-pool upkeep:** sharing to / unsharing from a **public** Org (including these auto-unshares) maintains the paper's denormalized `publicOrgIds` set — added on share, removed on unshare when no other entry still shares it to that Org. This is what keeps a public Org's papers in (or out of) the Discover + search list pool. See [Paper › Identifying the public-Org pool](../paper/paper.md#identifying-the-public-org-pool-denormalized-flag).

> **`paperCount` upkeep:** every Org doc carries an atomic `paperCount` counter — the number of distinct papers shared to it (i.e. the size of its `sharedPapers` subcollection) — so Discover and Org-profile surfaces can show paper count from a single field read instead of counting the subcollection per request. It is bumped in the **same write** that creates or removes a `sharedPapers/{paperId}` doc: **+1** when a paper's snapshot is newly created in the Org, **−1** when it is removed because no other member still shares that paper to the Org. Because `sharedPapers` is keyed by `paperId`, a second member sharing the same paper does **not** create a new doc and does **not** increment the counter; the decrement fires only when the **last** sharer unshares (same condition as `publicOrgIds` removal). Applies to **all** Orgs, public and private; the auto-unshare paths (leave/kick, entry delete) maintain it too. See [Org Discovery › Org List Item Display](./org-discovery.md#org-list-item-display).

---

## Notifications

In-app notifications are sent for all Org-related events, delivered **real-time** via Firestore real-time listeners (`onSnapshot` on `/users/{userId}/notifications/`). **In-app is the baseline channel for every event.** A subset of **high-priority, time-sensitive** events is **additionally delivered by email** (via Resend) so users who aren't in the app don't miss them. **Push is not offered.**

| Event | Recipient | Also email? |
|-------|-----------|-------------|
| User is invited to an Org (in-app notification) | The invited user | **Email** |
| User declines an Org invite | The inviting Admin | — |
| User is kicked from an Org | The kicked user | **Email** |
| Admin sends a transfer offer | The targeted member(s) | **Email** |
| Member declines a transfer offer | The Admin | — |
| Member accepts a transfer offer (becomes Admin) | The newly promoted user (and the now-former Admin) | — |
| Admin initiates Step Down | All members of the Org | **Email** |
| Member requests to become Admin (during Step Down) | The Admin | — |
| Admin accepts/declines a "request to be Admin" | The requesting member | **Email** |
| Step Down expires with no handoff → Org deleted | All members of the Org | **Email** |
| Join request approved | The requesting user | — |
| Join request rejected | The requesting user | — |
| Org is deleted (enters Ghost Mode) | All members of the Org | **Email** |

> Invite **acceptance** and join-request **submission** deliberately do **not** fire notifications — they surface to the Admin via the live members / join-requests list (`onSnapshot`), not the notifications feed. Only declines and final results (approve/reject) are notified.

**Email delivery details:**
- The in-app notification always fires regardless of email; email is an *additional* channel for the marked high-priority events only. The non-email events stay in-app exclusively.
- Email is sent via **Resend** (the same provider used for auth emails), addressed to the user's verified email and using their display `name`.
- **User opt-out:** users can disable the email channel in account settings. A `notificationPrefs.email` boolean on `/users/{userId}` gates email delivery (default **on**); the in-app channel is always on and cannot be disabled. (Per-event granularity is out of scope — it's a single email on/off switch.)

---

## Permissions Summary

| Action | Who Can Do It |
|--------|---------------|
| Create an Org | Any authenticated user |
| Delete an Org | Org Admin only |
| Edit Org name/description | Org Admin only |
| Toggle Org visibility (public/private) | Org Admin only |
| Set/change join policy | Org Admin only |
| Create an invite (targeted to a Scolar user, delivered in-app) | Org Admin only |
| Revoke a pending invite | Org Admin only |
| Accept or decline an invite | Only the invited user |
| Approve/reject join requests | Org Admin only |
| Kick a member | Org Admin only |
| Send an Admin transfer offer | Org Admin only |
| Cancel a pending transfer offer | Org Admin only |
| Accept or decline a transfer offer | The targeted member |
| Initiate Step Down | Org Admin only |
| Request to become Admin | Any Member, **only while the Org is in Step Down** |
| Accept/decline a "request to be Admin" | Org Admin only (auto-granted if the requester has a matching transfer offer) |
| Leave an Org | Any Member (Admin must Step Down if other members exist) |
| Browse/search public Orgs | Any authenticated user |
| See suggested Orgs (keyword-based) | Any authenticated user (empty if no papers) |
| Submit a join request (public Org with `request` policy) | Any authenticated user |
| Join an Org | Any registered user (via accepted invite, approved request, or open public join) |
| Share a paper to an Org | Paper owner only, and only if they are a current member of that Org |
| Unshare a paper from an Org | Paper owner only |
| Open a shared paper's **content** (full view: PDF reader + AI-generated insights) | Members of that Org only (or the paper's owner) |
| View the **list** of papers shared in a **public** Org (metadata only: title, authors, year, keywords, synopsis) | Any authenticated user — public Orgs only; on the Org page, via Discover, or as similarity-search results (see [Paper Visibility › two access tiers](../paper/paper.md#3-paper-visibility)) |
