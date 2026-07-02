import { describe, it, expect } from 'vitest'
import { decideVisibility } from '@/lib/paper-dedup'
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
})
