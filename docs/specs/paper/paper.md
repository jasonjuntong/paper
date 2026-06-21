# Scolar — Paper

> Domain: `paper/`. Related domains: `user/`, `org/`.
> Part of the Scolar specs (`docs/specs/`).
> See also: [User](../user/user.md) | [Org Papers & Permissions](../org/org-papers-permissions.md)

---

## Data Ownership Model

Scolar uses a **three-layer data model** for papers.

- **Global paper (`/papers/{paperId}`) — backend only:**
  Each unique paper exists exactly once as a global record. It holds the PDF file, Groq's raw extracted details, the embedding vector, and any cached premium AI outputs. The global paper is **never shown directly to users as a paper entry** — it exists solely for deduplication and caching.

- **Library entry (`/users/{uid}/library/{entryId}`) — all user-facing data:**
  Each user has their own library entries. A library entry references a global paper and holds the user's **personal confirmed copy** of the paper details (`title`, `authors`, `year`, `keywords`, `synopsis`). This is what the user sees in their library and paper detail pages. The user's copy starts as Groq's extracted output and may be modified by the user.

- **Org shared paper (`/orgs/{orgId}/sharedPapers/{paperId}`) — snapshot:**
  When a user shares a paper to an org, a snapshot of their library entry's paper details is written to the org. Org members who have not yet added the paper to their own library see this snapshot. When the sharer later edits their library entry, all org snapshots for that paper are updated in the same write batch (**write fan-out**) — org members always see the sharer's latest version.

This model denormalises data intentionally. Firestore has no joins; storing display data where it is read avoids N+1 lookups and keeps list queries fast.

---

## Core Features

### 1. Paper Upload + Paper Details

- PDF files only
- Text extraction is done **client-side** using `pdfjs-dist` before upload
- A SHA-256 hash of the file is computed client-side before upload
- Deduplication is checked at two layers (see Deduplication Strategy below)
- Paper details extraction is handled by **Groq** (`llama-3.3-70b-versatile`) using structured JSON output (JSON mode)
- Details are extracted from the **first 5 pages** of extracted text only
- This process is **not labeled as "AI"** in the UI — it appears as automatic paper detail extraction

**Paper details form is always shown — fields are read-only by default:**
- Groq's output is treated as a draft and pre-fills the form; all fields render as **read-only**
- Each field has a **pencil icon** at its trailing edge — clicking it unlocks that field for editing
- This makes deliberate edits explicit: the user must consciously choose to override the extracted value
- Fields that are empty after extraction (Groq failure or partial result) are **immediately editable** and display the helper text: *"Due to the complexity of the PDF content structure, the required information could not be extracted."*
- The paper details become final only when the **user saves**

**Discrepancy warning on modified fields:**
- If the user has modified any field that had an extracted value, a **blocking confirmation dialog** appears before the paper is saved:
  - Title: *"Changes detected in paper details"*
  - Body: *"We noticed some paper details were changed from what was automatically extracted. Saving modified details may reduce this paper's discoverability in search."*
  - Actions: **"Proceed"** (save with modified details) | **"Go back"** (return to the form)
- The word "metadata" is never shown in the UI — use "paper details" or "paper information" instead

**Extraction failure:**
- If Groq fails, return whatever partial result exists (fields may be empty)
- Empty fields are immediately editable; the user fills them in manually
- No retries — a single Groq attempt is made per upload to avoid rate limit errors

**All 5 paper detail fields are required:**
- `title`, `authors`, `year`, `keywords`, and `synopsis` must all be present before a paper can be saved
- A paper record is never created with missing fields

**Extracted paper detail fields:**

| Field | Notes |
|-------|-------|
| `title` | Paper title |
| `authors` | List of authors |
| `year` | Year published or finished |
| `keywords` | Tags or keywords |
| `synopsis` | The summarizing section of the paper, regardless of what it is called (Abstract, Rationale, Executive Summary, Summary, etc.) |

**Prompt strategy for synopsis:**
> Extract the section that summarizes the paper's purpose, methodology, and findings. This section may be titled Abstract, Summary, Executive Summary, Rationale, Overview, or similar — identify it by its role, not its heading.

