'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const NAME_MAX = 60
const DESCRIPTION_MAX = 280

const OrgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(NAME_MAX, `Name must be ${NAME_MAX} characters or less`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or less`),
})

type Visibility = 'public' | 'private'
type JoinPolicy = 'open' | 'request' | 'invite'

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
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('request')
  const [nameError, setNameError] = useState<string | null>(null)
  const [descError, setDescError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) {
      setName('')
      setDescription('')
      setVisibility('public')
      setJoinPolicy('request')
      setNameError(null)
      setDescError(null)
      setSubmitError(null)
    }
    onOpenChange(next)
  }

  function handleNameChange(val: string) {
    setName(val)
    if (nameError) setNameError(null)
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
    const result = OrgSchema.safeParse({ name, description })
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      setNameError(flat.name?.[0] ?? null)
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
          description: result.data.description,
          visibility,
          joinPolicy,
        }),
      })
      if (!res.ok) throw new Error('Failed to create org')

      setSubmitting(false)
      handleOpenChange(false)
      // The org detail route (/orgs/[orgId]) does not exist yet; send the
      // creator to their orgs list and refresh so the new org shows up.
      router.push('/orgs')
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
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
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
                    label: 'Open',
                    disabled: visibility === 'private',
                  },
                  {
                    value: 'request',
                    label: 'By request',
                    disabled: visibility === 'private',
                  },
                  {
                    value: 'invite',
                    label: 'Invite-only',
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
              {submitting ? 'Creating…' : 'Create org'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
