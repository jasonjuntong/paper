# Ticket Ledger

A snapshot of overall ticket status — counts only, plus the few tickets that need explicit attention. Full per-ticket detail lives in [`README.md`](./README.md) and each ticket file.

_Last updated: 2026-07-08._ Full change log below.

## Recent changes

### 2026-07-08

- **INFRA-004 — design-language token conformance sweep (completed).** Cleared the INFRA-002
  Round 1 UI-lane drift from `docs/design-language.md`. Replaced every inlined raw
  `oklch(0.9491 0.0041 91.616)` (== `--pill`) with the `bg-pill`/`hover:bg-pill` token across
  `paper-card`, `org-card`, `section-cards`, `paper-table`, `view-toggle`, `paper-actions`;
  added `font-mono` to keyword chips (`paper-card`, `continue-reading`); moved the `OrgBadges`
  chip off `bg-muted` onto the pill pattern; fixed the pending-activity pill radius/padding;
  added `uppercase` to the stats-card label and stopped the null footer defaulting to a second
  em-dash (dashboard now supplies prose for the empty-library case); rebuilt the settings amber
  banner as the doc's danger-notification pattern (warning-triangle icon + dismiss ✕ + ring);
  flipped the delete-paper confirm button to the documented red direction (red-text default →
  bright fill on hover); and removed the dead `font-base` class. The intentional oklch
  exceptions (Plus-circle, destructive reds, amber theme) are preserved per the doc. Unit lane:
  new `settings-client.test.tsx` covers the one behavioral surface — the banner appears on a
  failed toggle and clears on dismiss; the rest is pure styling verified by the grep gate + a
  visual pass (e2e N/A, documented). `npm test` 194/194; `tsc --noEmit` clean. No
  `src/components/ui/` files touched. Backlog 30 → 29, Completed 22 → 23. Branch
  `style/design-token-conformance`.

### 2026-07-07

- **INFRA-003 — Firestore read-rule hardening (completed, SEC).** Closed the first INFRA-002
  Round 1 security follow-up. In `firestore.rules`: (1) public-org doc reads now require auth
  (`allow read: if isOrgMember(orgId) || (isSignedIn() && resource.data.visibility == 'public')`),
  matching the sibling `sharedPapers` gate; (2) added an `isOrgAdmin(orgId)` helper (member-check
  short-circuits before `get().data`, so no null-`.data` error) and split the `{sub=**}` read
  catch-all — `members` stays member-readable, `invites`/`joinRequests`/`adminTransferOffers`
  become Admin-only, anything unlisted falls to the root deny. Kept the per-block
  `allow write: if false` for consistency (Task 3 judgment call); `isPublicOrg` billed-`get()`
  left as-is (Task 4). Recipient-read exception for invites/offers deferred to ORG-016/017/010
  (recipient-uid field not yet specced) — filed nuance **N-005** (relates to N-004). Rules lane
  `tests/rules/firestore-rules.test.ts` grew 19 → 24 (auth guard on public-org reads, admin-vs-member
  split, plus the two Round-1-flagged `sharedPapers` branches). Unit/e2e N/A. Backlog 31 → 30,
  Completed 21 → 22. Branch `fix/firestore-read-rule-hardening`.

- **INFRA-002 Round 1 — full-tree code review (complete).** Ran the first full pass over the
  whole Phase 0 tree via the `code-review` skill (Standards vs repo docs + Fowler smell
  baseline; Spec vs `docs/specs/`), sliced into **5 domain lanes** and each anchored to its
  best-practice skill (`firebase-auth-basics`, `firebase-firestore`, `firebase-basics`,
  `next-best-practices`, `shadcn`, `frontend-design`), plus a 6th supplementary lane checking
  the tree against the architecture spec `docs/specs/tech-stack.md`. Nuances N-001…N-004
  excluded; `should-fix`+ findings re-verified against source before filing. The tech-stack lane
  added two Zod-boundary should-fixes (Groq output unvalidated → folded into PAPER-019;
  `api/auth/session` idToken unvalidated + unguarded JSON parse → folded into USER-008) and a
  `paperCount` atomic-counter divergence (→ ORG-024); most tech-stack mandates conform. **Two security items**
  (unauthenticated public-org read rule + member-readable moderation subcollections;
  session-cookie minted with no `auth_time` recency check + no revoke-on-logout — latent per
  N-004/short-lived tokens but real), **two data-integrity items** (unvalidated `hash` → empty
  Layer-1 key; non-transactional `ensureLibraryEntry` → duplicate library entries), and a batch
  of consistency/DRY/a11y/design-token drift. Filed **7 follow-up tickets** — INFRA-003 (rules,
  SEC), USER-008 (session, SEC), PAPER-019 (paper write integrity), ORG-027 (org route/form
  consolidation), INFRA-004 (design-language conformance), INFRA-005 (a11y & form semantics),
  INFRA-006 (shared UI/auth primitives) — and folded three findings into existing tickets
  (ORG-026, ORG-016/017, USER-006). Round 1 section of INFRA-002 filled in; Round 2 stubbed.
  Backlog 24 → 31, total 53 → 60. Branch `chore/code-review-round` carries docs/tickets only —
  no source edits (fixes land in the follow-up tickets).

