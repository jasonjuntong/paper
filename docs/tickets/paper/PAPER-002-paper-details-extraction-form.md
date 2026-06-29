# PAPER-002 — Paper-details extraction (Groq) + review form

**Domain:** paper
**Status:** Partial — verify pencil-edit, discrepancy dialog, helper text
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
- [ ] Extraction is a single Groq attempt; partial/empty results are handled gracefully.
- [ ] Fields are read-only by default and unlock individually via pencil; empty fields are immediately editable with the exact helper text.
- [ ] Modifying an extracted field triggers the blocking confirmation dialog before save.
- [ ] Save blocked unless all 5 fields are present; "AI"/"metadata" never shown in UI.

## Affected files
- `src/components/add-paper-dialog.tsx`
- `src/lib/groq.ts`
- `src/types/paper.ts`
