# Scolar — Tech Stack

> Domain: `all`. Related domains: `user/`, `paper/`, `org/`.
> Part of: [Scolar Specifications](./scolar-specs.md)
> See also: [Paper](./paper/paper.md) | [To Be Determined](./tbd.md)

---

## 1. Frontend

### Next.js 16 (App Router)

- Version: **16.2.6** — has breaking changes from prior major versions; all code must follow conventions in `node_modules/next/dist/docs/` before writing any Next.js code (see `AGENTS.md`)
- Uses the **App Router** (not Pages Router) — file-based routing under `src/app/`, co-located layouts, and nested route segments
- **React Server Components (RSC)** are the default — components are server-rendered unless explicitly opted in with `"use client"`
- **Streaming responses** power the premium AI feature output — token-by-token delivery to the client via SSE / Next.js streaming response APIs
- **Route Handlers** (`src/app/api/`) handle all server-side processing: the paper upload pipeline, Gemini API calls, embedding generation, and Firebase interactions that must not run in the browser
- Why chosen: RSC and streaming are essential for the token-by-token premium AI output flow; the App Router's nested layouts and server-first model simplify the authenticated shell and reduce client-side JS

### React 19

- Version: **19.2.4** — ships with Next.js 16
- Server components are the default rendering mode; `"use client"` is used only at genuine interactivity boundaries (forms, state, event handlers)

### TypeScript

- Version: **^5**, `strict: true` — all strict checks enforced with no exceptions
- Target: `ES2017`; module resolution: `bundler`
- Path alias: `@/*` → `./src/*`
- `noEmit: true` — TypeScript is used for type checking only; Next.js handles all compilation and bundling
- Why: Strict typing prevents entire classes of runtime errors in the upload pipeline, dedup logic, and AI output handling — all of which involve complex data shapes

### Tailwind CSS v4

- Version: **^4.3** — configured via `@tailwindcss/postcss` (the v4 PostCSS integration, which differs significantly from v3 setup)
- No `tailwind.config.js` — v4 uses a CSS-first configuration model; all theme customization lives in `src/app/globals.css`
- `tw-animate-css` provides animation utility classes
- `clsx` + `tailwind-merge` handle conditional and merged class names throughout components

### shadcn/ui

- Version: **^4.8**
- Style preset: `radix-nova`
- Base color: `neutral`; CSS variables: enabled
- RSC support: enabled — components work in server and client contexts
- Icon library: `lucide-react` (^1.16)
- Component aliases: `@/components/ui` (components), `@/lib/utils` (utilities), `@/hooks` (hooks)
- Accessible primitives via `@radix-ui` (^1.4.3) — shadcn components are built on top of Radix headless UI
- Why chosen: Accessible, composable, copy-paste components with no runtime CSS-in-JS overhead; full ownership of component source makes customization straightforward

### Zod

- Version: **^4.4**
- Used for **all input and I/O validation** across the application — form inputs, API route request bodies, and AI model output schemas
- The Gemini Flash metadata extraction output is validated against a Zod schema (`title`, `authors`, `year`, `keywords`, `synopsis`) before being treated as a usable draft
- API route handlers validate all incoming request bodies with Zod before any database or AI calls proceed
- Why: A single validation library used consistently at every boundary — client form → server route → AI output — eliminates entire categories of type confusion and malformed-data bugs

---

## 2. Backend & Infrastructure

### Firebase

Firebase serves as the unified backend platform for Scolar — covering auth, NoSQL database, file storage, real-time data synchronization, and vector search from a single Google Cloud-backed service.

Why chosen: Eliminates the need for separate auth, file storage, WebSocket, and vector DB services. Firestore's native real-time listeners replace a dedicated WebSocket/Realtime service, built-in vector search replaces a standalone vector DB, and Firestore Security Rules replace PostgreSQL Row Level Security — all within one platform.

**No ORM.** Application code uses the **Firebase client SDK** (`firebase`) and **Firebase Admin SDK** (`firebase-admin`) directly — no Drizzle, Prisma, or other ORM layer. Authorization is delegated entirely to **Firestore Security Rules** (`firestore.rules`) rather than enforced in application code. Client-side reads use the Firebase client SDK with security rules enforced at the database level; server-side privileged operations (system writes, cross-document transactions, cap enforcement) use `firebase-admin` in Next.js Route Handlers, which bypasses security rules intentionally.

#### Auth

