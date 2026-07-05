# ORG-026 — Member table sort + filter

**Domain:** org  
**Status:** Todo — nice-to-have, no priority. Deferred; the ORG-006 search box covers current needs.  
**Spec:** docs/specs/org/org-membership.md#roles-within-an-org  
**Depends on:** ORG-006 (member table), ORG-021 (real `sharedCount`) — for any share-based option

## Context
The member roster (`MemberTable`, `src/app/(app)/orgs/[orgId]/_components/member-table.tsx`)
ships with a name/handle **search box** only. As orgs grow toward the 1000-member cap, sort and
filter controls become useful. This ticket captures those as an explicit backlog item so ORG-006
could close without scope creep. Not urgent — the search box is sufficient for now.

## Scope / Tasks
Add sort + filter controls above the roster. Candidate options, split by what they need:

- **Works on today's data** (`role`, `joinedAt`):
  - Sort: newest / oldest member (`joinedAt`).
  - Sort: name A–Z. (Admin-first is already the default order.)
  - Filter: role — Admins only / Members only.
- **Blocked on ORG-021** (`sharedCount` is hardcoded `0` until then):
  - Sort: most papers shared ("top sharer").
  - Filter: has shared papers (`sharedCount > 0`).
- **Blocked on ORG-013** (member status not modeled yet):
  - Filter: ghost / active status.

Prefer shadcn primitives to match the ORG-006 refactor (e.g. `ToggleGroup` for a small role
filter, `Select`/`DropdownMenu` for the sort). Keep the mono/pill aesthetic.

## Key constraint — preview vs. full roster
`page.tsx` loads only `MEMBER_PREVIEW = 50` members (ordered `joinedAt asc`), with a "+N more"
line standing in for the rest. **Client-side sort/filter only reorders those 50 loaded rows**, not
the full roster. Any roster-wide guarantee (e.g. the *actual* top sharer across all members) must
move the sort/filter into the Firestore query in `page.tsx`, not the component. Decide per option
whether client-local (over the preview) is acceptable or a server query is required — and say so
in the implementation.

## Acceptance criteria
- [ ] Role filter narrows the roster to Admins / Members / all.
- [ ] Sort control offers at least newest/oldest by join time (name A–Z optional).
- [ ] Share-based sort/filter deferred until `sharedCount` is real (ORG-021), or explicitly noted
      as preview-only.
- [ ] Preview-vs-roster behavior is documented for each control (client-local vs server query).
- [ ] Controls use shadcn primitives and preserve the existing aesthetic.

## Affected files
- `src/app/(app)/orgs/[orgId]/_components/member-table.tsx`
- `src/app/(app)/orgs/[orgId]/page.tsx` (only if a control needs a server-side query)

## Test coverage
- **Component (unit) — primary lane.** Extend `member-table.test.tsx`: assert the role filter
  narrows rows, the sort reorders them, and controls compose with the existing search.
- **e2e — optional.** Same rationale as ORG-006.
