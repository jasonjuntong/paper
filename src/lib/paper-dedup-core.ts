import type { OrgRef } from '@/types/paper'

// Pure dedup logic, kept free of any Firebase Admin import so the offline unit
// lane can exercise it without booting the Admin SDK (which needs a service
// account). The Firestore-backed helpers live in `paper-dedup.ts`, which
// re-exports everything here so `@/lib/paper-dedup` stays the single entry point
// for server code.

export type Visibility =
  | { visibility: 'in-library'; entryId: string }
  | { visibility: 'in-org'; orgs: OrgRef[] } // member org(s) → full access
  | { visibility: 'list'; orgs: OrgRef[] } // public org(s), non-member → list-only
  | { visibility: 'none' }

/**
 * Pure visibility decision, factored out of `checkVisibility` so it can be
 * unit-tested without Firestore. Precedence is in-library → in-org → list →
 * none: a paper the user already owns is never surfaced as merely org-visible,
 * and full access (member org) always beats the list-only public-org tier.
 *
 * @param libraryEntryId     id of the user's existing library entry for this
 *                           paper, or null if it isn't in their library.
 * @param matchingMemberOrgs member orgs that have this paper shared (full).
 * @param publicOrgs         public orgs the user is *not* a member of that have
 *                           this paper shared (list-only). Empty = none.
 */
export function decideVisibility(
  libraryEntryId: string | null,
  matchingMemberOrgs: OrgRef[],
  publicOrgs: OrgRef[] = []
): Visibility {
  if (libraryEntryId) return { visibility: 'in-library', entryId: libraryEntryId }
  if (matchingMemberOrgs.length > 0) return { visibility: 'in-org', orgs: matchingMemberOrgs }
  if (publicOrgs.length > 0) return { visibility: 'list', orgs: publicOrgs }
  return { visibility: 'none' }
}

/** Access tier a `Visibility` grants: full content, list-only metadata, or none. */
export type AccessTier = 'full' | 'list' | 'none'

/**
 * Collapse a `Visibility` to the access tier it grants. Own library and member
 * orgs are full (detail page + PDF reader + AI insights); a public org the user
 * hasn't joined is list-only (metadata snapshot); otherwise none.
 */
export function accessTier(v: Visibility): AccessTier {
  switch (v.visibility) {
    case 'in-library':
    case 'in-org':
      return 'full'
    case 'list':
      return 'list'
    case 'none':
      return 'none'
  }
}

/**
 * Whether a dedup candidate is already visible to the user for the purpose of
 * showing a duplicate prompt. Only library + member-org papers qualify — a
 * public-org paper the user hasn't joined must never be surfaced this way, or a
 * borderline prompt would leak its title (paper.md §2).
 */
export function isDedupVisible(v: Visibility): boolean {
  return v.visibility === 'in-library' || v.visibility === 'in-org'
}

export type DedupTier = 'auto' | 'borderline' | 'new'

// Layer-2 dedup thresholds expressed as cosine *distance* (= 1 − similarity), the
// unit `findNearest` reports. similarity ≥ 0.92 ⇒ distance ≤ 0.08 (automatic dup);
// 0.85 ≤ similarity < 0.92 ⇒ 0.08 < distance ≤ 0.15 (borderline confirm).
export const AUTO_MAX_DISTANCE = 0.08
export const BORDERLINE_MAX_DISTANCE = 0.15

/**
 * Pure similarity-tier decision for Layer-2 dedup, factored out so it can be
 * unit-tested without Firestore/Gemini. `distance` is the cosine distance to the
 * nearest global paper (smaller = more similar).
 */
export function classifyDedupDistance(distance: number): DedupTier {
  if (distance <= AUTO_MAX_DISTANCE) return 'auto'
  if (distance <= BORDERLINE_MAX_DISTANCE) return 'borderline'
  return 'new'
}
