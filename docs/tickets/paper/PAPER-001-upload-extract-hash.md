# PAPER-001 — Upload: client text extraction + SHA-256 hash

**Domain:** paper  
**Status:** Done  
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
- `src/lib/pdf-upload.ts` — extracted pure helpers (`isPdfFile`, `computeSHA256`) so the guard + hash are unit-testable in isolation; the dialog now imports them.

## Test coverage
- **Unit — done.** `src/lib/pdf-upload.test.ts`: SHA-256 against known vectors (empty, `"abc"`) + hex/format/content-vs-name properties, and the PDF-only guard (case-insensitivity, near-miss names). Runs under `// @vitest-environment node` — jsdom's `File.arrayBuffer()` returns a cross-realm buffer that Node's WebCrypto rejects; `node` uses one realm (same as the real browser).
- **e2e — done.** `e2e/add-paper.spec.ts` (fixture `e2e/fixtures/sample.pdf`): choosing a PDF extracts text + hashes bytes client-side and sends **only** `{ hash, pages }` to `/api/papers/init` as JSON (asserts the hash equals a server-side recompute and pages contain the real extracted text); confirms the flow reaches review and that **no** `/api/papers/commit` (byte upload) fires during the pre-flight — bytes are deferred. Second case: a non-PDF is dropped by the guard, leaving Continue disabled.

## Test commands
- **Unit:**
  - Lane: `npm test`
  - Single file: `npx vitest run src/lib/pdf-upload.test.ts`
- **E2E:**
  - Lane: `npm run test:e2e`
  - Single file: `firebase emulators:exec --project demo-paper --only auth,firestore 'npx playwright test e2e/add-paper.spec.ts'`
