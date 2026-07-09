'use client'

import { useState, type FormEvent } from 'react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { Check, Eye, EyeOff, Loader2, TriangleAlert, X } from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { passwordResetSchema } from '@/lib/password'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'

interface SettingsClientProps {
  initial: {
    name: string
    handle: string
    email: string
    notificationEmail: boolean
  }
}

export function SettingsClient({ initial }: SettingsClientProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 px-4 lg:grid-cols-2 lg:px-6">
      <div className="flex flex-col gap-6">
        <ProfileSection initial={initial} />
        <NotificationsSection initial={initial.notificationEmail} />
      </div>
      <div className="flex flex-col gap-6">
        <ChangePasswordSection />
        <DangerZoneSection />
      </div>
    </div>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────
function ProfileSection({ initial }: SettingsClientProps) {
  const [savedName, setSavedName] = useState(initial.name)
  const [name, setName] = useState(initial.name)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  const dirty = name.trim() !== savedName.trim()

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    setStatus('saving')
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error('save failed')
      setSavedName(name.trim())
      setStatus('saved')
    } catch {
      setStatus('error')
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your display name, handle, and email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (status !== 'idle') setStatus('idle')
                }}
                aria-invalid={!!error}
              />
              <FieldError>{error}</FieldError>
            </Field>

            <Field data-disabled>
              <FieldLabel htmlFor="handle">Handle</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">@</InputGroupAddon>
                <InputGroupInput id="handle" value={initial.handle} disabled readOnly />
              </InputGroup>
              <FieldDescription>Your handle can&apos;t be changed.</FieldDescription>
            </Field>

            <Field data-disabled>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" value={initial.email} disabled readOnly />
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!dirty || status === 'saving'}>
              {status === 'saving' && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {status === 'saving' ? 'Saving…' : 'Save changes'}
            </Button>
            {status === 'saved' && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="size-4 text-emerald-600" />
                Saved
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Notifications ────────────────────────────────────────────────────────────
function NotificationsSection({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle(next: boolean) {
    setError('')
    setEnabled(next) // optimistic
    setPending(true)
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationEmail: next }),
      })
      if (!res.ok) throw new Error('update failed')
    } catch {
      setEnabled(!next) // revert
      setError("We couldn't update your preference. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose whether high-priority events also reach you by email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="notification-email">Email notifications</FieldLabel>
            <FieldDescription>
              In-app notifications stay on regardless of this setting.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="notification-email"
            className="self-center"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={pending}
          />
        </Field>
        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border px-3 py-2 text-sm bg-[oklch(0.907_0.079_85.1deg)] text-[oklch(0.44_0.097_67.3deg)] border-[oklch(0.44_0.097_67.3deg)] ring-[oklch(0.44_0.097_67.3deg)]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setError('')}
              className="shrink-0 transition-opacity hover:opacity-70"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Change password ───────────────────────────────────────────────────────────
type PwFieldErrors = Partial<Record<'current' | 'password' | 'confirm', string[]>>

function ChangePasswordSection() {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [fieldErrors, setFieldErrors] = useState<PwFieldErrors>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})

    const errors: PwFieldErrors = {}
    if (!current) errors.current = ['Enter your current password']
    const result = passwordResetSchema.safeParse({ password, confirm })
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors
      if (fe.password) errors.password = fe.password
      if (fe.confirm) errors.confirm = fe.confirm
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const user = auth.currentUser
    if (!user || !user.email) {
      setFieldErrors({ current: ['Your session has expired. Please sign in again.'] })
      return
    }

    setStatus('submitting')
    try {
      // Client-side re-auth is required before Firebase allows a password change.
      const credential = EmailAuthProvider.credential(user.email, current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, password)
      setStatus('done')
      setCurrent('')
      setPassword('')
      setConfirm('')
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setFieldErrors({ current: ['Current password is incorrect'] })
      } else if (code === 'auth/too-many-requests') {
        setFieldErrors({ current: ['Too many attempts. Please try again later.'] })
      } else {
        setFieldErrors({ current: ['Something went wrong. Please try again.'] })
      }
      setStatus('idle')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          You&apos;ll need your current password to set a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.current?.length}>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input
                id="current-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value)
                  if (status === 'done') setStatus('idle')
                }}
                aria-invalid={!!fieldErrors.current?.length}
              />
              <FieldError>{fieldErrors.current?.[0]}</FieldError>
            </Field>

            <Field data-invalid={!!fieldErrors.password?.length}>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <InputGroup className="overflow-hidden">
                <InputGroupInput
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.password?.length}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{fieldErrors.password?.[0]}</FieldError>
            </Field>

            <Field data-invalid={!!fieldErrors.confirm?.length}>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!fieldErrors.confirm?.length}
              />
              <FieldError>{fieldErrors.confirm?.[0]}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {status === 'submitting' ? 'Updating…' : 'Update password'}
            </Button>
            {status === 'done' && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="size-4 text-emerald-600" />
                Password updated
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Danger zone ───────────────────────────────────────────────────────────────
function DangerZoneSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>Permanently delete your account and all its data.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          disabled
          className="text-[oklch(0.434_0.140_25deg)] hover:bg-[oklch(0.576_0.186_25deg)] hover:border-[oklch(0.576_0.186_25deg)] hover:text-white"
        >
          Delete account
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </CardContent>
    </Card>
  )
}
