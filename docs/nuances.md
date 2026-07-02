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
