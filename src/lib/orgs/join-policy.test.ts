// ORG-004 unit lane (shared-validator half). The join-policy invariant is the
// single rule both org routes enforce; these are pure, mock-free checks of the
// allowed / forced / rejected combos it owns.
import { describe, it, expect } from 'vitest'
import { defaultJoinPolicy, isJoinPolicyValid } from './join-policy'
import type { JoinPolicy, Visibility } from './join-policy'

describe('isJoinPolicyValid', () => {
  // Every visibility × policy pairing, with the expected verdict.
  const cases: Array<[Visibility, JoinPolicy, boolean]> = [
    ['public', 'open', true],
    ['public', 'request', true],
    ['public', 'invite', false], // invite is private-only
    ['private', 'invite', true],
    ['private', 'open', false], // open/request are public-only
    ['private', 'request', false],
  ]

  it.each(cases)('%s + %s → %s', (vis, policy, expected) => {
    expect(isJoinPolicyValid(vis, policy)).toBe(expected)
  })
})

describe('defaultJoinPolicy', () => {
  it('falls back to request for public', () => {
    expect(defaultJoinPolicy('public')).toBe('request')
  })

  it('falls back to invite for private', () => {
    expect(defaultJoinPolicy('private')).toBe('invite')
  })

  it('always returns a policy valid for its visibility', () => {
    expect(isJoinPolicyValid('public', defaultJoinPolicy('public'))).toBe(true)
    expect(isJoinPolicyValid('private', defaultJoinPolicy('private'))).toBe(true)
  })
})
