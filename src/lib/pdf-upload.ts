// Pure, client-side helpers for the paper-upload pre-flight (PAPER-001):
// gate the file type and fingerprint the bytes *before* anything is uploaded.
// Kept out of the dialog component so the logic is unit-testable in isolation.

/** Accept PDFs only, matched by file extension (case-insensitive). */
export function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf')
}

/**
 * SHA-256 hex digest of a file's bytes, computed in the browser via Web Crypto.
 * This is the Layer-1 dedup key; it runs client-side so the PDF is fingerprinted
 * before any upload happens.
 */
export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
