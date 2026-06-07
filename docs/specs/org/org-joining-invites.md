# Scolar — Org: Joining, Requests & Invites

> Domain: `org/`.
> Part of: [Scolar Specifications](../scolar-specs.md)
> See also: [Org Overview](./org-overview.md) | [Org Membership](./org-membership.md) | [Org Papers & Permissions](./org-papers-permissions.md)

---

## Joining an Org

Join policy depends on the Org's visibility:

**Public Orgs** — Admin chooses one of:
- **Open:** any user can join freely (no approval needed)
- **Request:** any user can request to join; Admin must approve or reject each request

**Private Orgs:**
- **Invite-only:** Admin sends invites to specific users. The Org does not appear in any public list.

---

## Join Requests (public Orgs with `request` policy)

- Any user can submit a join request from the public Org's page
- Admin sees pending requests and explicitly **approves or rejects** each one
- The requesting user is **notified** of the result (approval or rejection)
- If a public Org switches to private while requests are pending, the pending requests **carry over** and the Admin can still approve them
- **At the member cap:** when the effective count (members + pending invites + pending join requests) reaches 1000, the join request action is **disabled** — no new requests can be submitted. Existing pending requests wait (frozen) until the Admin reconciles them or a slot frees up. Nothing is auto-declined. See [Org Membership](./org-membership.md) (Cap calculation).

**Collision with a pending invite (no two paths at once):** the system never allows a user to have both a pending join request and a pending invite for the same Org simultaneously.
- If a user tries to submit a join request to an Org where they already have a **pending invite**, they are **prompted to accept the existing invite instead**. If they dismiss the prompt, the join request is simply **not created** — the pending invite is left untouched (still pending, to handle later).
- The reverse case (Admin inviting a user who already has a pending join request) is handled symmetrically — see the Invites section below.

---

## Invites

Scolar's invite system is entirely **in-app** — no emails, no URLs. Invites are targeted to a specific **Scolar user** (not an email address). This is the only mechanism for directly adding members to an Org.

Email is reserved only for actions that cannot happen inside Scolar (e.g., password reset, email verification). Everything else, including invites, happens within the app.

**Eligibility:**
- The recipient must already be a **registered, verified Scolar user**
- The recipient must share **at least one Org in common** with the inviting Admin — invites can only be sent to users the Admin has organic connection with

**Invite UI — finding a user to invite:**
- Admin opens the invite UI → sees a pool of all users who share at least one Org with the Admin, excluding users already in the current Org and **excluding the Admin themselves**
- Admin can **search within that pool** by display name
- Admin selects a user → invite is sent as an **in-app notification** to that user

**Collision with a pending join request (no two paths at once):** if the Admin tries to invite a user who already has a **pending join request** to that Org, the Admin is **prompted to approve the existing request instead**. If they dismiss the prompt, the invite is simply **not created** — the pending join request is left untouched (still pending). This mirrors the user-side handling in the Join Requests section and guarantees a user never has both a pending invite and a pending join request for the same Org.

**Generation & access:**
- Only the **Org Admin** can create invites
- Invites work for **all Orgs** regardless of visibility
- Each invite is **single-use**: it is consumed upon acceptance or decline

**Expiry:**
- Invites expire after **7 days** (fixed — not configurable by the Admin for now)
- Expired invites cannot be used

**Limits:**
- An Org can have a maximum of **50 active (pending, unused, unexpired) invites** at any time
- Once the limit is reached, the Admin must wait for invites to be used, expire, or be revoked before creating new ones
- Separately, invites count toward the **1000-member cap** along with members and pending join requests (see [Org Membership](./org-membership.md), Cap calculation). The Admin cannot create invites beyond the available slots; if pending join requests are blocking those slots, the Admin is shown a **reconciliation prompt** to address or decline requests first. Invites rank above join requests in priority.

**Revocation:**
- The Admin can see a list of all **pending invites** for the Org
- The Admin can **revoke** any unused invite before it expires — revoked invites become unusable immediately

**Recipient flow:**
1. Recipient receives an in-app notification of the invite
2. Recipient **accepts** → joins the Org immediately, invite is consumed
3. Recipient **declines** → invite is consumed, Admin is notified in-app
4. After a **decline**, the Admin must wait **48 hours** before sending a new invite to the same user — this prevents spam
5. Once consumed (accepted, declined, or expired), the invite cannot be used again

**Cooldown scope:** the 48-hour cooldown applies **only to a decline** — an active "no" from the recipient. It does **not** apply to:
- **Expiry** — if an invite expires unanswered, the Admin can immediately send a fresh one
- **Revocation** — if the Admin revokes their own invite, they can re-invite freely

The rationale: only a decline represents the recipient's expressed rejection, so only a decline warrants spam protection.
