# Scolar — Tickets

A full backlog derived from the hardened specs in [`docs/specs/`](../specs/). One ticket per spec'd feature, organized by domain (`user/`, `paper/`, `org/`).

**Status:** `Done` (implemented, matches spec) · `Partial` (stub/incomplete) · `Todo` (not started).

Tickets are grouped into **phases** below — a dependency-aware build sequence. Nothing in a phase depends on a later phase. Build top-to-bottom; within a phase, follow the listed order. See each ticket's `Depends on` field for exact blockers.

---

## Phase 0 — Foundations (mostly built; harden, don't rebuild)

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [USER-007](user/USER-007-handle-reservation-uniqueness.md) | Handle reservation & uniqueness (`/handles/{handle}`) | Todo | — | user.md#handle |
| [USER-001](user/USER-001-registration-email-verification.md) | Registration + email verification (incl. `@handle`) | Partial | USER-007 | user.md#authentication |
| [USER-002](user/USER-002-login.md) | Login (email + password) | Done | — | user.md#authentication |
| [USER-004](user/USER-004-email-enumeration-protection.md) | Email-enumeration protection | Done | USER-001 | user.md#authentication |
| [PAPER-001](paper/PAPER-001-upload-extract-hash.md) | Upload: client text extraction + SHA-256 hash | Done | — | paper.md#1-paper-upload--paper-details |
| [PAPER-002](paper/PAPER-002-paper-details-extraction-form.md) | Paper-details extraction (Groq) + review form | Partial | PAPER-001 | paper.md#1-paper-upload--paper-details |
| [PAPER-003](paper/PAPER-003-dedup-layer1-hash.md) | Layer 1 dedup (hash) + visibility responses | Done | PAPER-001 | paper.md#2-deduplication-strategy |
| [PAPER-005](paper/PAPER-005-embedding-generation.md) | Embedding generation (gemini-embedding-2, 768d) | Done | PAPER-001 | paper.md#5-similarity-search-ideaproposal-verification |
| [PAPER-004](paper/PAPER-004-dedup-layer2-embedding.md) | Layer 2 dedup (embedding similarity + borderline confirm) | Partial | PAPER-005 | paper.md#2-deduplication-strategy |
| [PAPER-006](paper/PAPER-006-library-entry-crud.md) | Library entry CRUD | Done | PAPER-003, PAPER-004 | paper.md#data-ownership-model |
| [PAPER-018](paper/PAPER-018-read-tracking.md) | Read tracking (lastOpenedAt) | Done | PAPER-006 | paper.md#4-pdf-reader |
| [PAPER-010](paper/PAPER-010-visibility-checkvisibility.md) | Paper visibility derivation + checkVisibility | Partial | PAPER-006 | paper.md#3-paper-visibility |
| [PAPER-009](paper/PAPER-009-pdf-serving-proxy.md) | PDF serving proxy (access-gated, Range, ETag) | Done | PAPER-010 | paper.md#4-pdf-reader |
| [ORG-001](org/ORG-001-org-creation.md) | Org creation + invariant | Done | — | org-overview.md#creation |
| [ORG-002](org/ORG-002-edit-name-description.md) | Edit org name/description | Partial | ORG-001 | org-overview.md#org-profile |
| [ORG-004](org/ORG-004-set-join-policy.md) | Set/change join policy | Done | ORG-001 | org-joining-invites.md#joining-an-org |
| [ORG-006](org/ORG-006-member-listing-roles.md) | Member listing + role badges | Done | ORG-001 | org-membership.md#roles-within-an-org |
| [ORG-014](org/ORG-014-join-open-public-org.md) | Join open public org | Done | ORG-001 | org-joining-invites.md#joining-an-org |
| [ORG-025](org/ORG-025-security-rules-indexes.md) | Firestore security rules + indexes | Partial | — | org-papers-permissions.md#permissions-summary |

## Phase 1 — User account basics

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [USER-003](user/USER-003-forgot-reset-password.md) | Forgot/reset password (custom + Resend) | Partial | USER-002 | user.md#authentication |
| [USER-005](user/USER-005-account-settings.md) | Account settings page | Todo | USER-002 | user.md#users-app-wide |

## Phase 2 — Platform primitives (keystones)

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [ORG-023](org/ORG-023-notifications.md) | Notifications (in-app onSnapshot + email for high-priority) | Todo | — | org-papers-permissions.md#notifications |
| [PAPER-013](paper/PAPER-013-keyword-profile.md) | keywordProfile maintenance | Todo | PAPER-006 | paper.md#7-keyword-preference-profile |

