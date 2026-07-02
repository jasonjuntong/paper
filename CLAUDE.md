@AGENTS.md

## Rules

- **Load the `next-best-practices` skill at the start of every session**, before writing or reviewing any Next.js code. This is Next.js 16 — APIs and file conventions differ from training data (e.g. `middleware.ts` → `proxy.ts`). Consult the skill's references rather than relying on memory.
- **Never modify files under `src/components/ui/`.** These are shadcn/ui source files. Customize via `className` props, wrapper components, or `cva` variants in *your own* files only.
- **Extend, don't edit.** If a component needs specific customization beyond `className`, create a new component in `src/components/` that wraps the shadcn primitive — e.g. `WideDialog` wraps `DialogContent` with `sm:max-w-none`, or `IconButton` wraps `Button` with a fixed icon slot. Never touch the originals in `src/components/ui/`.

## Nuances

- Intentional-but-debatable choices and deferred decisions are logged in `docs/nuances.md` — read it before "fixing" something that looks off in auth/routing; it may be a known, deliberate tradeoff to revisit later.

## Specs

> The per-domain files under `docs/specs/` are the source of truth — read the relevant one for targeted context.
> No consolidated reference is committed; if a single-file view is needed, generate one on demand by concatenating these.

| Spec | File | Key topics |
|------|------|-----------|
| User | `docs/specs/user/user.md` | Auth (email+password only, no OAuth/magic links), registration fields, unique immutable `@handle`, notification email preference, account deletion cascade |
| Paper | `docs/specs/paper/paper.md` | Upload flow, 2-layer dedup (SHA-256 hash → embedding similarity: ≥0.92 auto, 0.85–0.92 borderline confirm), visibility (derived from shares), similarity search (Firestore Vector Search), metadata extraction (Groq llama-3.3-70b-versatile), embeddings (gemini-embedding-2, 768 dims), AI-generated insights (Gemini Pro), keyword preference profile, paper discovery (papers in public orgs) |
| Org: Overview & Profile | `docs/specs/org/org-overview.md` | Org creation, public/private visibility, join policy options, visibility toggle side-effects |
| Org: Membership, Roles & Deletion | `docs/specs/org/org-membership.md` | Admin/Member roles, 1000-member cap (members+invites+requests), admin transfer, step down, ghost mode (7-day) |
| Org: Joining & Invites | `docs/specs/org/org-joining-invites.md` | Join requests, in-app-only invites (no email/URL), 50-invite limit, configurable 1–14-day expiry (default 7), 48-hr decline cooldown, collision handling |
| Org: Discovery | `docs/specs/org/org-discovery.md` | Unified Discover surface (orgs + papers), search, browse, keyword-overlap suggestions via materialized keywordProfile (no embeddings) |
| Org: Papers & Permissions | `docs/specs/org/org-papers-permissions.md` | Paper sharing to orgs, auto-unshare on leave/kick, Firestore real-time notifications (onSnapshot) + email for high-priority events (Resend, opt-out), full permissions table |
| Tech Stack | `docs/specs/tech-stack.md` | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Zod, Firebase (Auth/Firestore/Cloud Storage/Vector Search, no ORM), pdfjs-dist, Groq (metadata extraction), gemini-embedding-2 (embeddings), Gemini Pro (AI-generated insights) |
