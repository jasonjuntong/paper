'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'
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
  paper: PaperMetadata
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPaperDialog({ paper, open, onOpenChange }: EditPaperDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    title: paper.title,
    authors: paper.authors,
    year: String(paper.year),
    keywords: paper.keywords,
    synopsis: paper.synopsis,
  })
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
      setErrors({})
    }
    onOpenChange(next)
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
        body: JSON.stringify({ paperId: paper.paperId, ...result.data }),
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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
            <DialogDescription>
              Update the metadata for this paper. All fields are required.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                aria-invalid={!!errors.title}
              />
              {errors.title && <FieldError>{errors.title}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Authors</FieldLabel>
              <Input
                value={form.authors}
                placeholder="e.g. Smith, J.; Jones, A."
                onChange={(e) => handleChange('authors', e.target.value)}
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
                  onChange={(e) => handleChange('year', e.target.value)}
                  aria-invalid={!!errors.year}
                />
                {errors.year && <FieldError>{errors.year}</FieldError>}
              </Field>

              <Field>
                <FieldLabel>Keywords</FieldLabel>
                <Input
                  value={form.keywords}
                  placeholder="comma-separated"
                  onChange={(e) => handleChange('keywords', e.target.value)}
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
                onChange={(e) => handleChange('synopsis', e.target.value)}
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
