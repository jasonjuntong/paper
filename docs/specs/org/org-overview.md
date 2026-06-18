# Scolar — Org: Overview & Profile

> Domain: `org/`.
> Part of: [Scolar Specifications](../scolar-specs.md)
> See also: [Org Membership](./org-membership.md) | [Org Joining & Invites](./org-joining-invites.md) | [Org Discovery](./org-discovery.md) | [Org Papers & Permissions](./org-papers-permissions.md)

---

## Overview

Orgs are the user-grouping primitive in Scolar — conceptually similar to a group chat in messaging apps. They are **not** institutions, workspaces, or organizations in the corporate sense — just named groups of users who can share papers with each other.

**Key principles:**
- Any user can create an Org
- A user can belong to multiple Orgs
- Each Org has exactly one Admin at a time
- Papers are shared *to* Orgs but never *owned* by them

---

## Org Profile

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | |
| `description` | Optional | |
| `visibility` | Yes | `public` or `private` |
| `join_policy` | Yes | Depends on visibility (see [Org Joining & Invites](./org-joining-invites.md)) |

---

## Visibility

- **Public:** Org appears in a public, discoverable list. Searchable by name/keyword. Eligible for suggestions.
- **Private:** Org is hidden from public listings. Users only know it exists via direct invite.
- The Admin can **toggle visibility at any time**.

**Visibility toggle — join policy transitions:** because join policy options depend on visibility, toggling visibility adjusts the join policy automatically:
- **Private → Public:** join policy switches to **request** (the safe default); the Admin can change it to **open** later. **Pending invites remain valid** and can still be accepted.
- **Public → Private:** join policy switches to **invite-only** (the only valid private policy). **Pending join requests remain valid** — they carry over and the Admin can still approve them.

**Default visibility:** the creation form **pre-selects public** visibility. The creator may choose private at creation, and the Admin can switch it at any time afterward.

**Setting private with no other members:** this is **allowed**, but the Admin is shown an informational warning about the implications — e.g., *"A private Org is not discoverable. You can only add members via invite, and you can only invite users who share another Org with you. With no shared connections, you may not be able to grow this Org."* The action is permitted (a common valid use case is staging a library privately before flipping the Org public for others to join); the warning simply ensures the Admin is aware of the invite limitation. The cold-start case (an empty private Org that cannot grow) is accepted by design.

---

## Creation

- **Any authenticated user can create an Org**
- The creator is automatically assigned as the Org's Admin
- **Required at creation:** `name`. **Optional:** `description`.
- **Visibility and join policy can be set during creation.** The creation form pre-selects the defaults — **public** visibility with a **request** join policy (users must request to join and the Admin approves each one) — but the creator may change them before submitting. The same visibility ↔ join-policy rules apply at creation as afterward:
  - **Public** → join policy is **open** or **request** (invite-only is unavailable).
  - **Private** → join policy is forced to **invite-only** (the only valid private policy). Choosing private with no other members surfaces the same informational warning described under [Visibility](#visibility).
- The Admin can change visibility and join policy at any time after creation as well.
