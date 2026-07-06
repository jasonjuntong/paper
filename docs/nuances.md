# Nuances & deferred decisions

A running log of **intentional-but-debatable** choices — places where the code
diverges from a general best practice for a concrete reason, or where a cleaner
approach exists but was deferred. Not bugs, not TODOs in code: architectural
nuances to re-examine during code review or a later hardening pass.

**Each entry:** what the nuance is · current approach · why it's this way ·
what should trigger a revisit.

---

## N-001 — Auth mutations use Route Handlers, not Server Actions

**Status:** Intentional · revisit auth-wide, not per-route

**Nuance.** Next.js best practice (and the `next-best-practices` skill) says to
*prefer Server Actions* for mutations triggered from the UI, and use Route
Handlers for external integrations / public APIs. All our auth mutations
(`/api/auth/register`, `/api/auth/session`, `/api/auth/signout`,
`/api/auth/forgot-password`) are Route Handlers instead.

**Why it's this way.**
- **Client-SDK → Admin-SDK token handshake.** Login runs the Firebase *client*
  SDK in the browser (`signInWithEmailAndPassword`) to mint an `idToken`, then
  POSTs it to `/api/auth/session`, where the *Admin* SDK exchanges it for a
  session cookie (`createSessionCookie`). The server's role is "receive a token
  the browser already minted" — a natural HTTP endpoint.
- **Firebase's documented session-cookie pattern** expects an endpoint that
  receives an idToken.
- **Signout must be navigable.** `signout/route.ts` issues a redirect and is hit
  directly to break a proxy loop — a Server Action can't be a visited URL.
- **Uniform, testable REST surface.** register/forgot return `{ ok: true }` with
  meaningful status codes (409, 400) the client branches on; the integration +
  e2e lanes call these as HTTP endpoints (`tests/integration/registration.test.ts`).

**The honest part.** `register` and `forgot-password` are pure server-side
mutations that *could* be Server Actions (they can set cookies via `cookies()`).
They stay Route Handlers for **consistency** with login/session/signout, which
genuinely need to be endpoints.

**Revisit when.** Reworking the auth surface as a whole, or if a future flow
needs progressive-enhancement / no-JS form posts (Server Actions' strength).
Don't convert a single route in isolation — it would split the convention.

---

## N-002 — Sidebar display name goes stale after a name change

**Status:** Intentional · revisit when profile edits need to reflect nav-wide

**Nuance.** After a user renames themselves on `/settings`, the settings page
reflects the new name immediately (it reads the user doc + local state), but the
**sidebar/nav** still shows the *old* name until the next sign-in.

**Why it's this way.** The nav name comes from `getSession()` → the decoded
**session-cookie Auth claims** (`(app)/layout.tsx` passes `session` to
`AppSidebar` → `nav-user`). `POST /api/account` updates the Auth `displayName`
and the Firestore user doc, but it does **not** re-mint the session cookie — the
cookie is only issued at login (`/api/auth/session`), so the stale `name` claim
persists in it. The write itself is correct; only the cached claim is old.

**Revisit when.** The nav name needs to update without a re-login. Options:
(a) read the nav name from the user doc in `(app)/layout.tsx` instead of the
session claims, or (b) re-mint the session cookie after a profile update. Deferred
because it's a cosmetic staleness that self-heals on next login, and USER-005's
scope is the settings surface, not the session-refresh mechanism.

---

## N-003 — Paper list-only tier depends on `publicOrgIds`, which nothing populates yet

**Status:** Intentional · dormant-but-correct until PAPER-015 lands

**Nuance.** `checkVisibility` (`src/lib/paper-dedup.ts`) now derives the **list-only**
access tier — a public org the user hasn't joined — from the denormalized
`publicOrgIds: string[]` field on the global paper `/papers/{paperId}`. But **no
code writes that field today**: `commit/route.ts` creates the global paper without
it, and the share/unshare/visibility-toggle maintenance lives in unbuilt tickets
(PAPER-015, ORG-021, ORG-003). So in production `publicOrgIds` reads as empty and
the `list` tier **never fires** — `checkVisibility` yields exactly the pre-existing
`in-library` / `in-org` / `none` results.

**Why it's this way.** PAPER-010's job is the access *primitive*; PAPER-015 owns
populating `publicOrgIds`. Consuming the flag now (defaulted to `[]`) is
forward-compatible: the tier lights up automatically once the flag is maintained
and the public-org sharing UI (Phase 3) exists — no change to `checkVisibility`.
The behavior is fully implemented and proven by seeding `publicOrgIds` directly in
the integration lane (`tests/integration/paper-dedup.test.ts`); it's only *dormant*,
not missing. This also keeps PAPER-010 free of a hard dependency on PAPER-015.

**Revisit when.** PAPER-015 lands `publicOrgIds` maintenance — verify the list tier
then surfaces end-to-end (search PAPER-011, discovery PAPER-014, the "Join to read"
CTA), and that the PDF proxy (`accessTier(vis) !== 'full'` → 403) still denies
list-only papers once they actually appear.

---

## N-004 — The permissions table's *mutations* are enforced in route handlers, not security rules

**Status:** Intentional · structural (ORG-025)

**Nuance.** ORG-025's scope reads "rules enforce the full permissions table
(Admin-only mutations, owner-only shares, …)." But `firestore.rules` does **not**
gate any mutation — every privileged write goes through `firebase-admin` in the
route handlers (`src/app/api/**`), which **bypasses security rules entirely**. The
client SDK never writes Firestore (it only reads `/handles` for registration
availability, and public-org reads for a future client surface). So the rules'
entire contribution to the write side is `allow write: if false` everywhere; the
member cap, Admin-only actions, owner-only share/unshare, and visibility
invariants are all enforced in the handlers (e.g. the org-join transaction in
`src/app/api/orgs/[orgId]/join/route.ts`, the PATCH invariants in
`src/app/api/orgs/[orgId]/route.ts`).

**Why it's this way.** Rules can only enforce what the client is allowed to *send*.
With a server-only write model there are no client mutations to authorize, so
duplicating the permissions table into rules would gate requests that never occur
— dead logic that drifts from the handlers, which stay the single source of truth.
Rules therefore do exactly what they can: deny all client writes, and gate the
handful of legitimate client **reads** (public orgs, public-org `sharedPapers`
list access, `/handles`). The "rules enforce the table" acceptance criterion is
met in the only way it can be for this architecture — deny-all-writes plus
read-gating to the table's read rows.

**Revisit when.** Any mutation moves to the client SDK (e.g. invite accept/decline
or join-request submit done directly from the browser instead of via a handler).
That write would then need a real rule mirroring its permissions-table row, plus a
rules-lane test. Until then, adding client-write rules is speculative and out of
scope. See [N-003](#n-003--paper-list-only-tier-depends-on-publicorgids-which-nothing-populates-yet)
for the related `publicOrgIds`-dormant note.
