# Scolar — Paper

> Domain: `paper/`. Related domains: `user/`, `org/`.
> Part of: [Scolar Specifications](../scolar-specs.md)
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

### 4. Similarity Search (Idea/Proposal Verification)

- Free for all users
- Users input an idea or proposal as plain text
- The query is embedded using Gemini `gemini-embedding-2`
- Cosine similarity search is run against stored paper embeddings via Firestore Vector Search (`findNearest()`)
- Returns ranked list of matched papers with similarity scores
- **Zero AI generation cost per search** — purely a vector DB query after embedding the query

**Search scope (per user):** The searchable pool for User X consists of:
- All papers in User X's library (including private library entries)
- All papers shared to any Org User X is currently a member of

Papers outside this scope are **never** returned in their search results.

**Edge case — user has zero Orgs:** Search runs against the user's library only. No error or empty-state warning.

**Search result fields:**
- Paper details (title, authors, year, synopsis) — from the user's library entry if owned, from the org snapshot if not
- Similarity score
- **Source indicator** — which Org(s) the matched paper came from (or "your library" if it's the user's own)

**Embedding input per paper:**
- `extractedMetadata.title + extractedMetadata.synopsis + extractedMetadata.keywords` — always based on Groq's raw output, never the user's modified version
- Model: `gemini-embedding-2` (via `@google/genai`), output truncated to 768 dims via `outputDimensionality`
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
          embedding: VectorValue(768), storagePath, createdAt }
  17. Create library entry in /users/{userId}/library/{entryId}:
        { paperId, title, authors, year, keywords, synopsis (user's confirmed copy),
          userId, shares: [], createdAt }
  18. Return { status: 'ok', entryId, paperId }
```

**Key principles:**
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
