# PAPER-008 — PDF reader modal

**Domain:** paper  
**Status:** Partial — verify  
**Spec:** docs/specs/paper/paper.md#4-pdf-reader  
**Depends on:** ORG-021, PAPER-009

## Context
A large modal reader renders PDFs directly with `pdfjs-dist` — one page at a time, canvas only (no text layer/selection), no download affordance. Opened via "Read paper" on the detail page. Org members reading shared papers becomes reachable once sharing (ORG-021) lands; the serving proxy already gates access.

## Scope / Tasks
- Modal reader: render one page scaled to fit; Previous/Next/Close, arrow-key nav, `X / N` indicator.
- Canvas-only render (no text layer), no download button.
- Load via the access-gated `/api/papers/{paperId}/file` proxy (PAPER-009) using Range requests.

## Acceptance criteria
- [x] Reader opens from the detail page and renders one page at a time, fit-to-modal.
- [x] No text selection/highlighting and no download UI.
- [ ] Pages load via the gated proxy; org-shared papers are readable by members once sharing exists.

## Affected files
- `src/app/(app)/library/[paperId]/` reader component
- `src/app/api/papers/[paperId]/file/route.ts` (consumer)
