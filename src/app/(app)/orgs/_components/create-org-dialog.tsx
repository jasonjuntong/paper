'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const NAME_MAX = 60
const MARK_MAX = 2
const DESCRIPTION_MAX = 280

const OrgSchema = z.object({
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

type Visibility = 'public' | 'private'
type JoinPolicy = 'open' | 'request' | 'invite'

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, MARK_MAX).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex h-8 w-full items-center gap-0.5 rounded-lg border border-input p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-full flex-1 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-40',
            value === o.value
              ? 'bg-pill text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [mark, setMark] = useState('')
  const [markOverridden, setMarkOverridden] = useState(false)
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('request')
  const [nameError, setNameError] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)
  const [descError, setDescError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) {
      setName('')
      setMark('')
      setMarkOverridden(false)
      setDescription('')
      setVisibility('public')
      setJoinPolicy('request')
      setNameError(null)
      setMarkError(null)
      setDescError(null)
      setSubmitError(null)
    }
    onOpenChange(next)
  }

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

  function handleVisibilityChange(v: Visibility) {
    setVisibility(v)
    if (v === 'private') setJoinPolicy('invite')
    else if (joinPolicy === 'invite') setJoinPolicy('request')
  }

  async function handleCreate() {
    const result = OrgSchema.safeParse({ name, mark, description })
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      setNameError(flat.name?.[0] ?? null)
      setMarkError(flat.mark?.[0] ?? null)
      setDescError(flat.description?.[0] ?? null)
      return
    }

    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.data.name,
          mark: result.data.mark,
          description: result.data.description,
          visibility,
          joinPolicy,
        }),
      })
      if (!res.ok) throw new Error('Failed to create org')

      const { orgId } = (await res.json()) as { orgId: string }

      setSubmitting(false)
      handleOpenChange(false)
      // Land the creator on their new org's detail page.
      router.push(`/orgs/${orgId}`)
      router.refresh()
    } catch {
      setSubmitting(false)
      setSubmitError('Something went wrong. Please try again.')
    }
  }

  const joinPolicyHint =
    joinPolicy === 'open'
      ? 'Anyone can join instantly.'
      : joinPolicy === 'request'
        ? 'You approve each member.'
        : 'Members join by invite only.'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new org</DialogTitle>
          <DialogDescription>
            Set up a research group. You&rsquo;ll be its first admin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name + Mark */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label
                htmlFor="org-name"
                className="font-mono text-xs font-normal text-muted-foreground"
              >
                NAME *
              </Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Diffusion Models Reading Group"
                maxLength={NAME_MAX}
                aria-invalid={!!nameError}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div className="flex w-16 shrink-0 flex-col gap-1.5">
              <Label
                htmlFor="org-mark"
                className="font-mono text-xs font-normal text-muted-foreground"
              >
                MARK *
              </Label>
              <Input
                id="org-mark"
                value={mark}
                onChange={(e) => handleMarkChange(e.target.value)}
                maxLength={MARK_MAX}
                placeholder="AB"
                aria-invalid={!!markError}
                className="text-center font-mono uppercase"
              />
              {markError && (
                <p className="text-xs text-destructive">{markError}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="org-desc"
              className="font-mono text-xs font-normal text-muted-foreground"
            >
              DESCRIPTION{' '}
              <span className="text-muted-foreground/50">(optional)</span>
            </Label>
            <Textarea
              id="org-desc"
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

          {/* Visibility + Joining */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="font-mono text-xs font-normal text-muted-foreground">
                VISIBILITY
              </Label>
              <Segmented<Visibility>
                value={visibility}
                onChange={handleVisibilityChange}
                options={[
                  { value: 'public', label: 'Public' },
                  { value: 'private', label: 'Private' },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {visibility === 'public'
                  ? 'Listed in Discover.'
                  : 'Hidden from Discover.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-mono text-xs font-normal text-muted-foreground">
                JOINING
              </Label>
              <Segmented<JoinPolicy>
                value={joinPolicy}
                onChange={setJoinPolicy}
                options={[
                  {
                    value: 'open',
                    label: 'open',
                    disabled: visibility === 'private',
                  },
                  {
                    value: 'request',
                    label: 'by request',
                    disabled: visibility === 'private',
                  },
                  {
                    value: 'invite',
                    label: 'invite-only',
                    disabled: visibility === 'public',
                  },
                ]}
              />
              <p className="text-xs text-muted-foreground">{joinPolicyHint}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {submitError ? (
            <p className="text-xs text-destructive">{submitError}</p>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Org'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
