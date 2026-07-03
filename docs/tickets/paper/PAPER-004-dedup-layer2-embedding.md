# PAPER-004 — Layer 2 dedup (embedding similarity + borderline confirm)

**Domain:** paper  
**Status:** Done  
**Spec:** docs/specs/paper/paper.md#2-deduplication-strategy  
**Depends on:** PAPER-005

## Context
At commit, an embedding of the extracted `title + synopsis + keywords` is compared via `findNearest()` against global papers. Three tiers by cosine similarity to the top result: **≥ 0.92** → automatic duplicate ("same paper, different file"); **0.85 ≤ sim < 0.92** → **borderline** (ask the user to confirm, but only if the candidate is visible to them); **< 0.85** → treat as new. Automatic hits get the same visibility-based response as Layer 1.

## Scope / Tasks
- Generate embedding from `extractedMetadata` (never user edits).
- `findNearest()` cosine similarity; apply the three thresholds.
- **≥ 0.92:** run visibility check → in-library / in-org / silent (`ensureLibraryEntry` pointing at the existing global paper).
- **0.85–0.92 (borderline):** if the candidate is **visible** to the uploader, return `status: 'borderline'` with the candidate metadata so the UI can ask "is this the same paper?"; if it is **not** visible, treat as **new** (do not surface — avoids leaking a private/other-org paper's title).
- **< 0.85:** proceed as a new paper.

## Acceptance criteria
- [x] Near-duplicate uploads (re-exports/scans) at ≥ 0.92 are caught automatically at commit.
- [x] Borderline matches (0.85–0.92) prompt a confirm step only when the candidate is visible; otherwise the upload proceeds as new with no title leak.
- [x] On an automatic or confirmed hit, no new global paper or PDF is created; the library entry points to the existing paper.
- [x] Visibility-based response for automatic hits mirrors Layer 1.

## Affected files
- `src/app/api/papers/commit/route.ts`
- `src/lib/gemini.ts`
- `src/lib/paper-dedup.ts`
- `src/lib/paper-dedup-core.ts` (new — pure decision logic, no Firebase import)

## Implementation notes
- `findNearest()` now queries the full borderline band (`distanceThreshold: BORDERLINE_MAX_DISTANCE = 0.15`, i.e. similarity ≥ 0.85) with `distanceResultField: 'vector_distance'`, then classifies the top hit by its exact cosine distance via the pure `classifyDedupDistance()` in `src/lib/paper-dedup.ts` (`auto` ≤ 0.08, `borderline` ≤ 0.15, else `new`).
- Borderline hits are surfaced (`status: 'borderline'`) only when `checkVisibility()` ≠ `none`; otherwise the route falls through to new-paper creation, so a private/other-org title is never leaked.
- A `confirmedNew` flag on the commit request lets the dialog's "No, different paper" button force a fresh paper by **skipping Layer-2 entirely** — this prevents the borderline prompt from re-firing in a loop. "Yes, same paper" re-commits with `existingPaperId` (fast path → `ensureLibraryEntry`).
- The pure decision logic (`decideVisibility`, `classifyDedupDistance`, thresholds, `Visibility`) was moved to `src/lib/paper-dedup-core.ts` — free of any Firebase Admin import — so the offline unit lane can test it without booting the Admin SDK (which requires a service account). `paper-dedup.ts` re-exports the core, so `@/lib/paper-dedup` stays the single server entry point.

## Test coverage
- **Unit (pure):** `src/lib/paper-dedup.test.ts` — `classifyDedupDistance` boundary cases (0.0, 0.08, 0.081, 0.15, 0.151).
- **Component:** `src/components/add-paper-dialog.test.tsx` — borderline confirm renders the matched paper; "Yes" re-commits with `existingPaperId`, "No" re-commits with `confirmedNew` (our state-machine branching).
- **e2e / integration — N/A (documented):** the borderline branch needs live Gemini embeddings + Firestore Vector Search `findNearest`, neither of which the offline emulator/Playwright lanes support (same rationale as PAPER-003 / PAPER-005). The decision logic is fully covered by the unit + component lanes above.