### 2026-07-06

- **New `Recurring` status (convention change).** Introduced a `Recurring` status for cross-cutting, iterative-by-design tickets that never reach `Done`. Moved **ORG-025** and **INFRA-002** out of `Partial` into it (README legend + this ledger's buckets updated; In-progress 8 → 6, new Recurring bucket = 2, total unchanged) so feature progress reads clean and these two aren't miscounted as unfinished work.
- **ORG-025 (Recurring) — security rules + indexes iteration.** Added the public-org `sharedPapers` list-access read rule (any authed user reads a public org's shared-paper snapshots; private-org sharedPapers + all other subcollections stay member-only) with 7 new cases in `tests/rules/firestore-rules.test.ts` (19 pass), and the composite `publicOrgIds` (array-contains) + `embedding` (768 flat) vector index in `firestore.indexes.json` for the PAPER-011/014 similarity-search pre-filter. Filed nuance N-004: all writes are server-side (`firebase-admin` bypasses rules), so the permissions table's mutation rules live in the route handlers — `firestore.rules` deny-all-writes + read-gating is the only enforcement rules can provide; client-write rules for server-only flows (invite accept/decline, join submit) and discovery/search composite indexes (queries + doc shapes not final) are deferred.

### 2026-07-05

- **ORG-014 — join open public org (completed).** Impl (transactional `POST /api/orgs/[orgId]/join` + wired `JoinOrgButton`) was already done; closed the required e2e lane with `e2e/org-join-open-public.spec.ts`: a registered user self-joins a Firestore-seeded open public org through the real Join button → join POST `200` → member view re-renders (Papers/Members tabs, Join gone). The 1000-cap is asserted both as the UI gate (disabled Join + "This org is full", from `memberCount + inviteCount + requestCount`) and the route's in-transaction cap re-check (direct authenticated `page.request.post` → `409 "This org is full"`). Added a `seedOrg` helper to `e2e/helpers/emulator.ts` (Firestore REST create with the emulator owner token, mirroring `seedLibraryEntry`) — the non-member page only reads the org doc + the viewer's own member doc, so no member subdoc is needed. Also folded in a small convention-only UI polish: `JoinOrgButton` now renders the app's standard in-button `Loader2` spinner (`data-icon="inline-start"`) + `aria-busy` while submitting, matching every other submit button (register/reset/settings); the "…ing" label and mono/pill aesthetic are unchanged. Unit lane N/A (transactional Firestore I/O, not isolatable pure logic). With ORG-014 `Done`, Phase 0 has no open feature tickets left (only the Recurring ORG-025 and INFRA-002 remain).
- **ORG-026 — member table sort + filter (filed).** Nice-to-have, no priority; role filter + newest/oldest sort work on today's data, top-sharer/has-shared options blocked on ORG-021's real `sharedCount`. Notes the 50-row-preview vs full-roster constraint that pushes roster-wide sort/filter into the Firestore query.
- **ORG-006 — member listing + role badges (completed).** Refactored `MemberTable` off hand-rolled markup onto shadcn primitives (`Table`/`Avatar`/`Badge`/`InputGroup` search/newly-added `Empty`) while preserving the app's bespoke aesthetic (sharp `rounded-[3px]` mono micro-badges, `bg-pill` tone, uppercase column labels) — adopting the primitives, not stock shadcn visuals; the dead per-row actions button (ORG-008 kick) and always-zero Shared column (ORG-021) are kept as inert placeholders. Closed the required unit lane with component test `src/app/(app)/orgs/[orgId]/_components/member-table.test.tsx` (role→badge mapping / exactly-one-Admin, "You" badge only on the viewer's row, join-timestamp ISO-vs-em-dash formatting, case-insensitive name/handle search, no-match `Empty` state, "+N more" cap hint shown/hidden by query & total; no `next/navigation` mock — the component uses no router hooks); e2e is the ticket's optional lane and intentionally skipped.
- **ORG-004 — set/change join policy (completed).** Impl was already done; extracted the duplicated visibility↔join-policy invariant (create route `.refine` + PATCH route `isPolicyValid`) into a single shared module `src/lib/orgs/join-policy.ts` (`isJoinPolicyValid` / `defaultJoinPolicy` + the `Visibility`/`JoinPolicy` types), a pure refactor with both routes wired to it — the ticket's "ideally the shared validator" note. Then closed the test lanes: unit `src/lib/orgs/join-policy.test.ts` (all six `visibility × policy` combos + `defaultJoinPolicy`) + the `PATCH — join policy invariant` block in `src/app/api/orgs/[orgId]/route.test.ts` (allowed public switch, rejected invalid combos with no write, visibility-carry forcing invite / falling back to request) + e2e `e2e/org-join-policy.spec.ts` (Manage-tab pills → PATCH → Firestore emulator: switch policy, persistence across reload, public-only pills disabled when private; the spec waits on the PATCH `200` before reloading so it reads the stored value, not optimistic UI).
- **ORG-002 — edit org profile (completed).** Admin-only edit of name/mark/description; extended the shared `[orgId]` PATCH route to fold profile fields into a single `tx.update` writing only what changed (`description: ''` clears, mark upper-cased) and added an `EditOrgProfile` card at the top of the Manage tab with a dirty-gated Save. `mark` was pulled into scope beyond the ticket's literal "name/description" because it's coupled to the name at creation and would otherwise go stale on rename. Unit `src/app/api/orgs/[orgId]/route.test.ts` (PATCH handler: 401/400/403/410/404 gates, 200 profile writes incl. clear/name-only/no-op asserting the `tx.update` payload) + unit `src/app/(app)/orgs/[orgId]/_components/edit-org-profile.test.tsx` (dirty gate, name-required, PATCH payload→`router.refresh()`, cleared description, error mapping) + e2e `e2e/org-edit-profile.spec.ts` (Manage tab edit → server-rendered header re-render).
- **ORG-001 — org creation (completed).** Impl was already done; closed the two test lanes: unit `src/app/api/orgs/route.test.ts` (POST handler with mocked `getSession`/`adminFirestore` — 401, 400 on bad-JSON/missing-name/each invalid invariant combo, 201 on each valid combo, creator-as-admin two-doc batch + single commit, mark upper-cased, description default) and unit `src/app/(app)/orgs/_components/create-org-dialog.test.tsx` (defaults pre-selected, invariant coupling, name-required gating, submit payload → `router.push`, error mapping), plus e2e `e2e/org-creation.spec.ts` (register→login→dialog: defaults, name gate, Private→invite-only, create → land on `/orgs/{id}` as Admin).
- **PAPER-009 — PDF serving proxy (completed).** Impl was already done; closed the test gap with the route-handler unit test `src/app/api/papers/[paperId]/file/route.test.ts`: mocked `getSession`/`checkVisibility`/firebase-admin, asserting `401`/`403` (both `none` and `list` tiers)/`404`, `304` on matching `If-None-Match` plus `304`-vs-`403` precedence, `206`/`416` Range with the slice forwarded to `createReadStream`, and `200` full stream with `private, no-cache` + stable `md5Hash` ETag. Integration + e2e documented N/A — Storage isn't emulated and the session can't be forged offline, so an emulator test would exercise firebase-admin not our logic.
- **PAPER-010 — paper visibility derivation (completed).** `checkVisibility` now returns a `list` tier for public orgs the user hasn't joined — derived from the denormalized `publicOrgIds`, dormant-but-correct until PAPER-015 populates it, see nuance N-003 — with pure `accessTier`/`isDedupVisible` helpers; PDF proxy gated to full-only and the commit borderline branch to `isDedupVisible`. Unit `paper-dedup.test.ts` list/precedence + integration `paper-dedup.test.ts` public-org list-only/member-full/private-none; e2e N/A — no list-only UI surface yet.
- **INFRA-002 — code review rounds (added).** Recurring; Round 1 open.
- **PAPER-018 — read tracking (completed).** e2e `read-tracking.spec.ts` — seed→empty state→open (touch)→surfaces, plus two-paper recency ordering + re-open reorder — and component `continue-reading.test.tsx` — empty state, paperId href, keyword normalization.
- **PAPER-006 — library entry CRUD (completed).** Three component specs — `library-client` filter + view-toggle/`localStorage`, `edit-paper-dialog` validation/submit, `delete-paper-dialog` state machine — plus `e2e/library-crud.spec.ts` seeding entries into the emulator then driving browse → detail → edit → delete.

## Status

Buckets map to the README legend: **Completed** = `Done`, **In progress** = `Partial`, **Backlog** = `Todo`, **Recurring** = `Recurring` (iterative-by-design, never `Done`; tracked apart from `Partial` so feature progress reads clean).

| Bucket | Count |
|--------|-------|
| ✅ Completed | 23 |
| 🟡 In progress | 6 |
| ⬜ Backlog | 29 |
| 🔄 Recurring | 2 |
| **Total** | **60** |

## Needs attention

Only tickets with something non-obvious to track.

- **ORG-025 — `Recurring` (cross-cutting, iterative by design).** Never reaches `Done`; it accretes security rules + indexes as each feature lands. Its `/handles` and `/orgs` rules are covered by the INFRA-001 security-rules suite (`tests/rules/`). Latest pass (2026-07-07): INFRA-003 hardened the org read rules — public-org doc reads now require auth, and the `{sub=**}` catch-all was split so `members` stays member-readable while `invites`/`joinRequests`/`adminTransferOffers` are Admin-only (recipient-read exception deferred, N-005). Prior pass (2026-07-06): public-org `sharedPapers` list-access read rule + composite `publicOrgIds`+`embedding` vector index. Established the key framing (nuance N-004): with all writes server-side (`firebase-admin` bypasses rules), the permissions table's *mutations* are enforced in route handlers — rules do deny-all-writes + read-gating only. **Still open:** discovery/search composite indexes (deferred until those queries land); un-defer the invite/offer recipient-read rule when ORG-016/017/010 land (N-005).
- **INFRA-002 — `Recurring` (code review rounds).** Intentionally never `Done`; gains a new `## Round N` section each pass. **Round 1 complete (2026-07-07)** — full Phase 0 tree, 5 lanes, 7 follow-up tickets filed (2 SEC: INFRA-003, USER-008). Follow-ups closed so far: **INFRA-003** (rules hardening, 2026-07-07) and **INFRA-004** (design-language token conformance, 2026-07-08); the rest (USER-008, PAPER-019, ORG-027, INFRA-005, INFRA-006) remain `Todo`. **Round 2 is stubbed, not started** — opens on the next review pass (post-Phase-2/3), scope TBD.

## Project notes

- **Tests are now a hard Definition of Done (2026-07-02).** Default bar is a unit **and** an e2e test; a ticket may drop a lane only when it genuinely doesn't apply, documented in its own `## Test coverage` section (integration/rules lanes count where they fit). The **unit lane accepts a React component test** (`@testing-library/react` + jsdom) as well as a pure-logic test.
- **Component-test lane added + re-audit (2026-07-02).** Stood up component testing (`@testing-library/react`, `@testing-library/user-event`, jsdom; `vitest.config.ts` → jsdom, `vitest.setup.ts`). Two component specs so far: `login-form.test.tsx` (USER-002) and `register-form.test.tsx` (USER-001) — both keep their tickets `Done`. **ORG-006** names a component test as its required unit lane (still `Partial`); **PAPER-006** now has its three component specs and is `Done`.
- **Acceptance-criteria reconciliation (2026-07-02).** Swept every ticket's `## Acceptance criteria` checkboxes against the actual code so a box is ticked only where the behavior is implemented. Fully-implemented (tests-only-gap) `Partial` tickets are now fully checked; genuinely-partial ones have only their built criteria ticked (per-criterion detail lives in each ticket). **ORG-002** (edit name/description) was found unimplemented — the `[orgId]` PATCH + `org-manage.tsx` only handle visibility/join policy — so it moved **`Partial` → `Todo`** (0/2 checked).
  - **`Done` (21) at that sweep** — each with its landed lanes:
    - **INFRA-001** — harness.
    - **USER-001** — component + e2e + integration.
    - **USER-002** — component + e2e.
    - **USER-003**.
    - **USER-004** — e2e both enumeration surfaces; unit N/A.
    - **USER-005** — both lanes.
    - **USER-007** — unit + integration + rules; e2e N/A — no standalone UI.
    - **PAPER-001** — unit `pdf-upload.test.ts` + e2e `add-paper.spec.ts`.
    - **PAPER-002** — unit `groq.test.ts` + component `add-paper-dialog.test.tsx` + e2e `paper-details-review.spec.ts`.
    - **PAPER-003** — unit `paper-dedup.test.ts` `decideVisibility` + integration `paper-dedup.test.ts`; e2e N/A — offline commit can't embed/store.
    - **PAPER-005** — unit `gemini.test.ts` (pure `buildPaperEmbeddingInput` + stubbed-provider `generatePaperEmbedding`); e2e N/A — external provider.
    - **PAPER-004** — unit `paper-dedup.test.ts` `classifyDedupDistance` + component `add-paper-dialog.test.tsx` borderline confirm; e2e N/A — vector search not emulated.
    - **PAPER-006** — component `library-client.test.tsx` + `edit-paper-dialog.test.tsx` + `delete-paper-dialog.test.tsx` + e2e `library-crud.spec.ts` (seed→browse→detail→edit→delete).
    - **PAPER-018** — component `continue-reading.test.tsx` (empty-state/paperId-href/keyword-normalization) + e2e `read-tracking.spec.ts` (open→touch→surfaces + recency ordering/reorder).
    - **PAPER-010** — unit `paper-dedup.test.ts` `decideVisibility` list-tier/precedence + `accessTier` + `isDedupVisible`; integration `paper-dedup.test.ts` `checkVisibility` public-org list-only / member-full / private-none / in-library precedence; e2e N/A — no list-only UI surface yet.
    - **PAPER-009** — unit `app/api/papers/[paperId]/file/route.test.ts` (mocked-collaborator route handler: `401`/`403` `none`+`list`/`404`, `304` + `304`-vs-`403` access-recheck precedence, `206`/`416` Range with slice forwarded, `200` full stream + `private, no-cache`/stable-ETag); integration + e2e N/A — Storage not emulated, session not forgeable offline, so an emulator test would exercise firebase-admin not our logic.
    - **ORG-001** — unit `app/api/orgs/route.test.ts` (mocked `getSession`/`adminFirestore` POST handler: `401`/`400` invalid-invariant-combos + missing-name/`201` valid combos, creator-as-admin two-doc batch + single commit, mark upper-cased, description default) + unit `create-org-dialog.test.tsx` (defaults pre-selected, invariant coupling, name-required gating, submit payload→`router.push`, error mapping) + e2e `org-creation.spec.ts` (register→login→dialog defaults/name-gate/Private→invite-only/create→land on `/orgs/{id}` as Admin).
    - **ORG-002** — edit org profile: Admin-only name/mark/description edit via the shared `[orgId]` PATCH route + `EditOrgProfile` Manage-tab card; unit `app/api/orgs/[orgId]/route.test.ts` PATCH gates + profile-write payload, unit `edit-org-profile.test.tsx` dirty-gate/validation/PATCH→refresh/error mapping, e2e `org-edit-profile.spec.ts` Manage-tab edit→header re-render.
    - **ORG-004** — set/change join policy: invariant extracted to shared `src/lib/orgs/join-policy.ts` and both org routes wired to it; unit `join-policy.test.ts` all six `visibility × policy` combos + `defaultJoinPolicy`, unit `app/api/orgs/[orgId]/route.test.ts` `PATCH — join policy invariant` block (allowed switch / rejected invalid combos no-write / visibility-carry), e2e `org-join-policy.spec.ts` Manage-tab pills→PATCH→persistence-across-reload + public-only pills disabled when private.
    - **ORG-006** — member listing + role badges: `MemberTable` on shadcn primitives (Table/Avatar/Badge/InputGroup/Empty) preserving the mono/pill aesthetic; component test `member-table.test.tsx` role-badge/one-Admin, "You"-row marker, join ISO-vs-em-dash, case-insensitive name/handle search, `Empty` no-match, "+N more" cap hint; e2e optional and skipped.
    - **ORG-014** — join open public org: transactional `POST /api/orgs/[orgId]/join` + wired `JoinOrgButton` (polished onto the app's standard in-button `Loader2` spinner + `aria-busy`); e2e `org-join-open-public.spec.ts` self-join open public org (Join → `200` → member view) + 1000-cap asserted as UI gate (disabled + "This org is full") and route's in-transaction re-check (direct authenticated POST → `409`), new `seedOrg` emulator helper; unit N/A — transactional Firestore I/O.
- **Testing infrastructure ([INFRA-001](./infra/INFRA-001-test-emulator-playwright.md)) — done.** JDK installed (Temurin 25) and the Firebase emulator (Auth + Firestore) boots via `firebase.json`. All four lanes are live: `npm test` (pure units, src/**), `npm run test:rules` (security-rules, `tests/rules/`), `npm run test:integration` (registration transaction, `tests/integration/`), and `npm run test:e2e` (Playwright, offline `demo-paper` project). The emulator-backed lanes each wrap their runner in `firebase emulators:exec`. No longer a standing gap.
