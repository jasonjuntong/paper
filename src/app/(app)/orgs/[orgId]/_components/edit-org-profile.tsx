'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const NAME_MAX = 60
const MARK_MAX = 2
const DESCRIPTION_MAX = 280

const ProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(NAME_MAX, `Name must be ${NAME_MAX} characters or less`),
  mark: z
    .string()
    .trim()
    .min(1, 'Mark is required')
    .max(MARK_MAX, `Mark is ${MARK_MAX} letters max`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or less`),
})

// Derive a 1–2 letter mark from the name, matching the create dialog.
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, MARK_MAX).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function EditOrgProfile({
  orgId,
  initialName,
  initialMark,
  initialDescription,
}: {
  orgId: string
  initialName: string
  initialMark: string
  initialDescription: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [mark, setMark] = useState(initialMark)
  const [markOverridden, setMarkOverridden] = useState(false)
  const [description, setDescription] = useState(initialDescription)
  const [nameError, setNameError] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)
  const [descError, setDescError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Nothing to save until a field differs from what the server rendered.
  const dirty =
    name !== initialName || mark !== initialMark || description !== initialDescription

  function handleNameChange(val: string) {
    setName(val)
    // Auto-derive the mark from the name until the user edits it directly.
    if (!markOverridden) setMark(getInitials(val))
    if (nameError) setNameError(null)
  }

  function handleMarkChange(val: string) {
    setMark(val.toUpperCase().slice(0, MARK_MAX))
    setMarkOverridden(true)
    if (markError) setMarkError(null)
  }

  function handleDescriptionChange(val: string) {
    setDescription(val)
    if (descError) setDescError(null)
  }

  async function handleSave() {
    const result = ProfileSchema.safeParse({ name, mark, description })
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      setNameError(flat.name?.[0] ?? null)
      setMarkError(flat.mark?.[0] ?? null)
      setDescError(flat.description?.[0] ?? null)
      return
    }

    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.data.name,
          mark: result.data.mark.toUpperCase(),
          description: result.data.description,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        throw new Error(b?.error ?? 'Failed to save')
      }
      const data = (await res.json()) as {
        name: string
        mark: string
        description: string
      }
      // Reconcile with the authoritative values the server persisted.
      setName(data.name)
      setMark(data.mark)
      setDescription(data.description)
      setMarkOverridden(false)
      // Sync the server-rendered header (name, mark avatar, description).
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="gap-4 px-5 py-5 lg:col-span-2">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Profile
      </span>

      {/* Name + Mark */}
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label
            htmlFor="org-profile-name"
            className="font-mono text-xs font-normal text-muted-foreground"
          >
            NAME *
          </Label>
          <Input
            id="org-profile-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={NAME_MAX}
            aria-invalid={!!nameError}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        <div className="flex w-16 shrink-0 flex-col gap-1.5">
          <Label
            htmlFor="org-profile-mark"
            className="font-mono text-xs font-normal text-muted-foreground"
          >
            MARK *
          </Label>
          <Input
            id="org-profile-mark"
            value={mark}
            onChange={(e) => handleMarkChange(e.target.value)}
            maxLength={MARK_MAX}
            aria-invalid={!!markError}
            className="text-center font-mono uppercase"
          />
          {markError && <p className="text-xs text-destructive">{markError}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="org-profile-desc"
          className="font-mono text-xs font-normal text-muted-foreground"
        >
          DESCRIPTION{' '}
          <span className="text-muted-foreground/50">(optional)</span>
        </Label>
        <Textarea
          id="org-profile-desc"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="What does this org read and discuss? One or two sentences."
          rows={3}
          maxLength={DESCRIPTION_MAX}
          aria-invalid={!!descError}
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {descError ?? 'Shown on the org page and in Discover.'}
          </p>
          <span
            className={cn(
              'shrink-0 font-mono text-xs tabular-nums',
              descError ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {saveError ? (
          <p className="text-xs text-destructive">{saveError}</p>
        ) : (
          <span />
        )}
        <Button onClick={handleSave} disabled={saving || !dirty} className="w-fit">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Card>
  )
}
