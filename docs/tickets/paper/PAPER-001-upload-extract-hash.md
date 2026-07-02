# PAPER-001 — Upload: client text extraction + SHA-256 hash

**Domain:** paper  
**Status:** Partial — needs unit + e2e  
**Spec:** docs/specs/paper/paper.md#1-paper-upload--paper-details  
**Depends on:** —

## Context
PDF-only upload. Text is extracted client-side with `pdfjs-dist` and a SHA-256 hash of the file content is computed before upload. The PDF is held client-side and not stored until the user confirms details (no orphaned PDFs).

## Scope / Tasks
- Client: accept PDF, extract text (first 5 pages used downstream), compute SHA-256 of file content.
- Send extracted text + hash to `init`; defer the PDF bytes until commit.

## Acceptance criteria
- [x] Only PDFs are accepted.
- [x] Text extraction + SHA-256 happen client-side before any upload.
- [x] PDF bytes are not sent to storage until commit (USER confirms details).

## Affected files
- `src/components/add-paper-dialog.tsx`
- `src/app/api/papers/init/route.ts`

## Test coverage
- **Unit — needed.** SHA-256 hashing (known buffer → known digest) and the PDF-only guard are pure and should be unit-tested.
- **e2e — needed.** Upload dialog: accept a PDF, extract text, and confirm bytes are deferred until commit (no orphaned storage object).
