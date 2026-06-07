# Scolar — Paper

> Domain: `paper/`. Related domains: `user/`, `org/`.
> Part of: [Scolar Specifications](../scolar-specs.md)
> See also: [User](../user/user.md) | [Org Papers & Permissions](../org/org-papers-permissions.md)

---

## Data Ownership Model

Scolar uses a **shared-data, per-user-reference** model for papers.

- **Papers (global):** each unique paper exists exactly once in the system. The paper record holds the PDF, extracted metadata, embedding vector, and any cached premium AI outputs. This data is **deduplicated** — no paper is ever stored or processed twice.
- **Library entries (per-user):** each user has their own library entries, where each entry is a reference to a global paper. A user's library, shares, and visibility settings are tied to their library entries, not to the underlying global paper.

This is similar to how a public library works: there is one copy of each book, but many readers can have it on their reading list independently.

---

## Core Features

### 1. Paper Upload + Metadata Extraction

- PDF files only
- Text extraction is done **client-side** using `pdfjs-dist` before upload
- A SHA-256 hash of the file is computed client-side before upload
- Deduplication is checked at two layers (see Deduplication Strategy below)
- If a duplicate is detected at either layer, no new paper record is created — a new **library entry** is created for the uploading user, referencing the existing global paper
- Metadata extraction is handled by **Gemini Flash** using structured JSON output (JSON mode)
- Metadata is extracted from the **first 5 pages** of extracted text only
- This process is **not labeled as "AI"** in the UI — it appears as automatic paper detail extraction

**Metadata is always a draft until the user saves:**
- Gemini's output (whether full, partial, or empty) is treated as a **draft**, never as final data
- The user is always shown a metadata review form pre-filled with whatever Gemini extracted
- The metadata becomes final only when the **user reviews and saves** it

**Extraction retry & fallback:**
- The Gemini call is **retried up to 3 times** on failure
- A **rate-limit error (429)** is treated the same as any other failure and counts as one of the 3 attempts (no separate rate-limit handling — see AI Cost Strategy)
- If all 3 attempts fail, the user is shown the **manual input form** pre-filled with any partial draft Gemini managed to return (may be empty)

**All 5 metadata fields are required:**
- `title`, `authors`, `year`, `keywords`, and `synopsis` must all be present before a paper can be saved
- This applies whether the metadata came from Gemini or manual input — Scolar treats complete metadata as essential for search quality and data integrity
- A paper record is never created with missing fields

**Extracted metadata fields:**

| Field | Notes |
|-------|-------|
| `title` | Paper title |
| `authors` | List of authors |
| `year` | Year published or finished |
| `keywords` | Tags or keywords |
| `synopsis` | The summarizing section of the paper, regardless of what it is called (Abstract, Rationale, Executive Summary, Summary, etc.) |

**Gemini prompt strategy for synopsis:**
> Extract the section that summarizes the paper's purpose, methodology, and findings. This section may be titled Abstract, Summary, Executive Summary, Rationale, Overview, or similar — identify it by its role, not its heading.

---

### 2. Deduplication Strategy

Two layers of deduplication are applied in order during upload:

**Layer 1 — File hash (instant, pre-processing):**
- Compute SHA-256 of the uploaded PDF (client-side)
- If a paper with the same hash already exists → duplicate detected, skip all processing
- Catches byte-for-byte identical uploads

**Layer 2 — Metadata match (after metadata is confirmed by the user):**
- Once metadata is finalized (Gemini draft reviewed and saved, or manually entered), check the DB for a paper with a normalized match on:
  - **Title** — normalized: trimmed, internal whitespace collapsed, **case-insensitive**, punctuation stripped
  - **AND first author** — normalized: trimmed, whitespace collapsed, case-insensitive
  - **AND year** — exact
- If a match is found → duplicate detected, link the uploader to the existing global paper (no PDF was stored yet, so nothing to discard)
- Catches "same paper, different file" cases (e.g., different PDF sources, re-exports, etc.)
- Stronger normalization is intentional: because metadata can now be **manually entered** (on Gemini failure), small typing variations (case, spacing, punctuation) must not slip past dedup and create a duplicate global record. The **one-unique-global-record** rule must hold regardless of metadata source.

**On any dedup hit:**
- No new global paper record is created
- A new library entry is created for the uploading user, pointing to the existing global paper
- The user sees a notification: *"This paper already exists in Scolar — it has been added to your library anyway."*
- No confirmation step is required — the dedup is silent and automatic

---

### 3. Paper Visibility

A paper's visibility is **derived from its share state**, not stored as an explicit column.

- **Private:** a library entry with zero Org shares → only the owner of the library entry can see it
- **Shared:** a library entry with one or more Org shares → visible to the owner + all members of the Orgs it is shared to

There is no global/public visibility for papers. Sharing is always scoped to specific Orgs.

**Access is evaluated at request time (no stale access):** a paper's visibility is always re-derived from the **current** share state on every request — opening a paper, fetching its premium AI output, etc. Access is never cached or trusted from a prior state. The practical consequences when a paper is unshared (e.g., the sharer leaves or is kicked from an Org):
- A **stale search result** still showing the paper does not grant access — clicking through re-checks and denies if it is no longer shared to an Org the user belongs to
- An **already-open** paper detail page does not keep access alive — the next request (any action or refresh) re-evaluates and denies
- **Cached premium AI outputs** on the global paper are still gated by the same request-time access check — losing access to the paper means losing access to its cached AI outputs, even though the cache itself persists on the global record for other eligible users