**`extractedMetadata` storage:**
- Groq's raw output is stored **as-is** on the global paper as `extractedMetadata: { title, authors, year, keywords, synopsis }` — immutable, never overwritten by user edits
- The user's confirmed version (modified or not) is stored on the **library entry**
- The embedding is generated from `extractedMetadata` — not the user's version — ensuring consistency across all library entries that reference the same global paper

---

### 2. Deduplication Strategy

Two layers of deduplication are applied in order during upload. Deduplication is an implementation detail — users are only informed when the duplicate is already visible to them.

**Layer 1 — File hash (instant, pre-processing):**
- Compute SHA-256 of the uploaded PDF **content** (not the filename — renaming a file does not change its hash)
- If a paper with the same hash already exists → duplicate detected
- Catches byte-for-byte identical uploads

**Layer 2 — Embedding similarity (at commit, after details are confirmed):**
- Generate an embedding of the paper's **extracted** `title + synopsis + keywords` (Groq's raw output — never the user's edits) using `gemini-embedding-2`
- Run `findNearest()` against the `embedding` field on global papers (cosine similarity)
- If top result has similarity **≥ 0.92** → duplicate detected
- Catches "same paper, different file" cases (re-exports, different scans, different sources)

**Visibility-based response (applies to both layers):**

On any dedup hit, the server checks whether the matching paper is already visible to the uploading user:

| Visibility | How checked | Response |
|-----------|-------------|----------|
| In user's own library | `/users/{uid}/library` where `paperId == existingPaperId` | `in-library` — show card |
| In an org the user belongs to | `/orgs/{orgId}/sharedPapers/{paperId}` for any org the user is a member of | `in-org` — show card with org badges |
| Not visible (private to another user) | Neither of the above | Silent — normal upload flow continues |

**In-library response (dialog shows a card):**
- Displays: paper title + org badge(s) if also shared
- Message: *"This paper is already in your library"*
- Action: **"View paper"** → navigate to paper detail page
- No option to add again — duplicate library entries are not allowed

**In-org response (dialog shows a card):**
- Displays: paper title with org badge(s) — e.g. `Paper Title  [Org A] [Org B]`
- If multiple papers matched, each is listed with its respective orgs
- Message: *"This paper is already shared in [Org A, Org B]"*
- Actions: **"View paper"** (navigate to paper detail) | **"Proceed anyway"**
- **"Proceed anyway"** → paper details form shown, pre-filled from the org snapshot → user reviews and saves → library entry created pointing to the existing global paper

**Silent dedup (not visible to user):**
- No card, no notification — the upload flow continues normally
- Layer 1 hit: `init` returns the global paper's `extractedMetadata` as the pre-fill draft + `existingPaperId`; the user sees the standard paper details form
- Layer 2 hit: commit creates a library entry pointing to the existing global paper; user sees "Paper saved"
- In both cases the experience is identical to uploading a genuinely new paper

**No duplicate library entries:** If the user already owns the paper when a dedup hit is detected, no second library entry is created.

---

### 3. Paper Visibility

A paper's visibility is **derived from its share state**, not stored as an explicit column.

- **Private:** a library entry with zero Org shares → only the owner of the library entry can see it
- **Shared:** a library entry with one or more Org shares → visible to the owner + all members of the shared Orgs

There is no global/public visibility for papers. Sharing is always scoped to specific Orgs.

**Two access tiers — list vs. content:** access to a shared paper comes in two levels:
- **List access (metadata only)** — the paper appears in a list with its snapshot details (`title`, `authors`, `year`, `keywords`, `synopsis`) and source Org. **No** PDF reader, **no** premium AI.
- **Full access (content)** — the full paper detail page, the **PDF reader**, and **premium AI**.

Who gets which:

| Where the paper is shared | Owner | Org members | Anyone else (incl. non-members) |
|---------------------------|-------|-------------|---------------------------------|
| Private library (no shares) | Full | — | None |
| Shared to a **private** Org | Full | Full | None |
| Shared to a **public** Org | Full | Full | **List access only** (metadata) |