## Phase 3 — Sharing keystone

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [PAPER-015](paper/PAPER-015-public-org-ids-flag.md) | publicOrgIds denormalized flag | Todo | PAPER-006 | paper.md#identifying-the-public-org-pool-denormalized-flag |
| [ORG-024](org/ORG-024-paper-count-counter.md) | paperCount counter maintenance | Todo | ORG-001 | org-papers-permissions.md#papers--orgs |
| [ORG-021](org/ORG-021-share-paper-to-org.md) | Share paper to org(s) | Todo | PAPER-010, PAPER-015, ORG-024 | org-papers-permissions.md#sharing |
| [ORG-022](org/ORG-022-unshare-paper-from-org.md) | Unshare paper from org | Todo | ORG-021 | org-papers-permissions.md#auto-unshare-on-membership-change |
| [PAPER-007](paper/PAPER-007-snapshot-write-fanout.md) | Write fan-out: library edit → org snapshots | Todo | ORG-021 | paper.md#data-ownership-model |
| [ORG-003](org/ORG-003-toggle-visibility-side-effects.md) | Toggle visibility + side effects | Partial | PAPER-015, ORG-024 | org-overview.md#visibility |
| [PAPER-008](paper/PAPER-008-pdf-reader-modal.md) | PDF reader modal | Partial | ORG-021, PAPER-009 | paper.md#4-pdf-reader |

## Phase 4 — Membership lifecycle

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [ORG-013](org/ORG-013-ghost-mode-lifecycle.md) | Ghost Mode lifecycle (status field) | Todo | ORG-001 | org-membership.md#deleting-an-org |
| [ORG-007](org/ORG-007-member-cap-reconciliation.md) | Member cap + reconciliation prompt | Partial | ORG-001 | org-membership.md#membership |
| [ORG-008](org/ORG-008-kick-member.md) | Kick member (+ auto-unshare) | Todo | ORG-022, ORG-023 | org-membership.md#leaving-an-org |
| [ORG-009](org/ORG-009-leave-org.md) | Leave org (+ auto-unshare; sole-admin delete) | Todo | ORG-022, ORG-013, ORG-023 | org-membership.md#leaving-an-org |
| [ORG-010](org/ORG-010-admin-transfer.md) | Admin transfer offers | Todo | ORG-023 | org-membership.md#admin-transfer |
| [ORG-011](org/ORG-011-step-down.md) | Step Down (request-to-be-admin, expiry→ghost) | Todo | ORG-010, ORG-013, ORG-023 | org-membership.md#step-down-admin-initiated-departure |
| [ORG-012](org/ORG-012-delete-org.md) | Delete org (warnings, seal pending, ghost) | Todo | ORG-022, ORG-013, ORG-023 | org-membership.md#deleting-an-org |

## Phase 5 — Joining & invites

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [ORG-015](org/ORG-015-join-requests.md) | Join requests (submit + admin approve/reject) | Partial | ORG-023, ORG-007 | org-joining-invites.md#join-requests-public-orgs-with-request-policy |
| [ORG-016](org/ORG-016-create-invites.md) | Create invites (pool, limits, cap, collision) | Todo | ORG-007, ORG-023 | org-joining-invites.md#invites |
| [ORG-017](org/ORG-017-invite-recipient-flow.md) | Invite recipient flow (accept/decline) | Todo | ORG-016, ORG-023 | org-joining-invites.md#invites |
| [ORG-018](org/ORG-018-invite-revocation.md) | Invite revocation | Todo | ORG-016 | org-joining-invites.md#invites |
| [ORG-005](org/ORG-005-private-no-members-warning.md) | Private-with-no-members warning | Todo | ORG-003 | org-overview.md#visibility |

## Phase 6 — Discovery, search & insights

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [PAPER-011](paper/PAPER-011-similarity-search.md) | Similarity search (idea verification) | Todo | PAPER-015, PAPER-010 | paper.md#5-similarity-search-ideaproposal-verification |
| [PAPER-014](paper/PAPER-014-paper-discovery.md) | Paper discovery (public-org pool, ranking) | Todo | PAPER-013, PAPER-015, ORG-021 | paper.md#8-paper-discovery |
| [ORG-019](org/ORG-019-org-discovery-search-browse.md) | Org discovery: search + browse | Partial | ORG-021, ORG-024 | org-discovery.md#discovery-surfaces |
| [ORG-020](org/ORG-020-org-suggested.md) | Org suggested/recommended (keyword overlap) | Todo | PAPER-013, ORG-021 | org-discovery.md#suggested--recommended-logic |
| [PAPER-012](paper/PAPER-012-ai-insights.md) | AI-generated insights (Gemini Pro, streaming) | Todo | PAPER-010 | paper.md#6-ai-generated-insights-on-demand |

## Phase 7 — Cleanup & cascade

| ID | Title | Status | Depends on | Spec |
|----|-------|--------|-----------|------|
| [PAPER-016](paper/PAPER-016-paper-deletion-gc.md) | Paper deletion + global-paper lazy GC | Partial | ORG-022, PAPER-015, ORG-024, ORG-025 | paper.md#paper-deletion--global-paper-lifecycle |
| [USER-006](user/USER-006-account-deletion-cascade.md) | Account deletion + full cascade (incl. handle tombstone) | Todo | ORG-022, ORG-012, ORG-013, ORG-010, PAPER-016, ORG-023, USER-007 | user.md#account-deletion |
| [PAPER-017](paper/PAPER-017-scheduled-sweep.md) | Scheduled sweep (orphan backstop) | Todo | PAPER-016 | paper.md#scheduled-sweep-safety-net |

---

**Totals:** 7 USER · 18 PAPER · 25 ORG = **50 tickets**.
