# Scolar — Org: Discovery

> Domain: `org/`.
> Part of: [Scolar Specifications](../scolar-specs.md)
> See also: [Org Overview](./org-overview.md) | [Org Joining & Invites](./org-joining-invites.md)

---

## Overview

Org Discovery lets users — especially those in zero or few Orgs — find public Orgs that may interest them. Only **public** Orgs ever appear in any discovery surface. Private Orgs are never listed and can only be joined via direct invite.

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
1. Collect the keywords/tags from the papers in the user's own library
2. For each public Org, collect the keywords/tags from papers shared to it
3. Rank public Orgs by the degree of keyword/tag overlap with the user's keywords
4. Show the top-ranked Orgs as "Suggested"

---

## Zero-Paper Users

- If the user has no papers, the Suggested section is **empty**
- The user is offered the Search and Browse surfaces instead
- No error or prompt is forced — discovery still works via search/browse
