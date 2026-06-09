'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { CommitResponse, InitResponse, PaperMetadataDraft } from '@/types/paper'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'select' | 'processing' | 'review' | 'committing' | 'done'

interface DoneState {
  variant: 'success' | 'duplicate'
  message: string
}

interface FormState {
  title: string
  authors: string
  year: string
  keywords: string
  synopsis: string
}

interface FormErrors {
  title?: string
  authors?: string
  year?: string
  keywords?: string
  synopsis?: string
}

// ─── Validation ───────────────────────────────────────────────────────────────

const MetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors are required'),
  year: z.string().regex(/^\d{4}$/, 'Enter a valid 4-digit year'),
  keywords: z.string().min(1, 'Keywords are required'),
  synopsis: z.string().min(1, 'Synopsis is required'),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const numPages = Math.min(pdf.numPages, 5)
  const pages: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
    )
  }

  return pages
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UploadPaperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UploadPaperDialog({
  open,
  onOpenChange,
  onSuccess,
}: UploadPaperDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState<string>('')
  const [form, setForm] = useState<FormState>({
    title: '',
    authors: '',
    year: '',
    keywords: '',
    synopsis: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [done, setDone] = useState<DoneState | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setStep('select')
    setDragging(false)
    setSelectedFile(null)
    setFileHash('')
    setForm({ title: '', authors: '', year: '', keywords: '', synopsis: '' })
    setErrors({})
    setDone(null)
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState()
    onOpenChange(open)
  }

  function handleFileChosen(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) return
    setSelectedFile(file)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileChosen(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileChosen(file)
  }

  async function startProcessing() {
    if (!selectedFile) return
    setStep('processing')

    try {
      const [pages, hash] = await Promise.all([
        extractPdfPages(selectedFile),
        computeSHA256(selectedFile),
      ])

      setFileHash(hash)

      const res = await fetch('/api/papers/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash, pages }),
      })

      const data: InitResponse = await res.json()

      if (data.status === 'duplicate') {
        setDone({ variant: 'duplicate', message: data.message })
        setStep('done')
        return
      }

      const draft = data.draft as Partial<FormState>
      setForm({
        title: draft.title ?? '',
        authors: draft.authors ?? '',
        year: draft.year ?? '',
        keywords: draft.keywords ?? '',
        synopsis: draft.synopsis ?? '',
      })
      setStep('review')
    } catch {
      // On unexpected error fall back to empty review form
      setStep('review')
    }
  }

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmitMetadata(e: React.FormEvent) {
    e.preventDefault()
    const result = MetadataSchema.safeParse(form)
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      setErrors({
        title: flat.title?.[0],
        authors: flat.authors?.[0],
        year: flat.year?.[0],
        keywords: flat.keywords?.[0],
        synopsis: flat.synopsis?.[0],
      })
      return
    }

    setStep('committing')

    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('authors', form.authors)
      fd.append('year', form.year)
      fd.append('keywords', form.keywords)
      fd.append('synopsis', form.synopsis)
      fd.append('hash', fileHash)
      fd.append('pdf', selectedFile!, selectedFile!.name)

      const res = await fetch('/api/papers/commit', { method: 'POST', body: fd })
      const data: CommitResponse = await res.json()

      if (data.status === 'duplicate') {
        setDone({ variant: 'duplicate', message: data.message })
      } else {
        setDone({ variant: 'success', message: 'Paper added to your library.' })
        onSuccess?.()
      }
      setStep('done')
    } catch {
      setDone({
        variant: 'success',
        message: 'Something went wrong. Please try again.',
      })
      setStep('done')
    }
  }

  const isBlocking = step === 'processing' || step === 'committing'

  return (
    <Dialog open={open} onOpenChange={isBlocking ? undefined : handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={isBlocking ? (e) => e.preventDefault() : undefined}
      >
        {/* ── Select ── */}
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Upload paper</DialogTitle>
              <DialogDescription>
                Upload a PDF — Scolar will extract the metadata automatically.
              </DialogDescription>
            </DialogHeader>

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
                dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/40',
                selectedFile && 'border-primary/60 bg-primary/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={onFileInput}
              />
              {selectedFile ? (
                <>
                  <FileText className="size-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop a PDF here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={startProcessing} disabled={!selectedFile}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Analysing paper…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Extracting text and metadata — this may take a few seconds.
              </p>
            </div>
          </div>
        )}

        {/* ── Review ── */}
        {step === 'review' && (
          <form onSubmit={handleSubmitMetadata}>
            <DialogHeader>
              <DialogTitle>Review metadata</DialogTitle>
              <DialogDescription>
                Check the extracted details. All fields are required before saving.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-4">
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={form.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  aria-invalid={!!errors.title}
                />
                {errors.title && <FieldError>{errors.title}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>Authors</FieldLabel>
                <Input
                  value={form.authors}
                  placeholder="e.g. Smith, J.; Jones, A."
                  onChange={(e) => handleFieldChange('authors', e.target.value)}
                  aria-invalid={!!errors.authors}
                />
                {errors.authors && <FieldError>{errors.authors}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Year</FieldLabel>
                  <Input
                    type="number"
                    min={1000}
                    max={9999}
                    value={form.year}
                    onChange={(e) => handleFieldChange('year', e.target.value)}
                    aria-invalid={!!errors.year}
                  />
                  {errors.year && <FieldError>{errors.year}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel>Keywords</FieldLabel>
                  <Input
                    value={form.keywords}
                    placeholder="comma-separated"
                    onChange={(e) => handleFieldChange('keywords', e.target.value)}
                    aria-invalid={!!errors.keywords}
                  />
                  {errors.keywords && <FieldError>{errors.keywords}</FieldError>}
                </Field>
              </div>

              <Field>
                <FieldLabel>Synopsis</FieldLabel>
                <Textarea
                  value={form.synopsis}
                  rows={4}
                  onChange={(e) => handleFieldChange('synopsis', e.target.value)}
                  aria-invalid={!!errors.synopsis}
                />
                {errors.synopsis && <FieldError>{errors.synopsis}</FieldError>}
              </Field>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save to library</Button>
            </DialogFooter>
          </form>
        )}

        {/* ── Committing ── */}
        {step === 'committing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Saving paper…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Uploading and generating embeddings.
              </p>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && done && (
          <>
            <DialogHeader>
              <DialogTitle>
                {done.variant === 'success' ? 'Paper saved' : 'Already in Scolar'}
              </DialogTitle>
              <DialogDescription>{done.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
