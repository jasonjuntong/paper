import { NextRequest } from 'next/server'
import { Readable } from 'node:stream'
import { getSession } from '@/lib/session'
import { adminFirestore, adminStorage } from '@/lib/firebase/admin'
import { accessTier, checkVisibility } from '@/lib/paper-dedup'

// firebase-admin + Node streams require the Node.js runtime.
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { paperId } = await params

  try {
  // Access gate — the PDF is *full*-access content, so list-only (public org the
  // user hasn't joined) is denied just like no access at all.
  const vis = await checkVisibility(session.uid, paperId)
  if (accessTier(vis) !== 'full') {
    return new Response('Forbidden', { status: 403 })
  }

  const paperSnap = await adminFirestore.collection('papers').doc(paperId).get()
  const storagePath = paperSnap.data()?.storagePath as string | undefined
  if (!storagePath) return new Response('Not found', { status: 404 })

  const file = adminStorage.bucket().file(storagePath)
  const [metadata] = await file.getMetadata()
  const size = Number(metadata.size)

  // Stable, content-derived validator (the PDF bytes for a paperId never change).
  const etag = `"${metadata.md5Hash ?? metadata.generation ?? size}"`

  // Revalidation: the access check above already ran, so a user who lost access
  // gets 403 before reaching here. Otherwise the cached copy is still valid →
  // 304, and the browser reuses its bytes without re-downloading.
  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
    })
  }

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Accept-Ranges': 'bytes',
    // private: browser-only (never a shared/CDN cache, since access is gated).
    // no-cache: stored, but revalidated every use so access is re-checked.
    'Cache-Control': 'private, no-cache',
    ETag: etag,
  }

  // Range request — serve the requested byte slice as 206 Partial Content.
  const rangeHeader = req.headers.get('range')
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0
      const end = match[2] ? parseInt(match[2], 10) : size - 1

      if (start > end || start >= size) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` },
        })
      }

      const nodeStream = file.createReadStream({ start, end })
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>
      return new Response(webStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        },
      })
    }
  }

  // No range — stream the whole file.
  const nodeStream = file.createReadStream()
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>
  return new Response(webStream, {
    status: 200,
    headers: { ...baseHeaders, 'Content-Length': String(size) },
  })
  } catch (err) {
    console.error('[papers/file] failed to serve PDF:', err)
    return new Response('Failed to load PDF', { status: 500 })
  }
}
