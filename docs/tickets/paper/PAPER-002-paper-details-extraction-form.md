# PAPER-002 — Paper-details extraction (Groq) + review form

**Domain:** paper  
**Status:** Done — unit (Groq extraction + review-form component) + e2e both green  
**Spec:** docs/specs/paper/paper.md#1-paper-upload--paper-details  
**Depends on:** PAPER-001

## Context
Groq (`llama-3.3-70b-versatile`, JSON mode) extracts 5 required fields (title, authors, year, keywords, synopsis) from the first 5 pages. The result is a draft: fields render read-only, unlocked per-field via a pencil icon, making deliberate edits explicit. Never labeled "AI"; the word "metadata" never appears in the UI.

## Scope / Tasks
- Single Groq attempt (no retries); return partial result on failure.
- Details form: all fields read-only, pre-filled; pencil icon unlocks a field for editing.
- Empty (unextracted) fields are immediately editable with helper text: *"Due to the complexity of the PDF content structure, the required information could not be extracted."*
- Blocking discrepancy dialog when a field with an extracted value was modified — title *"Changes detected in paper details"*, body about reduced discoverability, actions **Proceed** / **Go back**.
- All 5 fields required before save. Store Groq raw output as immutable `extractedMetadata`; the user's confirmed copy goes on the library entry.

## Acceptance criteria
- [x] Extraction is a single Groq attempt; partial/empty results are handled gracefully.
- [x] Fields are read-only by default and unlock individually via pencil; empty fields are immediately editable with the exact helper text.
- [x] Modifying an extracted field triggers the blocking confirmation dialog before save.
- [x] Save blocked unless all 5 fields are present; "AI"/"metadata" never shown in UI.

## Affected files
- `src/components/add-paper-dialog.tsx`
- `src/lib/groq.ts`
- `src/types/paper.ts`

## Test coverage
- **Unit (extraction) — `src/lib/groq.test.ts`.** Mocks the Groq SDK; asserts our logic around the single call: full-JSON parse, per-field defaulting to `''`, non-JSON / null-content → empty draft, single attempt (no retries), and that we request the spec model in JSON mode.
- **Unit (review form) — `src/components/add-paper-dialog.test.tsx`.** Component test (the UI-bearing lane). Drives the dialog to the review step with a controlled `/init` draft (pdfjs, `computeSHA256`, `fetch`, router all mocked), then asserts the behaviour we own: fields read-only until unlocked per-pencil; unextracted fields immediately editable with the **exact** helper line; save gated on all five present; modifying an extracted value raises the blocking discrepancy dialog (Proceed commits, Go back returns); unchanged commits directly; commit carries both the confirmed copy and the immutable extracted copy; and "AI"/"metadata" never appear.
- **E2E — `e2e/paper-details-review.spec.ts`.** Real browser, offline. The e2e config stubs `GROQ_API_KEY`/`GEMINI_API_KEY` (like `RESEND_API_KEY`), so `/api/papers/init` deterministically returns an empty draft — the "extraction defeated by the PDF" path. Verifies every field is editable with the helper line (no "AI"/"metadata" in the dialog), save is client-gated on all five fields, and filling them fires the multipart commit.
- **Discrepancy dialog is unit-only, by design.** It requires a *non-empty* extracted value to diverge from, which can't be produced hermetically once the AI keys are stubbed offline; the component test owns that path end-to-end.
