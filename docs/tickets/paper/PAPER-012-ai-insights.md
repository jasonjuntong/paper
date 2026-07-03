# PAPER-012 — AI-generated insights (Gemini Pro, streaming)

**Domain:** paper  
**Status:** Todo — UI stub only  
**Spec:** docs/specs/paper/paper.md#6-ai-generated-insights-on-demand  
**Depends on:** PAPER-010

## Context
On-demand insights (Summary, Conclusions, Key Findings, Methodology) via Gemini Pro, streamed token-by-token, clearly labeled "AI". Once generated for a global paper, the result is cached on the paper record and served instantly to all who can access it. Cache access is bounded by paper visibility.

## Scope / Tasks
- Per-feature generate action on the paper detail page (full-access only).
- Request flow: verify access (`checkVisibility`, else 403) → check shared cache on the global paper → stream cached or call Gemini, streaming SSE/Next.js streaming → save output to the global paper cache field.
- Label outputs as "AI". Available to all users with full access (including org members).

## Acceptance criteria
- [ ] Four insight types generate on demand and stream token-by-token.
- [ ] Result is cached on the global paper and reused for all users with access (no regeneration).
- [ ] Access is re-checked per request; cached insights stay gated by visibility.
- [ ] Outputs are labeled "AI" in the UI.

## Affected files
- `src/app/api/papers/[paperId]/insights/route.ts` (new, streaming)
- `src/app/(app)/library/[paperId]/_components/paper-tabs.tsx` (replace stub)
- `src/lib/gemini.ts`

## Test commands
- **Unit:** _No unit test yet_ — run the lane with `npm test`; add `src/…/<name>.test.{ts,tsx}` (single file: `npx vitest run <path>`).
- **E2E:** _No e2e spec yet_ — run the lane with `npm run test:e2e`; add `e2e/<name>.spec.ts`.
