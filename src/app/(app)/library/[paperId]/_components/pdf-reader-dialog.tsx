'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface PdfReaderDialogProps {
  paperId: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PdfReaderDialog({ paperId, title, open, onOpenChange }: PdfReaderDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const pageRef = useRef(1)

  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  pageRef.current = page

  // Render a single page, scaled to fit the container (contain), crisp on HiDPI.
  const renderPage = useCallback(async (num: number) => {
    const pdf = pdfDocRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!pdf || !canvas || !container) return

    renderTaskRef.current?.cancel()

    const pageObj = await pdf.getPage(num)
    const unscaled = pageObj.getViewport({ scale: 1 })
    const availW = container.clientWidth - 32
    const availH = container.clientHeight - 32
    if (availW <= 0 || availH <= 0) return

    const dpr = window.devicePixelRatio || 1
    const cssScale = Math.min(availW / unscaled.width, availH / unscaled.height)
    const viewport = pageObj.getViewport({ scale: cssScale * dpr })

    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`

    try {
      const task = pageObj.render({ canvas, viewport })
      renderTaskRef.current = task
      await task.promise
    } catch (err) {
      // Cancelled renders throw — ignore those, surface anything else.
      if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
        setError(true)
      }
    }
  }, [])

  // Load the document when the dialog opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    setLoading(true)
    setError(false)
    setNumPages(0)
    setPage(1)

    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const task = pdfjs.getDocument({ url: `/api/papers/${paperId}/file` })
        const pdf = await task.promise
        if (cancelled) {
          pdf.destroy()
          return
        }
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)
        await renderPage(1)
      } catch (err) {
        console.error('[pdf-reader] failed to load PDF:', err)
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
      pdfDocRef.current?.destroy()
      pdfDocRef.current = null
    }
  }, [open, paperId, renderPage])

  // Re-render on page change.
  useEffect(() => {
    if (!open || loading || error) return
    renderPage(page)
  }, [page, open, loading, error, renderPage])

  // Re-render on container resize.
  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => renderPage(pageRef.current))
    observer.observe(container)
    return () => observer.disconnect()
  }, [open, renderPage])

  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), [])
  const goNext = useCallback(
    () => setPage((p) => Math.min(numPages || 1, p + 1)),
    [numPages]
  )

  // Arrow-key navigation.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, goPrev, goNext])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[92vh] w-[92vw] select-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <div className="flex items-center border-b px-4 py-3 pr-12">
          <DialogTitle className="truncate">{title}</DialogTitle>
        </div>

        <div
          ref={containerRef}
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-muted/40 p-4"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-sm text-muted-foreground">
              This paper could not be loaded.
            </p>
          )}
          {!error && <canvas ref={canvasRef} className="shadow-sm" />}
        </div>

        <div className="flex items-center justify-center gap-4 border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={goPrev}
            disabled={loading || error || page <= 1}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {numPages ? `${page} / ${numPages}` : '—'}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={goNext}
            disabled={loading || error || page >= numPages}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
