# Scolar — Org: Membership, Roles & Deletion

> Domain: `org/`.
> Part of the Scolar specs (`docs/specs/`).
> See also: [Org Overview](./org-overview.md) | [Org Joining & Invites](./org-joining-invites.md) | [Org Papers & Permissions](./org-papers-permissions.md)

---

## Membership

- A user can be a member of **multiple Orgs**
- An Org can have multiple members
- **Member cap:** a flat **1000 members** per Org

**Cap calculation (all pending paths count as possible members):**
- The effective count is always **current members + pending invites + pending join requests**, and it can never exceed **1000**. This projection is calculated before any invite or join request is created.
- **Priority order at the cap:** actual members rank highest, then **pending invites** (the Admin's intentional choice to add someone), then **pending join requests** (lowest priority — they can be reconciled away to free slots).
- **Nothing is ever silently auto-declined.** Every decline is an explicit Admin action.

**Enforcement at creation time:**
- **Join requests** — when the effective count reaches **1000**, the join request action is **disabled**; no new requests can be submitted (there is no room to honor them). Existing pending join requests simply wait (frozen) until the Admin reconciles them or a slot frees up.
- **Invites** — the Admin cannot create invites that would push the effective count past 1000. If pending join requests are occupying the slots the Admin wants for invites, the Admin is shown a **reconciliation prompt** (see below) rather than being silently blocked or having requests auto-declined.

**Reconciliation prompt (invite creation blocked by pending join requests):**
- **Trigger:** the Admin tries to create invites that *would* exceed available slots specifically because pending join requests + members + existing pending invites leave no room.
- The prompt offers exactly **two actions**:
  1. **Address the pending join requests first** — go handle them individually (accept or decline) before inviting
  2. **Decline N pending join requests to make room** — the Admin **chooses which specific requests** to decline, freeing those slots for the intended invites
- Declined requesters are **notified** (standard decline notification). There is **no cooldown** on join requests — a declined user may submit a new join request as soon as the join action is available again (i.e., when a slot frees up)
- A slot freed this way can then be used to create the invite(s)

---

## Roles within an Org

| Role | Notes |
|------|-------|
| `Admin` | Exactly **one per Org** at any time |
| `Member` | All other users in the Org |

---

## Admin Transfer

The Admin role can be handed to another member, but it is **acceptance-based** — being made Admin is never forced on someone.

**How a transfer works:**
- The Admin sends a **transfer offer** to one or more members (the Admin cannot target themselves — they are excluded from the candidate list)
- Each targeted member is **notified** and can **accept or decline**
- **While offers are pending, the original Admin remains Admin**
- **First to accept wins:** the moment one member accepts, the roles **swap** (that member becomes Admin, the original becomes a Member), and **all other pending offers are automatically invalidated** (there is only ever one Admin)
- If a member **declines**, the Admin is **notified**
- The Admin can **cancel** any pending offer before it is accepted
- Transfer offers **expire after 7 days** (aligned with invite expiry and the ghost period), or sooner if a new Admin is assigned via another offer being accepted

There is never more than one Admin per Org at any point in this process.

**Plain transfer vs. Step Down (same mechanism, different intent and outcome):** a plain Admin Transfer and a Step Down both use 7-day transfer offers, but they are distinct actions:
- A **plain transfer** is the Admin optionally handing off the role while **intending to remain in the Org** as a member. If all offers **expire with no acceptance, nothing happens** — the Admin simply stays Admin and the Org continues normally. There is no negative consequence.
- A **Step Down** (below) is the Admin **intending to leave** the Org. If its window **expires with no successful handoff, the Org is deleted** (Ghost Mode).

A plain transfer is never automatically treated as a Step Down — the Admin chooses which action they are taking.

---

## Leaving an Org

- A Member can **leave an Org at any time** (voluntary)
- The Admin can **kick a Member** from the Org
- **Exception:** if the Admin is the **sole member**, they can leave directly, which **auto-deletes the Org** (enters Ghost Mode — with no other members, the ghost period is effectively moot)
- The Admin **cannot leave directly while other members exist** — they must hand off the role. Because transfer is acceptance-based (and could be declined or ignored), an Admin who wants out initiates **Step Down** (below) rather than being trapped.

---

## Step Down (Admin-initiated departure)

Step Down guarantees an Admin is never permanently trapped in the role, while giving members a fair window to take over.

**Initiating Step Down:**
- An Admin who wants to leave an Org that has other members initiates **Step Down**
- They are prompted to send a transfer offer to **everyone (default)** or to **specific member(s)**
- **All members are notified and warned** that the Admin is stepping down — making clear that if no one takes over within **7 days**, the Org will be **deleted** (enters Ghost Mode)

**During the Step Down window (7 days):**
- The Org operates **normally** — the Admin is still active and all features work
- Two paths can lead to a successful handoff:
  1. A member **accepts a transfer offer** (standard transfer — first to accept wins)
  2. A member **requests to become Admin** (see below)

**"Request to be Admin" (only available during Step Down):**
- While an Org is in the Step Down state, any member can **request to become Admin**
- This feature exists **only** during Step Down — it is unavailable at all other times
- Matching logic:
  - If the requesting member **already has a pending transfer offer** from the Admin → the request is **auto-granted** (both sides want it) → that member becomes Admin immediately
  - If the requesting member has **no** transfer offer → the **Admin can accept or decline** the request
- The member is **notified** whether their request is accepted or declined, and may request **only once** per Step Down window
- **First successful handoff wins:** the moment any member becomes Admin (via accepted offer, auto-grant, or Admin-granted request), Step Down completes — the original Admin becomes a Member, and all other pending offers and requests are invalidated

**If the window expires with no successful handoff (7 days):**
- Whether offers went unaccepted, or member requests were never granted by the Admin, the result is the same
- The Org is **deleted and enters Ghost Mode**; all members are **notified and warned**
- **Core rule:** Step Down resolves successfully **only when someone actually becomes Admin**. Any other state at expiry → the Org is deleted.

---

## Deleting an Org

Deletion is an **intentional, permanent process**. Only the Admin can delete the Org. The Admin is shown a clear warning (e.g., *"This will delete this Org with Y members and unshare Z papers"*) before deletion proceeds. **If there are pending Admin transfer offers**, the warning also reminds the Admin — e.g., *"You have N pending Admin transfer offer(s). Deleting now will cancel them. If you'd like this Org to survive, consider transferring Admin instead."* — giving them a clear off-ramp.

**On deletion (the moment the Admin confirms):**
- All members' papers are **immediately auto-unshared** from the Org
- All members are **notified** that the Org has been deleted
- The Org enters **Ghost Mode**
- **All inbound and outbound processes are immediately sealed** — pending invites, pending join requests, and pending Admin transfer offers/requests are all **invalidated**. Nothing flows in or out of a deleted Org.

**During Ghost Mode (7 days):**
- The Org record still exists, but **all features are disabled** — no viewing the Org library, no sharing, no inviting, no joining, no activity of any kind
- The Org detail/homepage displays a prominent message: *"This Org has been deleted X [minutes/days] ago by the admin."*
- The ghost Org **still appears in each member's Org list, greyed out**

**After 7 days (ghost period ends):**
- The Org is **no longer discoverable by any user**
- It is removed from all listings, search, and members' Org lists

> **No restore:** once the Admin confirms deletion, it is final. There is no undo, even during Ghost Mode. Ghost Mode exists only to soften the experience for members, not to provide a recovery window.

---

## Admin Account Deletion

- If the Admin **deletes their Scolar account**, all Orgs they administer are **deleted** (entering Ghost Mode)
- Before account deletion proceeds, the Admin is **warned** (e.g., *"This will delete X Orgs with Y members."*) and may transfer Admin first to preserve an Org

---

## Open Items

- None outstanding. (The 7-day windows are intentionally aligned across invite expiry, ghost period, transfer offers, and Step Down.)