No active session-invalidation machinery is needed; correct denial falls out naturally from deriving visibility live on each request.

**UI implications:**
- Paper detail view shows: *"Private"* or *"Shared with: [Org A, Org B]"*
- Sharing is performed by selecting specific Orgs (not a generic "Make Public" toggle)
- A user can only share to Orgs they are currently a member of

---

### 4. Similarity Search (Idea/Proposal Verification)

- Free for all users
- Users input an idea or proposal as plain text
- The query is embedded using Gemini `gemini-embedding-001`
- Cosine similarity search is run against stored paper embeddings via Firestore Vector Search (`findNearest()`)
- Returns ranked list of matched papers with similarity scores
- **Zero AI generation cost per search** — purely a vector DB query after embedding the query

**Search scope (per user):** The searchable pool for User X consists of:
- All papers in User X's library (including private library entries)
- All papers shared to any Org User X is currently a member of

Papers outside this scope are **never** returned in their search results.

**Edge case — user has zero Orgs:** Search runs against the user's library only. No error or empty-state warning.

**Search result fields:**
- Paper metadata (title, authors, year, synopsis)
- Similarity score
- **Source indicator** — which Org(s) the matched paper came from (or "your library" if it's the user's own)

**Embedding input per paper (generated once at upload):**
- Title + Synopsis + Keywords
- Model: `gemini-embedding-001`
- Storage: `embedding` field as `VectorValue(768)` in Firestore `/papers/{paperId}`
- Generated once on the global paper record — reused by all library entries that reference it

---

### 5. Premium AI Features (On-Demand, Gated)

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

## Upload Flow (Step by Step)

```
CLIENT:
  1. User selects a PDF file
  2. pdfjs-dist extracts text from the full PDF (first 5 pages for metadata)
  3. Compute SHA-256 hash of the PDF file
  4. Send extracted text + hash to server (PDF held client-side for now, not yet uploaded)

SERVER:
  5. Layer 1 dedup: check hash against the `/papers` Firestore collection
       → if match, create library entry for user pointing to existing paper, notify user, stop
  6. Send first 5 pages of extracted text to Gemini Flash → receive structured JSON draft
     (title, authors, year, keywords, synopsis)
       → retry up to 3 times on failure or rate limit (429)
       → if all 3 attempts fail, return whatever partial draft exists (may be empty)

CLIENT (metadata review — always shown):
  7. User is presented a metadata review form, pre-filled with Gemini's draft
     (full, partial, or empty depending on extraction outcome)
  8. User completes/corrects all 5 required fields and saves
       → metadata is only final once the user saves

SERVER (commit):
  9. Layer 2 dedup: query the `/papers` Firestore collection for a document with matching titleNorm + firstAuthorNorm + year
       → if match, create library entry pointing to existing paper, notify user, stop
         (no PDF was ever stored, so nothing to clean up)
  10. Store PDF in Firebase Cloud Storage
  11. Concatenate title + synopsis + keywords → send to gemini-embedding-001 → receive vector (768 dims)
  12. Create document in Firestore `/papers/{paperId}` (metadata + VectorValue(768) embedding)
  13. Create library entry document in `/users/{userId}/library/{entryId}`, pointing to the new paper
  14. Return library entry (with paper data) to client
```

**Key principle:** the PDF is **never stored in Firebase Cloud Storage until valid metadata is confirmed by the user**. This eliminates orphaned PDFs by design — there is no point in the flow where a file is stored without a committed Firestore document following it.

---

## On-Demand Premium AI Flow (Step by Step)

```
  1. Premium user clicks a feature (e.g., "Generate Summary") on a paper they can access
  2. Verify the user can access the paper → if not, return 403
  3. Check shared cache on the global paper record → if exists, stream cached result immediately
  4. If not cached: verify user is premium → if not, return 403
  5. Call Gemini → stream response token-by-token to client
  6. Save generated output to the global paper record's cache column
  7. Done — future requests for the same paper serve from cache
```

---

## AI Cost Strategy

| Task | Model | Cost Level | When |
|------|-------|------------|------|
| Metadata extraction | Gemini Flash | Very low | Once per unique paper (upload, only on Layer 1 miss); retried up to 3x, manual input fallback |
| Embedding generation | gemini-embedding-001 | Negligible | Once per unique paper (upload, only on Layer 2 miss) |
| Query embedding (search) | gemini-embedding-001 | Negligible | Per search query |
| Premium AI features | Gemini Pro | Moderate | On-demand, cached after first generation |

**Rate-limit handling:** No dedicated rate-limit infrastructure at launch. If Gemini returns a rate-limit error (429), it is treated as a normal failure and counts toward the 3-retry budget. If retries are exhausted, the user falls back to manual metadata input. This reuses the existing failure path rather than adding queue/throttle infrastructure.

**Key cost-saving rules:**
- Two-layer deduplication: same paper never processed twice
- Embeddings generated once per global paper, reused forever
- Premium AI outputs cached and shared across all premium users with access
- Heavy generation only triggered by explicit premium user action
- Metadata prompt uses only first 5 pages

---

## Open Items

- None outstanding.
