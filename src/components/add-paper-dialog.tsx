'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Pencil, TriangleAlert, Upload } from 'lucide-react'
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
import { computeSHA256, isPdfFile } from '@/lib/pdf-upload'
import type {
  CommitResponse,
  ExistingPaperInfo,
  InitResponse,
  OrgRef,
  PaperMetadata,
} from '@/types/paper'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | 'select'
  | 'processing'
  | 'in-library'
  | 'in-org'
  | 'borderline'
  | 'review'
  | 'committing'
  | 'done'

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

const emptyForm: FormState = { title: '', authors: '', year: '', keywords: '', synopsis: '' }

// ─── Validation ───────────────────────────────────────────────────────────────

const MetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors are required'),
  year: z.string().regex(/^\d{4}$/, 'Enter a valid 4-digit year'),
  keywords: z.string().min(1, 'Keywords are required'),
  synopsis: z.string().min(1, 'Synopsis is required'),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formFromDraft(draft: Partial<FormState>): FormState {
  return {
    title: draft.title ?? '',
    authors: draft.authors ?? '',
    year: draft.year ?? '',
    keywords: draft.keywords ?? '',
    synopsis: draft.synopsis ?? '',
  }
}

function initialUnlocked(draft: Partial<FormState>): Set<keyof FormState> {
  const s = new Set<keyof FormState>()
  if (!draft.title) s.add('title')
  if (!draft.authors) s.add('authors')
  if (!draft.year) s.add('year')
  if (!draft.keywords) s.add('keywords')
  if (!draft.synopsis) s.add('synopsis')
  return s
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReadOnlyInput({
  value,
  onUnlock,
}: {
  value: string
  onUnlock: () => void
}) {
  return (
    <div className="relative flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
      <span className={cn('flex-1 min-w-0 truncate', !value && 'text-muted-foreground italic')}>
        {value || 'Not extracted'}
      </span>
      <button
        type="button"
        aria-label="Edit field"
        className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        onClick={onUnlock}
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  )
}

function ReadOnlyTextarea({
  value,
  onUnlock,
}: {
  value: string
  onUnlock: () => void
}) {
  return (
    <div className="relative rounded-md border border-input bg-muted/40 px-3 py-2 text-sm min-h-[100px]">
      <p className={cn('leading-relaxed pr-7', !value && 'text-muted-foreground italic')}>
        {value || 'Not extracted'}
      </p>
      <button
        type="button"
        aria-label="Edit field"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={onUnlock}
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  )
}

function OrgBadges({ orgs }: { orgs: OrgRef[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {orgs.map((org) => (
        <span
          key={org.id}
          className="inline-flex items-center rounded-[3px] bg-pill px-1.5 py-px font-mono text-xs text-muted-foreground"
        >
          {org.name}
        </span>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AddPaperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddPaperDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaperDialogProps) {
  const router = useRouter()

  const [step, setStep] = useState<Step>('select')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState<string>('')

  // Dedup card state
  const [existingPaper, setExistingPaper] = useState<ExistingPaperInfo | null>(null)
  const [existingOrgs, setExistingOrgs] = useState<OrgRef[]>([])

  // Review form state
  const [extractedMeta, setExtractedMeta] = useState<PaperMetadata | null>(null)
  const [existingPaperId, setExistingPaperId] = useState<string | null>(null)
  const [unlockedFields, setUnlockedFields] = useState<Set<keyof FormState>>(new Set())
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [showWarning, setShowWarning] = useState(false)

  // Done state
  const [doneMessage, setDoneMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setStep('select')
    setDragging(false)
    setSelectedFile(null)
    setFileHash('')
    setExistingPaper(null)
    setExistingOrgs([])
    setExtractedMeta(null)
    setExistingPaperId(null)
    setUnlockedFields(new Set())
    setForm(emptyForm)
    setErrors({})
    setShowWarning(false)
    setDoneMessage('')
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState()
    onOpenChange(open)
  }

  function unlockField(field: keyof FormState) {
    setUnlockedFields((prev) => new Set([...prev, field]))
  }

  function handleFileChosen(file: File) {
    if (!isPdfFile(file)) return
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

  function enterReview(draft: Partial<FormState>, paperId: string | null) {
    const fullForm = formFromDraft(draft)
    const fullMeta: PaperMetadata = {
      title: draft.title ?? '',
      authors: draft.authors ?? '',
      year: draft.year ?? '',
      keywords: draft.keywords ?? '',
      synopsis: draft.synopsis ?? '',
    }
    setExtractedMeta(fullMeta)
    setForm(fullForm)
    setUnlockedFields(initialUnlocked(draft))
    setExistingPaperId(paperId)
    setErrors({})
    setShowWarning(false)
    setStep('review')
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

      if (data.status === 'in-library') {
        setExistingPaper(data.paper)
        setStep('in-library')
        return
      }

      if (data.status === 'in-org') {
        setExistingPaper(data.paper)
        setExistingOrgs(data.orgs)
        setExistingPaperId(data.existingPaperId)
        setStep('in-org')
        return
      }

      enterReview(data.draft, data.existingPaperId)
    } catch {
      enterReview({}, null)
    }
  }

  function handleProceedAnyway() {
    if (!existingPaper) return
    enterReview(
      {
        title: existingPaper.title,
        authors: existingPaper.authors,
        year: existingPaper.year,
        keywords: existingPaper.keywords,
        synopsis: existingPaper.synopsis,
      },
      existingPaperId
    )
  }

  function goToPaper(paperId: string) {
    handleOpenChange(false)
    router.push(`/library/${paperId}`)
  }

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function hasDiscrepancy(): boolean {
    if (!extractedMeta) return false
    return (['title', 'authors', 'year', 'keywords', 'synopsis'] as const).some(
      (f) => extractedMeta[f] !== '' && form[f] !== extractedMeta[f]
    )
  }

  // Overrides let the borderline-confirm buttons drive the re-commit explicitly,
  // without racing async React state: "Yes" pins the matched paper's id (fast
  // path → library link), "No" sets confirmedNew so the route skips Layer-2.
  async function doCommit(opts?: { existingPaperId?: string; confirmedNew?: boolean }) {
    const commitPaperId = opts?.existingPaperId ?? existingPaperId
    setShowWarning(false)
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

      if (opts?.confirmedNew) fd.append('confirmedNew', 'true')

      if (commitPaperId && !opts?.confirmedNew) {
        fd.append('existingPaperId', commitPaperId)
      } else if (extractedMeta) {
        fd.append('emTitle', extractedMeta.title)
        fd.append('emAuthors', extractedMeta.authors)
        fd.append('emYear', extractedMeta.year)
        fd.append('emKeywords', extractedMeta.keywords)
        fd.append('emSynopsis', extractedMeta.synopsis)
      }

      const res = await fetch('/api/papers/commit', { method: 'POST', body: fd })
      const data: CommitResponse = await res.json()

      if (data.status === 'in-library') {
        setExistingPaper(data.paper)
        setExistingOrgs([])
        setStep('in-library')
        return
      }

      if (data.status === 'in-org') {
        setExistingPaper(data.paper)
        setExistingOrgs(data.orgs)
        setExistingPaperId(data.existingPaperId)
        setStep('in-org')
        return
      }

      if (data.status === 'borderline') {
        setExistingPaper(data.paper)
        setExistingOrgs([])
        setExistingPaperId(data.existingPaperId)
        setStep('borderline')
        return
      }

      setDoneMessage('Paper added to your library.')
      setStep('done')
      router.refresh()
      onSuccess?.()
    } catch {
      setDoneMessage('Something went wrong. Please try again.')
      setStep('done')
    }
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
    if (hasDiscrepancy()) {
      setShowWarning(true)
      return
    }
    await doCommit()
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
              <DialogTitle>Add paper</DialogTitle>
              <DialogDescription>
                Upload a PDF — Scolar will extract the paper details automatically.
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
                accept="application/pdf,.pdf"
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
                Extracting text and paper details — this may take a few seconds.
              </p>
            </div>
          </div>
        )}

        {/* ── In Library ── */}
        {step === 'in-library' && existingPaper && (
          <>
            <DialogHeader>
              <DialogTitle>Already in your library</DialogTitle>
              <DialogDescription>
                This paper is already in your library.
              </DialogDescription>
            </DialogHeader>

            <button
              type="button"
              onClick={() => goToPaper(existingPaper.paperId)}
              className="w-full rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-2 text-left transition-colors hover:bg-muted/60 hover:border-foreground/20 cursor-pointer"
            >
              <p className="text-sm font-medium leading-snug">{existingPaper.title}</p>
              <p className="text-xs text-muted-foreground">
                {existingPaper.authors}
                {existingPaper.year && (
                  <span className="ml-2 font-mono">· {existingPaper.year}</span>
                )}
              </p>
              {existingOrgs.length > 0 && <OrgBadges orgs={existingOrgs} />}
            </button>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => goToPaper(existingPaper.paperId)}>
                View paper
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── In Org ── */}
        {step === 'in-org' && existingPaper && (
          <>
            <DialogHeader>
              <DialogTitle>Paper already shared</DialogTitle>
              <DialogDescription>
                This paper is already shared in{' '}
                {existingOrgs.map((o) => o.name).join(', ')}.
              </DialogDescription>
            </DialogHeader>

            <button
              type="button"
              onClick={() => goToPaper(existingPaper.paperId)}
              className="w-full rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-2 text-left transition-colors hover:bg-muted/60 hover:border-foreground/20 cursor-pointer"
            >
              <p className="text-sm font-medium leading-snug">{existingPaper.title}</p>
              <p className="text-xs text-muted-foreground">
                {existingPaper.authors}
                {existingPaper.year && (
                  <span className="ml-2 font-mono">· {existingPaper.year}</span>
                )}
              </p>
              {existingOrgs.length > 0 && <OrgBadges orgs={existingOrgs} />}
            </button>

            <DialogFooter>
              <Button variant="outline" onClick={handleProceedAnyway}>
                Proceed anyway
              </Button>
              <Button onClick={() => goToPaper(existingPaper.paperId)}>
                View paper
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Borderline (0.85–0.92) confirm ── */}
        {step === 'borderline' && existingPaper && (
          <>
            <DialogHeader>
              <DialogTitle>Is this the same paper?</DialogTitle>
              <DialogDescription>
                This looks very similar to a paper you already have access to. If it&apos;s the
                same one, we&apos;ll link to it instead of adding a duplicate.
              </DialogDescription>
            </DialogHeader>

            <div className="w-full rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-2 text-left">
              <p className="text-sm font-medium leading-snug">{existingPaper.title}</p>
              <p className="text-xs text-muted-foreground">
                {existingPaper.authors}
                {existingPaper.year && (
                  <span className="ml-2 font-mono">· {existingPaper.year}</span>
                )}
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => doCommit({ confirmedNew: true })}
              >
                No, different paper
              </Button>
              <Button
                onClick={() =>
                  doCommit({ existingPaperId: existingPaper.paperId })
                }
              >
                Yes, same paper
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Review ── */}
        {step === 'review' && !showWarning && (
          <form onSubmit={handleSubmitMetadata} className="min-w-0">
            <DialogHeader>
              <DialogTitle>Review paper details</DialogTitle>
              <DialogDescription>
                Check the extracted details. Click the pencil icon to edit a field. All fields are required.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-4 min-w-0">
              <Field className="min-w-0">
                <FieldLabel>Title</FieldLabel>
                {unlockedFields.has('title') ? (
                  <>
                    <Input
                      value={form.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      aria-invalid={!!errors.title}
                    />
                    {!extractedMeta?.title && (
                      <p className="text-xs text-muted-foreground">
                        Due to the complexity of the PDF content structure, the required information could not be extracted.
                      </p>
                    )}
                  </>
                ) : (
                  <ReadOnlyInput value={form.title} onUnlock={() => unlockField('title')} />
                )}
                {errors.title && <FieldError>{errors.title}</FieldError>}
              </Field>

              <Field className="min-w-0">
                <FieldLabel>Authors</FieldLabel>
                {unlockedFields.has('authors') ? (
                  <>
                    <Input
                      value={form.authors}
                      placeholder="e.g. Smith, J.; Jones, A."
                      onChange={(e) => handleFieldChange('authors', e.target.value)}
                      aria-invalid={!!errors.authors}
                    />
                    {!extractedMeta?.authors && (
                      <p className="text-xs text-muted-foreground">
                        Due to the complexity of the PDF content structure, the required information could not be extracted.
                      </p>
                    )}
                  </>
                ) : (
                  <ReadOnlyInput value={form.authors} onUnlock={() => unlockField('authors')} />
                )}
                {errors.authors && <FieldError>{errors.authors}</FieldError>}
              </Field>

              <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
                <Field className="min-w-0">
                  <FieldLabel>Year</FieldLabel>
                  {unlockedFields.has('year') ? (
                    <>
                      <Input
                        type="number"
                        min={1000}
                        max={9999}
                        value={form.year}
                        onChange={(e) => handleFieldChange('year', e.target.value)}
                        aria-invalid={!!errors.year}
                      />
                      {!extractedMeta?.year && (
                        <p className="text-xs text-muted-foreground">
                          Due to the complexity of the PDF content structure, the required information could not be extracted.
                        </p>
                      )}
                    </>
                  ) : (
                    <ReadOnlyInput value={form.year} onUnlock={() => unlockField('year')} />
                  )}
                  {errors.year && <FieldError>{errors.year}</FieldError>}
                </Field>

                <Field className="min-w-0">
                  <FieldLabel>Keywords</FieldLabel>
                  {unlockedFields.has('keywords') ? (
                    <>
                      <Input
                        value={form.keywords}
                        placeholder="comma-separated"
                        onChange={(e) => handleFieldChange('keywords', e.target.value)}
                        aria-invalid={!!errors.keywords}
                      />
                      {!extractedMeta?.keywords && (
                        <p className="text-xs text-muted-foreground">
                          Due to the complexity of the PDF content structure, the required information could not be extracted.
                        </p>
                      )}
                    </>
                  ) : (
                    <ReadOnlyInput value={form.keywords} onUnlock={() => unlockField('keywords')} />
                  )}
                  {errors.keywords && <FieldError>{errors.keywords}</FieldError>}
                </Field>
              </div>

              <Field className="min-w-0">
                <FieldLabel>Synopsis</FieldLabel>
                {unlockedFields.has('synopsis') ? (
                  <>
                    <Textarea
                      value={form.synopsis}
                      rows={4}
                      onChange={(e) => handleFieldChange('synopsis', e.target.value)}
                      aria-invalid={!!errors.synopsis}
                    />
                    {!extractedMeta?.synopsis && (
                      <p className="text-xs text-muted-foreground">
                        Due to the complexity of the PDF content structure, the required information could not be extracted.
                      </p>
                    )}
                  </>
                ) : (
                  <ReadOnlyTextarea value={form.synopsis} onUnlock={() => unlockField('synopsis')} />
                )}
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

        {/* ── Discrepancy Warning ── */}
        {step === 'review' && showWarning && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert className="size-4 text-amber-500" />
                Changes detected in paper details
              </DialogTitle>
              <DialogDescription>
                We noticed some paper details were changed from what was automatically extracted.
                Saving modified details may reduce this paper&apos;s discoverability in search.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWarning(false)}>
                Go back
              </Button>
              <Button onClick={() => doCommit()}>Proceed</Button>
            </DialogFooter>
          </>
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
        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>Paper saved</DialogTitle>
              <DialogDescription>{doneMessage}</DialogDescription>
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
