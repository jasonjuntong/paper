import { z } from 'zod'

// Pure, isomorphic handle helpers — safe to import from both client components
// and server code (no firebase imports here). Admin-SDK reservation lives in
// `handles.server.ts`; the client availability read lives in `handles.client.ts`.

export const HANDLE_MIN_LENGTH = 3
export const HANDLE_MAX_LENGTH = 20

/** Reserved handles — Scolar/system terms and route-collision risks, blocked at
 *  registration. Checked against the lowercased form. Because handles are
 *  permanent and never recycled, this list is enforced from day one. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'admin', 'support', 'help', 'scolar', 'api', 'app',
  'system', 'root', 'me', 'you', 'null', 'undefined',
])

/** Printable ASCII only — excludes whitespace, control chars, and non-ASCII
 *  (Unicode-homoglyph guard) in one shot. */
const HANDLE_ALLOWED = /^[\x21-\x7E]+$/
/** The `/` doc-id delimiter plus the HTML/JS-injection chars `< > & " '` and
 *  the backtick. Defense-in-depth; output is always HTML-escaped too. */
const HANDLE_FORBIDDEN = /[/<>&"'`]/

/** The lowercased uniqueness key and `/handles/{handle}` doc id. The user's
 *  original casing is preserved separately on the user doc, never here. */
export function normalizeHandle(handle: string): string {
  return handle.toLowerCase()
}

export const handleSchema = z
  .string()
  .min(HANDLE_MIN_LENGTH, `Handle must be at least ${HANDLE_MIN_LENGTH} characters`)
  .max(HANDLE_MAX_LENGTH, `Handle must be at most ${HANDLE_MAX_LENGTH} characters`)
  .regex(HANDLE_ALLOWED, 'Handle cannot contain spaces or non-ASCII characters')
  .refine((h) => !HANDLE_FORBIDDEN.test(h), {
    message: 'Handle cannot contain / < > & " \' or `',
  })
  .refine((h) => !RESERVED_HANDLES.has(normalizeHandle(h)), {
    message: 'This handle is reserved',
  })

/** Thrown when a handle is already reserved (active or tombstoned). USER-001's
 *  registration route maps this to a 409 surfaced to the user (unlike duplicate
 *  email, a taken handle is shown — handles are public by design). */
export class HandleTakenError extends Error {
  constructor(handle?: string) {
    super(handle ? `Handle already taken: ${handle}` : 'Handle already taken')
    this.name = 'HandleTakenError'
  }
}
