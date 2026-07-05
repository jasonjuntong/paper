// The join-policy invariant, in one place. An Org's join policy is bounded by
// its visibility: public Orgs are `open` or `request`; private Orgs are
// `invite`-only. Both the create route (src/app/api/orgs/route.ts) and the
// edit route (src/app/api/orgs/[orgId]/route.ts) enforce this — server-side,
// as defense in depth — so it lives here as a single source of truth.

export type Visibility = 'public' | 'private'
export type JoinPolicy = 'open' | 'request' | 'invite'

// public → open | request; private → invite-only.
export function isJoinPolicyValid(vis: Visibility, policy: JoinPolicy): boolean {
  return vis === 'public'
    ? policy === 'open' || policy === 'request'
    : policy === 'invite'
}

// The policy an Org falls back to for a given visibility — used when a
// visibility change carries the policy with it, and as defense in depth so an
// invalid pairing is never persisted.
export function defaultJoinPolicy(vis: Visibility): JoinPolicy {
  return vis === 'public' ? 'request' : 'invite'
}
