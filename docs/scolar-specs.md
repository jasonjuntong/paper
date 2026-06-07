# Scolar — Specifications

> Consolidated from: `user.md`, `paper.md`, `org-overview.md`, `org-membership.md`, `org-joining.md`, `org-discovery.md`, `org-papers.md`.

---

## Table of Contents

1. [User](#1-user)
2. [Paper](#2-paper)
3. [Org: Overview & Profile](#3-org-overview--profile)
4. [Org: Membership, Roles & Deletion](#4-org-membership-roles--deletion)
5. [Org: Joining, Requests & Invites](#5-org-joining-requests--invites)
6. [Org: Discovery](#6-org-discovery)
7. [Org: Papers, Notifications & Permissions](#7-org-papers-notifications--permissions)
8. [To Be Determined](#to-be-determined)

---

## 1. User

> Domain: `user/`. Related domains: `org/`, `paper/`.

### Authentication

Handled by **Firebase Authentication**. The only supported method is **email + password**.

**Registration collects:**
- **Name** — display name; how Scolar addresses and identifies the user across the app
- **Email**
- **Password**

**Email verification:**
- Required before access — unverified users cannot use the app
- A verification email is sent upon registration; the user must confirm it to proceed

**Duplicate email at registration:**
- Registering with an email that already belongs to an existing account **always shows the same "Check your email" success state** as a genuine new registration — no error is ever surfaced to the person filling out the form
- This is intentional: revealing whether an email is registered would enable user enumeration attacks
- Uniqueness is enforced by Firebase Authentication — no duplicate account is ever created
- The server Route Handler catches the `auth/email-already-in-use` error from Firebase and returns the same success response as a genuine registration, intentionally suppressing the error

**Login:**
- Email + password only

**Forgot password flow:**

Scolar uses a fully custom password reset experience — no Firebase-hosted pages involved.

1. User clicks "Forgot password?" on the login screen → taken to `/forgot-password`
2. User submits their email address
3. Server Route Handler (`POST /api/auth/forgot-password`):
   - Calls `admin.auth().generatePasswordResetLink(email, { url: APP_URL/login })` to obtain a Firebase-signed `oobCode`
   - Silently catches `auth/user-not-found` — **never reveals whether an email is registered** (same enumeration protection as registration)
   - Extracts the `oobCode` from the generated link and builds a Scolar-hosted reset URL: `APP_URL/reset-password?code={oobCode}`
   - Sends a branded transactional email via **Resend** containing a single CTA button linking to that URL
4. The UI always shows the same "Check your email" success state regardless of outcome
5. User clicks the link in the email → lands on `/reset-password?code={oobCode}` (on Scolar's own domain)
6. User enters a new password (minimum 8 characters) and confirms it
7. Client calls `confirmPasswordReset(auth, oobCode, newPassword)` — Firebase validates the code and updates the password
8. On success → redirect to `/login`
9. On error (expired or invalid code) → show a clear error message with a link back to `/forgot-password` to request a new email

**oobCode expiry:** Firebase's default is **24 hours**. An expired code triggers the error state in step 9.

**Not supported:**
- Google OAuth or any other OAuth provider
- Magic links

### Users (App-Wide)

- **No global roles** — all users are equal at the app level
- A user's role/permissions only exist *within an Org* (see Org specs below)
- **User profile data:**
  - Name (display name, set at registration)
  - Email
  - No avatar
- **Premium status** is tracked separately — handled in the Premium Account, Plans & Billing chunk

### Account Deletion

When a user deletes their Scolar account:
- They are **removed from all Orgs** they are a member of
- All papers they shared to those Orgs are **automatically unshared** (same as voluntarily leaving each Org)
- Their **library entries are removed**; the underlying global paper data is unaffected (it remains for other users who reference it)
- **If they are the Admin of any Org**, that Org is deleted (enters Ghost Mode) — see Section 4. The user is warned before deletion proceeds (e.g., *"This will delete X Orgs with Y members."*) and may transfer Admin first to preserve an Org.
- **All pending items tied to the user are cascaded (invalidated)** — anywhere in the system. This includes: invites sent to them, join requests they submitted, transfer offers they sent or received, and any "request to be Admin" they made. Deleting an account leaves no dangling pending state referencing that user.

---

## 2. Paper

> Domain: `paper/`. Related domains: `user/`, `org/`.

### Data Ownership Model

Scolar uses a **shared-data, per-user-reference** model for papers.

- **Papers (global):** each unique paper exists exactly once in the system. The paper record holds the PDF, extracted metadata, embedding vector, and any cached premium AI outputs. This data is **deduplicated** — no paper is ever stored or processed twice.
- **Library entries (per-user):** each user has their own library entries, where each entry is a reference to a global paper. A user's library, shares, and visibility settings are tied to their library entries, not to the underlying global paper.

This is similar to how a public library works: there is one copy of each book, but many readers can have it on their reading list independently.

### Core Features

#### 1. Paper Upload + Metadata Extraction

- PDF files only
- Text extraction is done **client-side** using `pdfjs-dist` before upload
- A SHA-256 hash of the file is computed client-side before upload
- Deduplication is checked at two layers (see Deduplication Strategy below)
- If a duplicate is detected at either layer, no new paper record is created — a new **library entry** is created for the uploading user, referencing the existing global paper
- Metadata extraction is handled by **Gemini Flash** using structured JSON output (JSON mode)
- Metadata is extracted from the **first 1-2 pages** of extracted text only
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

#### 2. Deduplication Strategy

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

#### 3. Paper Visibility

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

#### 4. Similarity Search (Idea/Proposal Verification)

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

#### 5. Premium AI Features (On-Demand, Gated)

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

### Upload Flow (Step by Step)

```
CLIENT:
  1. User selects a PDF file
  2. pdfjs-dist extracts text from the full PDF (first 1-2 pages for metadata)
  3. Compute SHA-256 hash of the PDF file
  4. Send extracted text + hash to server (PDF held client-side for now, not yet uploaded)

SERVER:
  5. Layer 1 dedup: check hash against the `/papers` Firestore collection
       → if match, create library entry for user pointing to existing paper, notify user, stop
  6. Send first 1-2 pages of extracted text to Gemini Flash → receive structured JSON draft
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

### On-Demand Premium AI Flow (Step by Step)

```
  1. Premium user clicks a feature (e.g., "Generate Summary") on a paper they can access
  2. Verify the user can access the paper → if not, return 403
  3. Check shared cache on the global paper record → if exists, stream cached result immediately
  4. If not cached: verify user is premium → if not, return 403
  5. Call Gemini → stream response token-by-token to client
  6. Save generated output to the global paper record's cache column
  7. Done — future requests for the same paper serve from cache
```

### AI Cost Strategy

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

### Open Items

- None outstanding. (User tier system & subscription schema moved to the To Be Determined section. All other prior items resolved: Flash for metadata extraction / Pro for premium AI; 3-retry then manual-input fallback; rate-limit errors reuse the retry path; orphaned PDFs eliminated by design.)

---

## 3. Org: Overview & Profile

> Domain: `org/`.

### Overview

Orgs are the user-grouping primitive in Scolar — conceptually similar to a group chat in messaging apps. They are **not** institutions, workspaces, or organizations in the corporate sense — just named groups of users who can share papers with each other.

**Key principles:**
- Any user can create an Org
- A user can belong to multiple Orgs
- Each Org has exactly one Admin at a time
- Papers are shared *to* Orgs but never *owned* by them

### Org Profile

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | |
| `description` | Optional | |
| `visibility` | Yes | `public` or `private` |
| `join_policy` | Yes | Depends on visibility (see Section 5) |

### Visibility

- **Public:** Org appears in a public, discoverable list. Searchable by name/keyword. Eligible for suggestions.
- **Private:** Org is hidden from public listings. Users only know it exists via direct invite.
- The Admin can **toggle visibility at any time**.

**Visibility toggle — join policy transitions:** because join policy options depend on visibility, toggling visibility adjusts the join policy automatically:
- **Private → Public:** join policy switches to **request** (the safe default); the Admin can change it to **open** later. **Pending invites remain valid** and can still be accepted.
- **Public → Private:** join policy switches to **invite-only** (the only valid private policy). **Pending join requests remain valid** — they carry over and the Admin can still approve them.

**Default visibility:** a newly created Org is **public by default**. The Admin can switch it to private at any time afterward.

**Setting private with no other members:** this is **allowed**, but the Admin is shown an informational warning about the implications — e.g., *"A private Org is not discoverable. You can only add members via invite, and you can only invite users who share another Org with you. With no shared connections, you may not be able to grow this Org."* The action is permitted (a common valid use case is staging a library privately before flipping the Org public for others to join); the warning simply ensures the Admin is aware of the invite limitation. The cold-start case (an empty private Org that cannot grow) is accepted by design.

### Creation

- **Any authenticated user can create an Org**
- The creator is automatically assigned as the Org's Admin
- A newly created Org defaults to **public** visibility with a **request** join policy (users must request to join and the Admin approves each one). The Admin can change visibility and join policy at any time after creation.

---

## 4. Org: Membership, Roles & Deletion

> Domain: `org/`.

### Membership

- A user can be a member of **multiple Orgs**
- An Org can have multiple members
- **Member cap:** a flat **1000 members** per Org, regardless of the Admin's account tier
- Premium benefits apply solely to the paper tools — they do **not** affect Org member limits

**Cap calculation (all pending paths count as possible members):**
- The effective count is always **current members + pending invites + pending join requests**, and it can never exceed **1000**. This projection is calculated before any invite or join request is created.
- **Priority order at the cap:** actual members rank highest, then **pending invites** (the Admin's intentional choice to add someone), then **pending join requests** (lowest priority — they can be reconciled away to free slots).
- **Nothing is ever silently auto-declined.** Every decline is an explicit Admin action.

**Enforcement at creation time:**
- **Join requests** — when the effective count reaches **1000**, the join request action is **disabled**; no new requests can be submitted (there is no room to honor them). Existing pending join requests simply wait (frozen) until the Admin reconciles them or a slot frees up.
- **Invites** — the Admin cannot create invites that would push the effective count past 1000. If pending join requests are occupying the slots the Admin wants for invites, the Admin is shown a **reconciliation prompt** (see below) rather than being silently blocked or having requests auto-declined.

**Reconciliation prompt (invite creation blocked by pending join requests):**
- **Trigger:** the Admin tries to create invites that *would* exceed available slots specifically because pending join requests + members + existing pending invites leave no room.
- The prompt offers exactly **two actions**:
  1. **Address the pending join requests first** — go handle them individually (accept or decline) before inviting
  2. **Decline N pending join requests to make room** — the Admin **chooses which specific requests** to decline, freeing those slots for the intended invites
- Declined requesters are **notified** (standard decline notification). There is **no cooldown** on join requests — a declined user may submit a new join request as soon as the join action is available again (i.e., when a slot frees up)
- A slot freed this way can then be used to create the invite(s)

### Roles within an Org

| Role | Notes |
|------|-------|
| `Admin` | Exactly **one per Org** at any time |
| `Member` | All other users in the Org |

### Admin Transfer

The Admin role can be handed to another member, but it is **acceptance-based** — being made Admin is never forced on someone.

**How a transfer works:**
- The Admin sends a **transfer offer** to one or more members (the Admin cannot target themselves — they are excluded from the candidate list)
- Each targeted member is **notified** and can **accept or decline**
- **While offers are pending, the original Admin remains Admin**
- **First to accept wins:** the moment one member accepts, the roles **swap** (that member becomes Admin, the original becomes a Member), and **all other pending offers are automatically invalidated** (there is only ever one Admin)
- If a member **declines**, the Admin is **notified**
- The Admin can **cancel** any pending offer before it is accepted
- Transfer offers **expire after 7 days** (aligned with invite expiry and the ghost period), or sooner if a new Admin is assigned via another offer being accepted

There is never more than one Admin per Org at any point in this process.

**Plain transfer vs. Step Down (same mechanism, different intent and outcome):** a plain Admin Transfer and a Step Down both use 7-day transfer offers, but they are distinct actions:
- A **plain transfer** is the Admin optionally handing off the role while **intending to remain in the Org** as a member. If all offers **expire with no acceptance, nothing happens** — the Admin simply stays Admin and the Org continues normally. There is no negative consequence.
- A **Step Down** (below) is the Admin **intending to leave** the Org. If its window **expires with no successful handoff, the Org is deleted** (Ghost Mode).

A plain transfer is never automatically treated as a Step Down — the Admin chooses which action they are taking.

### Leaving an Org

- A Member can **leave an Org at any time** (voluntary)
- The Admin can **kick a Member** from the Org
- **Exception:** if the Admin is the **sole member**, they can leave directly, which **auto-deletes the Org** (enters Ghost Mode — with no other members, the ghost period is effectively moot)
- The Admin **cannot leave directly while other members exist** — they must hand off the role. Because transfer is acceptance-based (and could be declined or ignored), an Admin who wants out initiates **Step Down** (below) rather than being trapped.

### Step Down (Admin-initiated departure)

Step Down guarantees an Admin is never permanently trapped in the role, while giving members a fair window to take over.

**Initiating Step Down:**
- An Admin who wants to leave an Org that has other members initiates **Step Down**
- They are prompted to send a transfer offer to **everyone (default)** or to **specific member(s)**
- **All members are notified and warned** that the Admin is stepping down — making clear that if no one takes over within **7 days**, the Org will be **deleted** (enters Ghost Mode)

**During the Step Down window (7 days):**
- The Org operates **normally** — the Admin is still active and all features work
- Two paths can lead to a successful handoff:
  1. A member **accepts a transfer offer** (standard transfer — first to accept wins)
  2. A member **requests to become Admin** (see below)

**"Request to be Admin" (only available during Step Down):**
- While an Org is in the Step Down state, any member can **request to become Admin**
- This feature exists **only** during Step Down — it is unavailable at all other times
- Matching logic:
  - If the requesting member **already has a pending transfer offer** from the Admin → the request is **auto-granted** (both sides want it) → that member becomes Admin immediately
  - If the requesting member has **no** transfer offer → the **Admin can accept or decline** the request
- The member is **notified** whether their request is accepted or declined, and may request **only once** per Step Down window
- **First successful handoff wins:** the moment any member becomes Admin (via accepted offer, auto-grant, or Admin-granted request), Step Down completes — the original Admin becomes a Member, and all other pending offers and requests are invalidated

**If the window expires with no successful handoff (7 days):**
- Whether offers went unaccepted, or member requests were never granted by the Admin, the result is the same
- The Org is **deleted and enters Ghost Mode**; all members are **notified and warned**
- **Core rule:** Step Down resolves successfully **only when someone actually becomes Admin**. Any other state at expiry → the Org is deleted.

### Deleting an Org

Deletion is an **intentional, permanent process**. Only the Admin can delete the Org. The Admin is shown a clear warning (e.g., *"This will delete this Org with Y members and unshare Z papers"*) before deletion proceeds. **If there are pending Admin transfer offers**, the warning also reminds the Admin — e.g., *"You have N pending Admin transfer offer(s). Deleting now will cancel them. If you'd like this Org to survive, consider transferring Admin instead."* — giving them a clear off-ramp.

**On deletion (the moment the Admin confirms):**
- All members' papers are **immediately auto-unshared** from the Org
- All members are **notified** that the Org has been deleted
- The Org enters **Ghost Mode**
- **All inbound and outbound processes are immediately sealed** — pending invites, pending join requests, and pending Admin transfer offers/requests are all **invalidated**. Nothing flows in or out of a deleted Org.

**During Ghost Mode (7 days):**
- The Org record still exists, but **all features are disabled** — no viewing the Org library, no sharing, no inviting, no joining, no activity of any kind
- The Org detail/homepage displays a prominent message: *"This Org has been deleted X [minutes/days] ago by the admin."*
- The ghost Org **still appears in each member's Org list, greyed out**

**After 7 days (ghost period ends):**
- The Org is **no longer discoverable by any user**
- It is removed from all listings, search, and members' Org lists

> **No restore:** once the Admin confirms deletion, it is final. There is no undo, even during Ghost Mode. Ghost Mode exists only to soften the experience for members, not to provide a recovery window.

### Admin Account Deletion

- If the Admin **deletes their Scolar account**, all Orgs they administer are **deleted** (entering Ghost Mode)
- Before account deletion proceeds, the Admin is **warned** (e.g., *"This will delete X Orgs with Y members."*) and may transfer Admin first to preserve an Org

### Open Items

- None outstanding. (The 7-day windows are intentionally aligned across invite expiry, ghost period, transfer offers, and Step Down.)

---

## 5. Org: Joining, Requests & Invites

> Domain: `org/`.

### Joining an Org

Join policy depends on the Org's visibility:

**Public Orgs** — Admin chooses one of:
- **Open:** any user can join freely (no approval needed)
- **Request:** any user can request to join; Admin must approve or reject each request

**Private Orgs:**
- **Invite-only:** Admin sends invites to specific users. The Org does not appear in any public list.

### Join Requests (public Orgs with `request` policy)

- Any user can submit a join request from the public Org's page
- Admin sees pending requests and explicitly **approves or rejects** each one
- The requesting user is **notified** of the result (approval or rejection)
- If a public Org switches to private while requests are pending, the pending requests **carry over** and the Admin can still approve them
- **At the member cap:** when the effective count (members + pending invites + pending join requests) reaches 1000, the join request action is **disabled** — no new requests can be submitted. Existing pending requests wait (frozen) until the Admin reconciles them or a slot frees up. Nothing is auto-declined. See Section 4 (Cap calculation).

**Collision with a pending invite (no two paths at once):** the system never allows a user to have both a pending join request and a pending invite for the same Org simultaneously.
- If a user tries to submit a join request to an Org where they already have a **pending invite**, they are **prompted to accept the existing invite instead**. If they dismiss the prompt, the join request is simply **not created** — the pending invite is left untouched (still pending, to handle later).
- The reverse case (Admin inviting a user who already has a pending join request) is handled symmetrically — see the Invites section below.

### Invites

Scolar's invite system is entirely **in-app** — no emails, no URLs. Invites are targeted to a specific **Scolar user** (not an email address). This is the only mechanism for directly adding members to an Org.

Email is reserved only for actions that cannot happen inside Scolar (e.g., password reset, email verification). Everything else, including invites, happens within the app.

**Eligibility:**
- The recipient must already be a **registered, verified Scolar user**
- The recipient must share **at least one Org in common** with the inviting Admin — invites can only be sent to users the Admin has organic connection with

**Invite UI — finding a user to invite:**
- Admin opens the invite UI → sees a pool of all users who share at least one Org with the Admin, excluding users already in the current Org and **excluding the Admin themselves**
- Admin can **search within that pool** by display name
- Admin selects a user → invite is sent as an **in-app notification** to that user

**Collision with a pending join request (no two paths at once):** if the Admin tries to invite a user who already has a **pending join request** to that Org, the Admin is **prompted to approve the existing request instead**. If they dismiss the prompt, the invite is simply **not created** — the pending join request is left untouched (still pending). This mirrors the user-side handling in the Join Requests section and guarantees a user never has both a pending invite and a pending join request for the same Org.

**Generation & access:**
- Only the **Org Admin** can create invites
- Invites work for **all Orgs** regardless of visibility
- Each invite is **single-use**: it is consumed upon acceptance or decline

**Expiry:**
- Invites expire after **7 days** (fixed — not configurable by the Admin for now)
- Expired invites cannot be used

**Limits:**
- An Org can have a maximum of **50 active (pending, unused, unexpired) invites** at any time
- Once the limit is reached, the Admin must wait for invites to be used, expire, or be revoked before creating new ones
- Separately, invites count toward the **1000-member cap** along with members and pending join requests (see Section 4, Cap calculation). The Admin cannot create invites beyond the available slots; if pending join requests are blocking those slots, the Admin is shown a **reconciliation prompt** to address or decline requests first. Invites rank above join requests in priority.

**Revocation:**
- The Admin can see a list of all **pending invites** for the Org
- The Admin can **revoke** any unused invite before it expires — revoked invites become unusable immediately

**Recipient flow:**
1. Recipient receives an in-app notification of the invite
2. Recipient **accepts** → joins the Org immediately, invite is consumed
3. Recipient **declines** → invite is consumed, Admin is notified in-app
4. After a **decline**, the Admin must wait **48 hours** before sending a new invite to the same user — this prevents spam
5. Once consumed (accepted, declined, or expired), the invite cannot be used again

**Cooldown scope:** the 48-hour cooldown applies **only to a decline** — an active "no" from the recipient. It does **not** apply to:
- **Expiry** — if an invite expires unanswered, the Admin can immediately send a fresh one
- **Revocation** — if the Admin revokes their own invite, they can re-invite freely

The rationale: only a decline represents the recipient's expressed rejection, so only a decline warrants spam protection.

---

## 6. Org: Discovery

> Domain: `org/`.

### Overview

Org Discovery lets users — especially those in zero or few Orgs — find public Orgs that may interest them. Only **public** Orgs ever appear in any discovery surface. Private Orgs are never listed and can only be joined via direct invite.

### Discovery Surfaces

Three ways to discover Orgs:
1. **Search** — find public Orgs by name/keyword. Flat list, no filters or sorting.
2. **Browse** — view a list of all public Orgs.
3. **Suggested / Recommended** — public Orgs ranked by relevance to the user (see logic below).

### Org List Item Display

Each Org shown in any discovery surface displays:

| Field | Notes |
|-------|-------|
| `name` | Org name |
| `description` | Org description (optional) |
| `member_count` | Number of members in the Org |
| `paper_count` | Number of papers shared to that Org |

### Suggested / Recommended Logic

Recommendations are based on **keyword/tag overlap** (not embeddings — kept simple intentionally):
1. Collect the keywords/tags from the papers in the user's own library
2. For each public Org, collect the keywords/tags from papers shared to it
3. Rank public Orgs by the degree of keyword/tag overlap with the user's keywords
4. Show the top-ranked Orgs as "Suggested"

### Zero-Paper Users

- If the user has no papers, the Suggested section is **empty**
- The user is offered the Search and Browse surfaces instead
- No error or prompt is forced — discovery still works via search/browse

---

## 7. Org: Papers, Notifications & Permissions

> Domain: `org/`.

### Papers & Orgs

Papers are personal assets, not Org assets. Orgs are a way to share visibility, not a way to transfer ownership.

#### Ownership
- A user's **library entry** for a paper is owned by that user, never by an Org
- The underlying global paper data is shared across all users who reference it (via deduplication)
- An Org does not "own" papers — it can only be a recipient of shares

#### Paper Visibility (derived, not stored as a tag)
A library entry is in one of two states, derived from its share data:
- **Private:** zero Org shares → only the owner sees it
- **Shared:** one or more Org shares → owner + members of those Orgs can see it

There is no global/public visibility state for papers.

#### Sharing
- A user can **share a paper to one or more Orgs**
- A user can **only share to Orgs they are currently a member of**
- Once shared, **all members of that Org** can see the paper
- The library entry still belongs to the original uploading user

#### Auto-Unshare on Membership Change
- When a user **leaves an Org** (voluntarily), all of their shared papers are **automatically unshared from that Org**
- When a user is **kicked from an Org**, all of their shared papers are **automatically unshared from that Org**

### Notifications

In-app notifications are sent for all Org-related events, delivered **real-time** via Firestore real-time listeners (`onSnapshot` on `/users/{userId}/notifications/`). No email/push notifications at this time.

| Event | Recipient |
|-------|-----------|
| User is invited to an Org (in-app notification) | The invited user |
| User declines an Org invite | The inviting Admin |
| User is kicked from an Org | The kicked user |
| Admin sends a transfer offer | The targeted member(s) |
| Member declines a transfer offer | The Admin |
| Member accepts a transfer offer (becomes Admin) | The newly promoted user (and the now-former Admin) |
| Admin initiates Step Down | All members of the Org |
| Member requests to become Admin (during Step Down) | The Admin |
| Admin accepts/declines a "request to be Admin" | The requesting member |
| Step Down expires with no handoff → Org deleted | All members of the Org |
| Join request approved | The requesting user |
| Join request rejected | The requesting user |
| Org is deleted (enters Ghost Mode) | All members of the Org |

### Permissions Summary

| Action | Who Can Do It |
|--------|---------------|
| Create an Org | Any authenticated user |
| Delete an Org | Org Admin only |
| Edit Org name/description | Org Admin only |
| Toggle Org visibility (public/private) | Org Admin only |
| Set/change join policy | Org Admin only |
| Create an invite (targeted to a Scolar user, delivered in-app) | Org Admin only |
| Revoke a pending invite | Org Admin only |
| Accept or decline an invite | Only the invited user |
| Approve/reject join requests | Org Admin only |
| Kick a member | Org Admin only |
| Send an Admin transfer offer | Org Admin only |
| Cancel a pending transfer offer | Org Admin only |
| Accept or decline a transfer offer | The targeted member |
| Initiate Step Down | Org Admin only |
| Request to become Admin | Any Member, **only while the Org is in Step Down** |
| Accept/decline a "request to be Admin" | Org Admin only (auto-granted if the requester has a matching transfer offer) |
| Leave an Org | Any Member (Admin must Step Down if other members exist) |
| Browse/search public Orgs | Any authenticated user |
| See suggested Orgs (keyword-based) | Any authenticated user (empty if no papers) |
| Submit a join request (public Org with `request` policy) | Any authenticated user |
| Join an Org | Any registered user (via accepted invite, approved request, or open public join) |
| Share a paper to an Org | Paper owner only, and only if they are a current member of that Org |
| Unshare a paper from an Org | Paper owner only |
| View papers shared in an Org | Any member of that Org |

---

## To Be Determined

Features and additions that are planned but not required for launch. These are not blocking anything now — they are future enhancements to be implemented when the core product is stable.

---

### 1. Handle / Username

**What it is:** A unique `@handle` per user, separate from their display name.

**Why it matters:**
- Enables mentioning or tagging users within Orgs
- Provides a consistent, searchable public-facing identity
- Display names are not unique and can't reliably identify a specific user

**What it affects:** User registration flow, profile schema, search, notifications, any future mention/tagging system.

---

### 2. Full Name vs. Single Name Field

**What it is:** Whether to split the current single `name` field into `first name` + `last name`.

**Why it matters:**
- A single display name field is simpler and flexible
- Split fields are needed for formal communications, future email notifications, and billing or invoicing if premium plans involve personal details

**What it affects:** Registration form, user profile schema, any future billing or notification system.

---

### 3. Title-Normalization Rules & Fuzzy Matching for Layer 2 Dedup

**What it is:** Two related future refinements to Layer 2 deduplication:
- Whether to expose or document the exact normalization rules (trimming, case handling, punctuation, whitespace collapsing) for transparency
- **Fuzzy matching + confirm:** when an incoming paper is a close-but-not-exact match to an existing global record (e.g., "A. Vaswani" vs "Ashish Vaswani"), prompt the user *"Is this the same as [existing paper]?"* and let them manually link to the existing global record

**Why it matters:** The current normalization (case-insensitive, trim, whitespace-collapse, punctuation-strip) catches common manual-entry typing variations, but cannot catch semantically-equivalent-but-differently-written values. Fuzzy matching would close that gap and further protect the one-unique-global-record rule, but it adds UX and processing complexity not needed for launch.

**What it affects:** Deduplication logic, paper upload flow, manual metadata input UX, developer documentation.

---

### 4. Embedding Input Expansion

**What it is:** Currently the embedding input per paper is title + synopsis + keywords. This item tracks whether to expand it to include other sections (e.g., intro, conclusions).

**Why it matters:** Richer embedding input could improve similarity search quality, but adds complexity to section detection and processing cost.

**What it affects:** Paper upload flow, embedding generation, similarity search quality.

---

### 5. Member Cap Scaling

**What it is:** The current hard cap is 1000 members per Org, flat for all users. This item tracks whether that cap should increase or become tiered as the product scales.

**Why it matters:** 1000 is sufficient at launch but may be limiting for large communities later.

**What it affects:** Org membership schema, premium tier design.

---

### 6. Configurable Invite Expiry

**What it is:** Currently invite expiry is fixed at 7 days. This item tracks whether Admins should be able to configure the expiry duration.

**Why it matters:** Some Orgs may want shorter or longer windows depending on how they recruit members.

**What it affects:** Invite creation flow, invite schema, Admin settings.

---

### 7. Email / Push Notifications

**What it is:** Currently all notifications are in-app only, delivered real-time via Firestore real-time listeners (`onSnapshot`). This item tracks adding email and/or push notification delivery.

**Why it matters:** Users who are not actively in the app would miss important events (kicks, Org deletions, invite arrivals).

**What it affects:** Notification system, infrastructure, user notification preferences.

---

### 8. User Tier System & Subscription Schema

**What it is:** The data model and mechanics behind premium status — tier definitions, subscription table schema, billing integration, and how premium status is granted, tracked, and revoked.

**Why it matters:** Premium status gates the Gemini Pro AI features. The features themselves are specified, but the tier/subscription system that determines who is premium is not yet designed.

**What it affects:** User schema, premium AI feature gating, billing, the Premium Account / Plans & Billing chunk.