- Method: **email + password only** — no OAuth providers, no magic links, no SSO
- Email verification is required before app access — unverified accounts cannot use the application
- **Forgot password flow:** uses `admin.auth().generatePasswordResetLink()` to obtain a Firebase-signed `oobCode`, then sends a branded email via **Resend** linking to Scolar's own `/reset-password` page — no Firebase-hosted UI involved. The client finalises the reset with `confirmPasswordReset(auth, oobCode, newPassword)`. Email is the only channel Scolar uses to contact users.
- **Duplicate email at registration:** Firebase Authentication throws `auth/email-already-in-use` when registering with an existing email. The server Route Handler catches this error silently and returns the same "Check your email" success response as a genuine new registration — preventing user enumeration. No duplicate account is created; uniqueness is enforced by Firebase Auth.
- Session management: Firebase ID tokens are exchanged for server-side session cookies managed by `firebase-admin` in Next.js Route Handlers

#### Firestore

- Primary NoSQL document database for all application data
- **Collection structure:**
  - `/users/{userId}` — user profile documents; subcollections: `/library/{entryId}`, `/notifications/{notifId}`
  - `/papers/{paperId}` — global paper records (metadata, `VectorValue(768)` embedding, cached AI outputs)
  - `/orgs/{orgId}` — org documents with atomic counters (`memberCount`, `inviteCount`, `requestCount`); subcollections: `/members/{userId}`, `/invites/{inviteId}`, `/joinRequests/{requestId}`, `/sharedPapers/{paperId}`, `/adminTransferOffers/{offerId}`
- **Firestore Security Rules** (`firestore.rules`) govern all client-side read/write access — equivalent to PostgreSQL Row Level Security
- Business logic constraints (cap enforcement, expiry checks, referential integrity) are enforced in server-side Route Handlers using `firebase-admin` within Firestore transactions — not in client code or security rules

#### Cloud Storage

- Stores PDF files in a Firebase Cloud Storage bucket
- **PDFs are only written to Cloud Storage after the user confirms metadata** — the PDF is held client-side (via `pdfjs-dist`) until a committed paper document exists in Firestore
- The global `/papers/{paperId}` document stores the Cloud Storage path; the file is never stored without a corresponding committed Firestore document
- This design eliminates orphaned PDFs by construction — there is no point in the upload flow where a file is stored without a following Firestore write

#### Realtime

- Powers **all in-app notifications** — delivered in real-time via Firestore real-time listeners (`onSnapshot`) on the `/users/{userId}/notifications/` subcollection
- Notification events: invite sent/received, member kicked, Admin transfer offer sent/accepted/declined, Step Down initiated/expired, Org deletion, join request approved/rejected
- No email or push notifications at launch — all notification delivery is in-app only

#### Firestore Vector Search

- Firestore native vector search stores and queries paper embeddings directly in the database — no separate vector DB service needed
- Paper embeddings stored as `VectorValue(768)` on the global `/papers/{paperId}` document (field: `embedding`)
- Cosine similarity search powers the **Idea/Proposal Verification** feature — users input a plain-text idea; it is embedded and searched against stored paper embeddings using `findNearest({ vectorField: 'embedding', queryVector, limit, distanceMeasure: 'COSINE' })`
- Visibility scoping: the server Route Handler collects the user's accessible paper IDs (from `/users/{userId}/library/` + org `/sharedPapers/` subcollections), then passes them as a pre-filter to `findNearest` — results are restricted to the user's accessible pool
- Embeddings are generated once per unique global paper and reused by all library entries that reference it — no re-embedding on deduplication hits

### Resend

- Role: **transactional email delivery** — password reset is the only email Scolar sends to users at launch
- Package: `resend`
- Env var: `RESEND_API_KEY`
- Why chosen: Firebase's built-in password reset email cannot be customised (template, sender domain, branding); Resend gives full control over the email while Firebase still owns the cryptographic `oobCode` validation

---

## 3. AI & Machine Learning

### Groq (`llama-3.3-70b-versatile`)

- Role: **metadata extraction** during paper upload
- Package: `groq-sdk`; env var: `GROQ_API_KEY`
- Input: first 5 pages of text extracted from the PDF (client-side, via `pdfjs-dist`)
- Output: structured JSON with fields `title`, `authors`, `year`, `keywords`, `synopsis` — validated via Zod before use; `response_format: { type: 'json_object' }` enforces JSON mode
- Retried up to **3 times** on any failure, including 429 rate-limit errors (no separate rate-limit handling — 429 counts as a normal failure attempt)
- If all 3 attempts fail, the user is shown a manual input form pre-filled with whatever partial draft was returned (may be empty)
- The extracted output is always a **draft** — metadata is only final once the user reviews and saves it
- Why chosen: Fast inference, generous free tier; runs once per unique paper (deduplication prevents re-processing); `llama-3.3-70b-versatile` provides reliable structured extraction from academic text

