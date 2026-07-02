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
