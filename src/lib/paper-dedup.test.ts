import { describe, it, expect } from 'vitest'
// Import the pure core directly — not `@/lib/paper-dedup`, which would boot the
// Firebase Admin SDK (needs a service account) just to reach these functions.
import {
  accessTier,
  classifyDedupDistance,
  decideVisibility,
  isDedupVisible,
} from '@/lib/paper-dedup-core'
import type { OrgRef } from '@/types/paper'

// PAPER-003 Layer-1 dedup: the pure visibility decision that shapes the `init`
// response for a byte-identical re-upload. Given only the user's library + org
// state, it picks in-library / in-org / none — precedence in-library > in-org >
// none, so a paper the user already owns is never downgraded to org-visible.

const org = (id: string, name: string): OrgRef => ({ id, name })

describe('decideVisibility', () => {
  it('returns in-library when the user already has a library entry', () => {
    expect(decideVisibility('entry-1', [])).toEqual({
      visibility: 'in-library',
      entryId: 'entry-1',
    })
  })

  it('prefers in-library over in-org when both would match', () => {
    // Ownership wins outright — the org match is not surfaced.
    expect(decideVisibility('entry-1', [org('o1', 'Acme')])).toEqual({
      visibility: 'in-library',
      entryId: 'entry-1',
    })
  })

  it('returns in-org with the matching orgs when not in-library', () => {
    const orgs = [org('o1', 'Acme'), org('o2', 'Globex')]
    expect(decideVisibility(null, orgs)).toEqual({ visibility: 'in-org', orgs })
  })

  it('carries a single matching org through unchanged', () => {
    expect(decideVisibility(null, [org('o1', 'Acme')])).toEqual({
      visibility: 'in-org',
      orgs: [org('o1', 'Acme')],
    })
  })

  it('returns none when the paper is neither owned nor shared to a member org', () => {
    expect(decideVisibility(null, [])).toEqual({ visibility: 'none' })
  })

  // PAPER-010 list-only tier: a public org the user hasn't joined grants
  // metadata-only access, ranked below full access (library + member org).
  it('returns list with the public orgs when only public-org shared', () => {
    const orgs = [org('o3', 'Open Lab')]
    expect(decideVisibility(null, [], orgs)).toEqual({ visibility: 'list', orgs })
  })

  it('prefers in-org (full) over list when both a member and a public org match', () => {
    const member = [org('o1', 'Acme')]
    expect(decideVisibility(null, member, [org('o3', 'Open Lab')])).toEqual({
      visibility: 'in-org',
      orgs: member,
    })
  })

  it('prefers in-library over a public-org list match', () => {
    expect(decideVisibility('entry-1', [], [org('o3', 'Open Lab')])).toEqual({
      visibility: 'in-library',
      entryId: 'entry-1',
    })
  })
})

// PAPER-010: the access tier a visibility grants. Own library + member orgs are
// full content; a public org the user hasn't joined is list-only; else none.
describe('accessTier', () => {
  it('maps in-library to full', () => {
    expect(accessTier({ visibility: 'in-library', entryId: 'e1' })).toBe('full')
  })

  it('maps in-org to full', () => {
    expect(accessTier({ visibility: 'in-org', orgs: [org('o1', 'Acme')] })).toBe('full')
  })

  it('maps list to list', () => {
    expect(accessTier({ visibility: 'list', orgs: [org('o3', 'Open Lab')] })).toBe('list')
  })

  it('maps none to none', () => {
    expect(accessTier({ visibility: 'none' })).toBe('none')
  })
})

// PAPER-010: dedup "visible" gates whether a duplicate prompt may surface a
// candidate's title — only library + member-org papers, never list-only/none.
describe('isDedupVisible', () => {
  it('is true for in-library and in-org', () => {
    expect(isDedupVisible({ visibility: 'in-library', entryId: 'e1' })).toBe(true)
    expect(isDedupVisible({ visibility: 'in-org', orgs: [org('o1', 'Acme')] })).toBe(true)
  })

  it('is false for list and none (would leak a non-visible title)', () => {
    expect(isDedupVisible({ visibility: 'list', orgs: [org('o3', 'Open Lab')] })).toBe(false)
    expect(isDedupVisible({ visibility: 'none' })).toBe(false)
  })
})

// PAPER-004 Layer-2 dedup: the pure tier decision on the cosine *distance* to the
// nearest global paper. distance = 1 − similarity, so the spec's similarity bands
// (≥0.92 auto, 0.85–0.92 borderline, <0.85 new) map to distance ≤0.08, ≤0.15, >0.15.
describe('classifyDedupDistance', () => {
  it('classifies an exact/near match as an automatic duplicate', () => {
    expect(classifyDedupDistance(0)).toBe('auto')
  })

  it('treats the 0.08 boundary (similarity 0.92) as automatic', () => {
    expect(classifyDedupDistance(0.08)).toBe('auto')
  })

  it('classifies just past the auto boundary as borderline', () => {
    expect(classifyDedupDistance(0.081)).toBe('borderline')
  })

  it('treats the 0.15 boundary (similarity 0.85) as borderline', () => {
    expect(classifyDedupDistance(0.15)).toBe('borderline')
  })

  it('classifies past the borderline boundary as a new paper', () => {
    expect(classifyDedupDistance(0.151)).toBe('new')
  })
})