### Google Gemini Pro

- Role: **premium AI features** — Summary, Conclusions, Key Findings, Methodology
- Triggered **on-demand** by premium users only; free users see a locked state with an upgrade prompt
- Output is **streamed token-by-token** to the client (SSE / Next.js streaming responses)
- Generated output is **cached on the global paper record** — once generated for a paper, it is served instantly to all subsequent premium users who can access that paper; no re-generation needed
- Cache access is gated by the same request-time paper visibility check — losing access to a paper means losing access to its cached AI output
- Why chosen: Higher quality generation for the paid, quality-sensitive outputs; token streaming provides a responsive UX for longer outputs

### Gemini `gemini-embedding-2`

- Role: **paper embeddings** (generated once at upload) and **query embeddings** (per similarity search)
- Package: `@google/genai`; env var: `GEMINI_API_KEY`; `apiVersion: 'v1'`
- Output dimension: **768** — native output truncated via `outputDimensionality: 768`; stored as `VectorValue(768)` in Firestore via native vector search
- Embedding input per paper: concatenation of `title + synopsis + keywords`
- Embeddings are generated once on the global paper record and reused forever — all library entries pointing to the same global paper share its embedding; deduplication prevents redundant embedding generation
- Query embeddings are generated per similarity search request (negligible cost — no generation, purely a vector lookup after embedding the query)
- Why chosen: Negligible cost per call; 768-dim output fits within Firestore Vector Search's dimension limit; generated once and reused indefinitely per paper

---

## 4. Document Processing

### pdfjs-dist

- Runs **entirely client-side** in the browser — no server-side PDF processing
- Responsibilities at upload time:
  - Extracts full text from the uploaded PDF (the first 1–2 pages are used for metadata extraction; full text is available for future use)
  - Computes the **SHA-256 hash** of the raw PDF file — used for Layer 1 deduplication (instant, pre-processing)
- Only the **extracted text + hash** are sent to the server in the first upload phase — the PDF binary stays in the browser until metadata is confirmed and committed
- Why: Keeps the large PDF binary out of the network request until it is actually needed; enables the Layer 1 hash dedup check before any AI processing or storage occurs; offloads text extraction work to the client, reducing server compute

---

## 5. Dependency Summary

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.6 | Framework — App Router, RSC, streaming, Route Handlers |
| `react` / `react-dom` | 19.2.4 | UI runtime |
| `typescript` | ^5 | Type safety (strict mode, `noEmit`) |
| `tailwindcss` | ^4.3 | Styling (CSS-first config, v4 PostCSS) |
| `shadcn` | ^4.8 | UI component library (radix-nova preset) |
| `radix-ui` | ^1.4.3 | Accessible headless primitives (shadcn base) |
| `zod` | ^4.4 | Input and I/O validation (forms, API routes, AI output) |
| `lucide-react` | ^1.16 | Icon library |
| `clsx` | ^2.1 | Conditional class name utility |
| `tailwind-merge` | ^3.6 | Merge Tailwind classes without conflicts |
| `tw-animate-css` | ^1.4 | Animation utility classes |
| `resend` | — | Transactional email — password reset only at launch |
| `firebase` | — | Firebase client SDK — Firestore, Auth, Cloud Storage (browser) |
| `firebase-admin` | — | Firebase Admin SDK — privileged server-side ops in Route Handlers |
| Firebase Authentication | — | Email + password auth; session cookies via `firebase-admin` |
| Firestore | — | Primary NoSQL DB; Security Rules enforce access control; real-time `onSnapshot` |
| Firebase Cloud Storage | — | PDF file storage (committed after metadata confirmed) |
| Firestore Vector Search | — | Cosine similarity search (`findNearest`, `VectorValue(768)`) |
| `pdfjs-dist` | — | Client-side PDF text extraction and SHA-256 hashing |
| `groq-sdk` | — | Metadata extraction — `llama-3.3-70b-versatile`, structured JSON, retried up to 3× |
| Gemini Pro | — | Premium AI features — streamed, cached per global paper |
| `@google/genai` + `gemini-embedding-2` | — | Paper + query embeddings (768-dim via `outputDimensionality`, generated once per paper) |

