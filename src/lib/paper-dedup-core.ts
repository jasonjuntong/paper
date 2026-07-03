import type { OrgRef } from '@/types/paper'

// Pure dedup logic, kept free of any Firebase Admin import so the offline unit
// lane can exercise it without booting the Admin SDK (which needs a service
// account). The Firestore-backed helpers live in `paper-dedup.ts`, which
// re-exports everything here so `@/lib/paper-dedup` stays the single entry point
// for server code.

export type Visibility =
  | { visibility: 'in-library'; entryId: string }
  | { visibility: 'in-org'; orgs: OrgRef[] }
  | { visibility: 'none' }

/**
 * Pure visibility decision, factored out of `checkVisibility` so it can be
 * unit-tested without Firestore. Precedence is in-library → in-org → none: a
 * paper the user already owns is never surfaced as merely org-visible.
 *
 * @param libraryEntryId  id of the user's existing library entry for this paper,
 *                        or null if it isn't in their library.
 * @param matchingOrgs    member orgs that have this paper shared (empty = none).
 */
export function decideVisibility(
  libraryEntryId: string | null,
  matchingOrgs: OrgRef[]
): Visibility {
  if (libraryEntryId) return { visibility: 'in-library', entryId: libraryEntryId }
  if (matchingOrgs.length > 0) return { visibility: 'in-org', orgs: matchingOrgs }
  return { visibility: 'none' }
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
