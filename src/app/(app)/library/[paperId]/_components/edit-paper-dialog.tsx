'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, Pencil } from 'lucide-react'
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

const MetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors are required'),
  year: z.string().regex(/^\d{4}$/, 'Enter a valid 4-digit year'),
  keywords: z.string().min(1, 'Keywords are required'),
  synopsis: z.string().min(1, 'Synopsis is required'),
})

type FormState = z.input<typeof MetadataSchema>
type FormErrors = Partial<Record<keyof FormState, string>>

export interface PaperMetadata {
  paperId: string
  title: string
  authors: string
  year: number
  keywords: string
  synopsis: string
}

interface EditPaperDialogProps {
  entryId: string
  paper: PaperMetadata
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ReadOnlyInput({ value, onUnlock }: { value: string; onUnlock: () => void }) {
  return (
    <div className="relative flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
      <span className={cn('flex-1 min-w-0 truncate', !value && 'text-muted-foreground italic')}>
        {value || 'Not set'}
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

function ReadOnlyTextarea({ value, onUnlock }: { value: string; onUnlock: () => void }) {
  return (
    <div className="relative rounded-md border border-input bg-muted/40 px-3 py-2 text-sm min-h-[100px]">
      <p className={cn('leading-relaxed pr-7', !value && 'text-muted-foreground italic')}>
        {value || 'Not set'}
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

export function EditPaperDialog({ entryId, paper, open, onOpenChange }: EditPaperDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    title: paper.title,
    authors: paper.authors,
    year: String(paper.year),
    keywords: paper.keywords,
    synopsis: paper.synopsis,
  })
  const [unlockedFields, setUnlockedFields] = useState<Set<keyof FormState>>(new Set())
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setForm({
        title: paper.title,
        authors: paper.authors,
        year: String(paper.year),
        keywords: paper.keywords,
        synopsis: paper.synopsis,
      })
      setUnlockedFields(new Set())
      setErrors({})
    }
    onOpenChange(next)
  }

  function unlockField(field: keyof FormState) {
    setUnlockedFields((prev) => new Set([...prev, field]))
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
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

    setSaving(true)
    try {
      const res = await fetch('/api/papers/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, ...result.data }),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      router.refresh()
      setTimeout(() => {
        setSaved(false)
        onOpenChange(false)
      }, 900)
    } catch {
      setSaving(false)
    }
  }

  const busy = saving || saved

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={busy ? (e) => e.preventDefault() : undefined}
      >
        {saved ? (
          <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CircleCheck className="size-6 text-foreground/60" />
            </div>
            <p className="text-sm font-medium">Details updated</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="min-w-0">
            <DialogHeader>
              <DialogTitle>Edit paper details</DialogTitle>
              <DialogDescription>
                Click the pencil icon to edit a field. All fields are required.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-4 min-w-0">
              <Field className="min-w-0">
                <FieldLabel>Title</FieldLabel>
                {unlockedFields.has('title') ? (
                  <Input
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    aria-invalid={!!errors.title}
                  />
                ) : (
                  <ReadOnlyInput value={form.title} onUnlock={() => unlockField('title')} />
                )}
                {errors.title && <FieldError>{errors.title}</FieldError>}
              </Field>

              <Field className="min-w-0">
                <FieldLabel>Authors</FieldLabel>
                {unlockedFields.has('authors') ? (
                  <Input
                    value={form.authors}
                    placeholder="e.g. Smith, J.; Jones, A."
                    onChange={(e) => handleChange('authors', e.target.value)}
                    aria-invalid={!!errors.authors}
                  />
                ) : (
                  <ReadOnlyInput value={form.authors} onUnlock={() => unlockField('authors')} />
                )}
                {errors.authors && <FieldError>{errors.authors}</FieldError>}
              </Field>

              <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
                <Field className="min-w-0">
                  <FieldLabel>Year</FieldLabel>
                  {unlockedFields.has('year') ? (
                    <Input
                      type="number"
                      min={1000}
                      max={9999}
                      value={form.year}
                      onChange={(e) => handleChange('year', e.target.value)}
                      aria-invalid={!!errors.year}
                    />
                  ) : (
                    <ReadOnlyInput value={form.year} onUnlock={() => unlockField('year')} />
                  )}
                  {errors.year && <FieldError>{errors.year}</FieldError>}
                </Field>

                <Field className="min-w-0">
                  <FieldLabel>Keywords</FieldLabel>
                  {unlockedFields.has('keywords') ? (
                    <Input
                      value={form.keywords}
                      placeholder="comma-separated"
                      onChange={(e) => handleChange('keywords', e.target.value)}
                      aria-invalid={!!errors.keywords}
                    />
                  ) : (
                    <ReadOnlyInput value={form.keywords} onUnlock={() => unlockField('keywords')} />
                  )}
                  {errors.keywords && <FieldError>{errors.keywords}</FieldError>}
                </Field>
              </div>

              <Field className="min-w-0">
                <FieldLabel>Synopsis</FieldLabel>
                {unlockedFields.has('synopsis') ? (
                  <Textarea
                    value={form.synopsis}
                    rows={4}
                    onChange={(e) => handleChange('synopsis', e.target.value)}
                    aria-invalid={!!errors.synopsis}
                  />
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
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
