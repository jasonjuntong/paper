# Scolar — Org: Discovery

> Domain: `org/`.
> Part of the Scolar specs (`docs/specs/`).
> See also: [Org Overview](./org-overview.md) | [Org Joining & Invites](./org-joining-invites.md)

---

## Overview

Org Discovery lets users — especially those in zero or few Orgs — find public Orgs that may interest them. Only **public** Orgs ever appear in any discovery surface. Private Orgs are never listed and can only be joined via direct invite.

The **Discover** surface spans **both Orgs and papers** — this doc covers the Org half; the paper half (recommending papers shared to public Orgs) is specified in [Paper Discovery](../paper/paper.md#8-paper-discovery). Both halves rank by the same per-user [Keyword Preference Profile](../paper/paper.md#7-keyword-preference-profile).

---

## Discovery Surfaces

Three ways to discover Orgs:
1. **Search** — find public Orgs by name/keyword. Flat list, no filters or sorting.
2. **Browse** — view a list of all public Orgs.
3. **Suggested / Recommended** — public Orgs ranked by relevance to the user (see logic below).

---

## Org List Item Display

Each Org shown in any discovery surface displays:

| Field | Notes |
|-------|-------|
| `name` | Org name |
| `description` | Org description (optional) |
| `member_count` | Number of members in the Org |
| `paper_count` | Number of papers shared to that Org |

---

## Suggested / Recommended Logic

Recommendations are based on **keyword/tag overlap** (not embeddings — kept simple intentionally):
1. Read the user's materialized [Keyword Preference Profile](../paper/paper.md#7-keyword-preference-profile) (`keywordProfile` on `/users/{uid}`) — the weighted keyword map built from papers in their library
2. For each public Org, collect the keywords/tags from papers shared to it
3. Rank public Orgs by the degree of keyword/tag overlap with the user's profile (matching keywords scored by their profile weight)
4. Show the top-ranked Orgs as "Suggested"

---

## Zero-Paper Users

- If the user has no papers, the Suggested section is **empty**
- The user is offered the Search and Browse surfaces instead
- No error or prompt is forced — discovery still works via search/browse
