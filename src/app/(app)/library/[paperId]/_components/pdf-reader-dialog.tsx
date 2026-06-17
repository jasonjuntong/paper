'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, MoveHorizontal, MoveVertical, X } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)
  const [fitMode, setFitMode] = useState<'width' | 'height'>('width')

  pageRef.current = page

  // Render a single page scaled to fit either the container width (default;
  // page scrolls vertically) or its height (whole page visible), crisp on HiDPI.
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
    const cssScale =
      fitMode === 'width' ? availW / unscaled.width : availH / unscaled.height
    const viewport = pageObj.getViewport({ scale: cssScale * dpr })

    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`

    try {
      const task = pageObj.render({ canvas, viewport })
      renderTaskRef.current = task
      await task.promise
      setReady(true)
    } catch (err) {
      // Cancelled renders throw — ignore those, surface anything else.
      if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
        setError(true)
      }
    }
  }, [fitMode])

  // Load the document when the dialog opens; tear it down on close.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    setLoading(true)
    setError(false)
    setReady(false)
    setFitMode('width')
    setNumPages(0)
    setPage(1)
    setPdfDoc(null)

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
        setPdfDoc(pdf)
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
      const doc = pdfDocRef.current
      pdfDocRef.current = null
      setPdfDoc(null)
      doc?.destroy()
    }
  }, [open, paperId])

  // Render the current page whenever the doc becomes ready or the page changes.
  useEffect(() => {
    if (!pdfDoc) return
    renderPage(page)
  }, [pdfDoc, page, renderPage])

  // Start each page (and each fit-mode change) at the top.
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0
  }, [page, fitMode])

  // Re-render on container resize (covers initial layout settling).
  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      if (pdfDocRef.current) renderPage(pageRef.current)
    })
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
        showCloseButton={false}
        className="flex h-[92vh] w-[92vw] select-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[1240px]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-4 top-4 z-10 rounded-lg border bg-background/80 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>

        <div
          ref={containerRef}
          className="relative flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden bg-muted/40 p-4 pb-20 [scrollbar-gutter:stable]"
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
          {!error && (
            <canvas ref={canvasRef} className={cn('shadow-sm', !ready && 'invisible')} />
          )}
        </div>

        {!loading && !error && numPages > 0 && (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/80 px-2 py-1.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goPrev}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="min-w-14 text-center font-mono text-xs tabular-nums text-muted-foreground">
              {page} / {numPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goNext}
              disabled={page >= numPages}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>

            <span className="mx-0.5 h-5 w-px bg-border" />

            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(fitMode === 'width' && 'bg-muted text-foreground')}
              aria-pressed={fitMode === 'width'}
              onClick={() => setFitMode('width')}
            >
              <MoveHorizontal className="size-4" />
              <span className="sr-only">Fit width</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(fitMode === 'height' && 'bg-muted text-foreground')}
              aria-pressed={fitMode === 'height'}
              onClick={() => setFitMode('height')}
            >
              <MoveVertical className="size-4" />
              <span className="sr-only">Fit height</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