The **public-Org list exception** is the only way a non-member sees an Org's papers. It applies wherever a public Org's papers surface for a non-member — the **Org page**, the **Discover** surface, and **similarity search results** ([§5](#5-similarity-search-ideaproposal-verification)): each shows the shared-paper **list** (metadata snapshot), but opening the reader or premium AI is denied unless the user is a member (or the owner). To read such a paper, a non-member must **join the public Org**.

**What org members see:**
- Papers shared to an org are displayed using the **org snapshot** (`/orgs/{orgId}/sharedPapers/{paperId}`) — the paper details captured from the sharer's library entry at time of sharing, kept up to date via write fan-out
- Once an org member adds the paper to their own library (via "Proceed anyway"), they see their own library entry's version

**Access is evaluated at request time (no stale access):** a paper's visibility is always re-derived from the **current** share state on every request. The practical consequences when a paper is unshared (e.g., the sharer leaves or is kicked from an Org):
- A **stale search result** still showing the paper does not grant access — clicking through re-checks and denies if it is no longer shared to an Org the user belongs to
- An **already-open** paper detail page does not keep access alive — the next request re-evaluates and denies
- **Cached premium AI outputs** on the global paper are still gated by the same request-time access check

No active session-invalidation machinery is needed; correct denial falls out naturally from deriving visibility live on each request.

**UI implications:**
- Paper detail view shows: *"Private"* or *"Shared with: [Org A, Org B]"*
- Sharing is performed by selecting specific Orgs (not a generic "Make Public" toggle)
- A user can only share to Orgs they are currently a member of

---

### 4. PDF Reader

Reading a paper is a core Scolar feature. Papers are read in a **large modal reader** rendered directly with `pdfjs-dist` (the same library used at upload) — no third-party viewer dependency.

**Behavior:**
- Opened via a **"Read paper"** button on the paper detail page
- Renders **one page at a time**, scaled so the whole page fits within the modal at a readable size (no scrolling)
- Controls are intentionally minimal: **Previous page**, **Next page**, and **Close** (plus arrow-key navigation and a page indicator `X / N`)
- **No text selection / highlighting** — pages render to a canvas only (no text layer)
- **No download affordance** — there is no download button in the UI

> Download cannot be technically prevented (the bytes must reach the browser to render); "no download" means no UI affordance, not DRM.

**Serving (proxy, access-gated):**
- A route handler at `/api/papers/{paperId}/file` streams the PDF from Cloud Storage through the server (same-origin, no signed URLs or bucket CORS)
- Access is checked on **every request** using the same visibility logic as everywhere else (`checkVisibility`) — only papers the user can see (own library or an org they belong to) are served; otherwise `403`
- The handler honors HTTP **Range** requests (`206 Partial Content`) so `pdfjs-dist` loads pages efficiently, and streams bytes rather than buffering the whole file
- Bandwidth flows through the server; at launch scale this is negligible. If reading volume grows, the serving layer can be swapped to short-TTL signed URLs without touching the reader UI

**Caching (browser-private, revalidated):**

A paper's PDF bytes are **immutable** (the file for a `paperId` never changes — it is content-addressed by hash), so responses are cacheable in the user's own browser. Caching is configured to keep access enforcement intact:

- `Cache-Control: private, no-cache` — `private` means only the user's own browser may store it (never a shared/CDN cache, since the content is access-gated); `no-cache` means the browser **may store** the bytes but **must revalidate before every use**.
- Each response carries an `ETag` derived from the Cloud Storage object's `md5Hash` (stable, since the bytes never change).
- On revalidation (`If-None-Match`), the route runs the **`checkVisibility` access check first**:
  - Access lost → `403`, and the browser does **not** serve its cached copy (effectively revoked).
  - Still allowed → `304 Not Modified` with no body — the browser reuses its cached bytes with **no re-download**.

This gives near-instant reopen and minimal bandwidth (only headers travel on a cache hit) while access is re-checked on **every** request. Note: a server cannot force-evict an already-cached browser copy; revocation is enforced via the mandatory revalidation, not by pushing a purge.

> Org members can only reach the reader for papers already in their own library today — the detail page (and thus the reader entry point) is owner-only until paper sharing UI lands. The proxy's access check already supports org-shared reading for when that arrives.

---

### 5. Similarity Search (Idea/Proposal Verification)

- Free for all users
- Users input an idea or proposal as plain text
- The query is embedded using Gemini `gemini-embedding-2`
- Cosine similarity search is run against stored paper embeddings via Firestore Vector Search (`findNearest()`)
- Returns ranked list of matched papers with similarity scores
- **Zero AI generation cost per search** — purely a vector DB query after embedding the query

**Search scope (per user):** The searchable pool for User X consists of:
- All papers in User X's library (including private library entries) — **full access**
- All papers shared to any Org User X is currently a member of — **full access**
- All papers shared to any **public** Org (even ones User X has not joined) — **list access only** (metadata + score), consistent with the [public-Org list exception](#3-paper-visibility)

The public-Org portion of the pool is identified by the denormalized **`publicOrgIds`** flag on the global paper (see [Identifying the public-Org pool](#identifying-the-public-org-pool-denormalized-flag)) — `findNearest()` pre-filters on `publicOrgIds` being non-empty (unioned with the user's own library + member-Org papers) so the vector query never scans private papers.

Papers outside this scope — private library entries of other users, and papers shared only to **private** Orgs User X does not belong to — are **never** returned.

**Accessing a public-Org result:** a result from a public Org User X has not joined is returned as a **list entry only** — title, authors, year, synopsis, similarity score, and the source public Org. Opening the full view (PDF reader + premium AI) is denied by the request-time access check; the result's action is **"Join [Org] to read"**. Once User X joins, the same paper becomes a full-access result.

**Edge case — user has zero Orgs:** Search still runs against the user's library **plus all public-Org papers** (list access). No error or empty-state warning.

**Search result fields:**
- Paper details (title, authors, year, synopsis) — from the user's library entry if owned, otherwise from the org snapshot
- Similarity score
- **Source indicator** — which Org(s) the matched paper came from (or "your library" if it's the user's own)
- **Access indicator** — whether the result is full-access (owned / member Org) or list-only (public Org the user hasn't joined → "Join to read")

**Embedding input per paper:**
- `extractedMetadata.title + extractedMetadata.synopsis + extractedMetadata.keywords` — always based on Groq's raw output, never the user's modified version
- Model: `gemini-embedding-2` (via `@google/genai`), output truncated to 768 dims via `outputDimensionality`
- Storage: `embedding` field as `VectorValue(768)` in Firestore `/papers/{paperId}`
- Generated once on the global paper record — reused by all library entries that reference it

---

### 6. Premium AI Features (On-Demand, Gated)

- Available to **premium users only**
- Generated using **Gemini Pro** (higher quality for the paid, quality-sensitive outputs)
- Clearly labeled as **"AI"** in the UI
- Free users see a locked state with an upgrade CTA
- Generated **on-demand** when a premium user requests them
- Streamed **token-by-token** to the client (SSE or Next.js streaming responses)
- **Shared cache:** once generated for a global paper, the result is stored on that paper record and served instantly to all premium users who can access the paper — no re-generation needed
- Cache access is bounded by paper visibility

**Premium AI features:**

| Feature | Description |
|---------|-------------|
| Summary | Concise summary of the paper |
| Conclusions | The paper's conclusions |
| Key Findings | Notable findings from the paper |
| Methodology | The research methodology used |

---

### 7. Keyword Preference Profile

A per-user **keyword preference profile** records which topics a user cares about, derived entirely from the papers they add to their library. It powers personalized ranking on the **Discover** surface — both papers and Orgs — using **keyword overlap, no embeddings**, consistent with the existing Org suggestion approach.

**Storage:**
- A `keywordProfile` map on the user document `/users/{uid}`: `{ [keyword: string]: number }` — keyword → weight (occurrence count across the user's library).
- Keywords are **normalized** before keying: trimmed and lowercased, so `"Machine Learning"` and `"machine learning"` aggregate to one entry. The normalized form is the map key; display surfaces may still use the original casing from the paper.

**Maintenance (kept in lockstep with the library):**
- **On add** — when a library entry is created, increment the count for each keyword in the user's confirmed `keywords` by 1.
- **On delete** — when a library entry is removed (including the account-deletion cascade and the dedup/auto-cleanup paths), decrement the count for each of that entry's keywords by 1; drop any key whose count reaches 0.
- The profile is written in the **same atomic operation** as the library-entry create/delete so it can never drift from the library.
- The keyword source is the **user's confirmed** `keywords` on the library entry (what they actually saved) — not Groq's raw `extractedMetadata`. The profile reflects the user's own curation.

**Zero-paper users:** the profile is empty (`{}`). Discovery still works — surfaces fall back to non-personalized browse/recency (see [Paper Discovery](#8-paper-discovery)).

**Why materialized (not computed on read):** ranking reads the profile on every Discover load; re-aggregating it live from the whole library each time is wasteful. Maintaining a small map incrementally on write keeps Discover reads cheap and avoids per-request fan-out over the library.

---

### 8. Paper Discovery

The **Discover** surface recommends **papers** the user does not already have, alongside Orgs (see [Org Discovery](../org/org-discovery.md) for the Org half of the same surface).

**Source pool — papers in public Orgs:**
- A paper is eligible for discovery if it is **shared to at least one public Org**. This reuses the existing visibility model — there is **no separate "public paper" state**; papers remain private or Org-shared per [Paper Visibility](#3-paper-visibility).
- **Excluded:** papers already in the user's own library, and papers in Orgs the user is already a member of (neither is new to them).

**What a non-member may see (list access only):**
- Discovery exposes the shared-paper **snapshot metadata** — `title`, `authors`, `year`, `keywords`, `synopsis` — plus the **source public Org(s)**. This is the same **list access** a non-member gets when browsing the public Org's own page (see [Paper Visibility › Two access tiers](#3-paper-visibility)); Discover just ranks and surfaces it. Private-Org shares are never surfaced.
- **PDF content and premium AI stay member-only.** A non-member cannot open the reader or generate AI outputs for a discovered paper — the request-time access check still denies it. The card's primary action is **"Join [Org] to read"**, linking to the public Org.

**Ranking (keyword overlap, no embeddings):**
- Rank eligible papers by the overlap between the paper's `keywords` and the user's `keywordProfile` (see [Keyword Preference Profile](#7-keyword-preference-profile)): the higher the summed weight of matching keywords, the higher the paper ranks.
- **Zero-paper users:** empty profile → no personalized ranking; fall back to recency (most recently shared to a public Org first). No error or forced prompt.

**Card display:** title, authors, year, a synopsis snippet, source public-Org badge(s), and the "Join to read" CTA.

#### Identifying the public-Org pool (denormalized flag)

Both Paper Discovery (§8) and Similarity Search ([§5](#5-similarity-search-ideaproposal-verification)) need to ask *"is this paper shared to any public Org?"* efficiently — including as a **pre-filter on the vector query** (`findNearest()`). Re-deriving that live (scan every Org's `sharedPapers`, intersect with Org visibility) is too expensive per request, so it is **denormalized onto the global paper**:

- **`publicOrgIds: string[]`** on `/papers/{paperId}` — the set of **public** Orgs the paper is currently shared to. **Non-empty ⇒ in the public pool** (discoverable + searchable as list access). Empty ⇒ private to its owner and member Orgs only.
- This is the **only** "public" signal stored on a paper; it does not change the [derived-visibility model](#3-paper-visibility) (full access is still re-checked at request time). It is a query-acceleration index, not an access grant — a stale `publicOrgIds` never widens content access, only which papers appear in a list.

**Maintenance (kept in sync wherever public-share state changes):**
- **Share to public Org O** → add `O` to `publicOrgIds`.
- **Unshare from public Org O** (explicit, or auto-unshare on leave/kick, or entry delete) → remove `O` **only if no other library entry still shares this paper to O**.
- **Org O visibility toggles** → fan out across `O`'s `sharedPapers`: `private → public` adds `O` to each paper's `publicOrgIds`; `public → private` removes it. This is part of the Org visibility-toggle side-effects (see [Org Overview › Visibility](../org/org-overview.md#visibility)).

**Why a set of Org IDs (not a bare boolean):** removal on unshare/visibility-toggle must know whether *any other* public Org still keeps the paper in the pool; a counter or boolean would drift. The set is also reused to render the "Join to read" source-Org badges without a second lookup.

---

## Upload Flow (Step by Step)

```
CLIENT:
  1. User selects a PDF file
  2. pdfjs-dist extracts text from the PDF (first 5 pages used for detail extraction)
  3. Compute SHA-256 hash of the PDF file content
  4. Send extracted text + hash to server (PDF held client-side, not yet uploaded)

SERVER (init):
  5. Layer 1 dedup: check hash against /papers
       → if match:
           a. Check visibility — user's library first, then user's org memberships
           b. In-library  → return { status: 'in-library', paper, entryId }
           c. In-org      → return { status: 'in-org', paper, orgs, existingPaperId }
           d. Not visible → return { status: 'ok', draft: existingExtractedMetadata, existingPaperId }
       → if no match:
  6. Send first 5 pages of text to Groq (llama-3.3-70b-versatile) → receive structured JSON draft
       → single attempt; if Groq fails, return whatever partial draft exists (fields may be empty)
  7. Return { status: 'ok', draft, existingPaperId: null }

CLIENT (paper details review — shown on any 'ok' response):
  8. Store draft as extractedMeta in state (never modified — sent back at commit for embedding)
  9. Render paper details form: all fields read-only, pre-filled from draft
       → empty fields are immediately editable with helper text
  10. User unlocks fields via pencil icon as needed, completes all 5 required fields
  11. If any field with an extracted value was modified → show blocking confirmation dialog
  12. User confirms → proceed to commit

SERVER (commit — receives: extractedMeta, user's confirmed fields, existingPaperId, pdf):
  13. If existingPaperId provided (Layer 1 silent hit or "Proceed anyway" from in-org):
        → skip PDF upload, embedding generation, global paper creation
        → ensureLibraryEntry(uid, existingPaperId) — create if not exists
        → return { status: 'ok', entryId, paperId }
  14. Layer 2 dedup: generate embedding from extractedMeta (title + synopsis + keywords)
        → findNearest() against /papers embeddings, cosine similarity ≥ 0.92
        → if match:
            a. Check visibility — user's library first, then user's org memberships
            b. In-library  → return { status: 'in-library', paper, entryId }
            c. In-org      → return { status: 'in-org', paper, orgs, existingPaperId }
            d. Not visible → ensureLibraryEntry(uid, existingPaperId) → return { status: 'ok' }
        → if no match: genuinely new paper — continue
  15. Store PDF in Firebase Cloud Storage
  16. Create document in /papers/{paperId}:
        { hash, extractedMetadata: { title, authors, year, keywords, synopsis },
          embedding: VectorValue(768), storagePath, publicOrgIds: [], createdAt }
        → publicOrgIds starts empty; it is populated when the paper is shared to a public Org (§8)
  17. Create library entry in /users/{userId}/library/{entryId}:
        { paperId, title, authors, year, keywords, synopsis (user's confirmed copy),
          userId, shares: [], createdAt }
        → in the same write, increment /users/{userId}.keywordProfile for each confirmed keyword (§7)
  18. Return { status: 'ok', entryId, paperId }
```

**Key principles:**
- Any path that creates a library entry — including the dedup `ensureLibraryEntry` shortcuts (steps 13, 14d) — increments the user's `keywordProfile` in the same write; any path that deletes one decrements it (§7)
- The PDF is **never stored in Firebase Cloud Storage until the user confirms paper details** — eliminates orphaned PDFs by design
- The global paper stores Groq's raw extracted output only — never the user's modified version
- The library entry is the source of truth for all user-facing paper display
- The embedding is generated at commit time (after user confirms) from `extractedMeta` — no wasted embedding calls if the user cancels

---

## Paper Deletion + Global Paper Lifecycle

A global paper is **shared backend infrastructure**: many users' library entries may reference the same `paperId` (via deduplication). Therefore a global paper must **only** be deleted once the **last** library entry referencing it is gone — never when a single user deletes their own copy while others still reference it.

A global paper is **orphaned** (useless) when **no library entry anywhere references its `paperId`**. Because org shares are derived from a library entry's `shares[]`, library entries are the single source of truth for whether a global paper is still needed.

### Deletion flow (lazy garbage collection)

When a user deletes a library entry, the server performs cleanup in one atomic operation, then a conditional follow-up:

```
SERVER (delete — receives: entryId):
  1. Read the library entry → { paperId, shares }
  2. Atomic batch:
       a. Delete the library entry  /users/{uid}/library/{entryId}
       b. For each orgId in shares[]: delete  /orgs/{orgId}/sharedPapers/{paperId}   (unshare)
            → if that orgId is public and no other library entry still shares this paper to it,
              remove orgId from /papers/{paperId}.publicOrgIds (§8)
       c. Decrement /users/{uid}.keywordProfile for each of the entry's keywords; drop keys at 0 (§7)
  3. Orphan check: collectionGroup('library').where('paperId', '==', paperId).limit(1)
       → if NOT empty: another user still references the paper — stop (leave global paper intact)
       → if empty: the global paper is now orphaned →
           a. Delete the PDF in Cloud Storage at the global paper's storagePath
           b. Delete the global paper document  /papers/{paperId}
  4. Return { status: 'ok' }
```

**Why these steps:**
- **Unshare on delete** — deleting an entry that was shared to orgs must remove the org snapshots, or org members would keep seeing a paper whose owner deleted it.
- **Orphan check before deleting the global paper** — guarantees a paper still in use by another user is never destroyed. The `collectionGroup('library')` query requires a `paperId` ASC collection-group index.
- **No reference counter** — a stored counter drifts whenever a cleanup path is bypassed (e.g. account-deletion cascade, partial failure), and drift risks deleting a paper others still use. Querying the source of truth directly is simpler and safe at current scale.

### Account deletion cascade

When a user account is deleted, all of their library entries are removed as part of the cascade (see [User](../user/user.md)). Each removed entry should run the same unshare + orphan-check cleanup so global papers and org snapshots do not leak.

### Scheduled sweep (safety net)

Lazy GC handles the common path, but cleanup can still be skipped — bulk account deletion, partially failed writes, or future code paths that bypass the delete route. A **periodic background job** is the backstop:

- Scan `/papers`; for each global paper run the orphan check (`collectionGroup('library')` by `paperId`)
- Delete any global paper with zero referencing library entries, along with its Cloud Storage PDF
- This is a *backstop*, not the primary mechanism — orphans should normally be cleaned up immediately on delete

---

## On-Demand Premium AI Flow (Step by Step)

```
  1. Premium user clicks a feature (e.g., "Generate Summary") on a paper they can access
  2. Verify the user can access the paper → if not, return 403
  3. Check shared cache on the global paper record → if exists, stream cached result immediately
  4. If not cached: verify user is premium → if not, return 403
  5. Call Gemini → stream response token-by-token to client
  6. Save generated output to the global paper record's cache field
  7. Done — future requests for the same paper serve from cache
```

---

## AI Cost Strategy

| Task | Model | Cost Level | When |
|------|-------|------------|------|
| Paper details extraction | Groq llama-3.3-70b-versatile | Very low | Once per unique paper (Layer 1 miss only); single attempt, no retries |
| Embedding generation | gemini-embedding-2 (768 dims) | Negligible | At commit time only (after user confirms); used for Layer 2 dedup check and stored on global paper |
| Query embedding (search) | gemini-embedding-2 (768 dims) | Negligible | Per similarity search query |
| Premium AI features | Gemini Pro | Moderate | On-demand, cached after first generation |

**Key cost-saving rules:**
- Two-layer deduplication: same paper never stored or processed twice
- Groq extraction: single attempt only — no retries to avoid rate limit cascades
- Embedding generated at commit time only — no wasted calls if user cancels during review
- Embedding generated once per global paper, reused by all library entries that reference it
- Premium AI outputs cached and shared across all premium users with access
- Heavy generation only triggered by explicit premium user action

---

## Open Items

- None outstanding.
