'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CircleAlert, CircleCheck, CircleX, Eye, EyeOff, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { RESERVED_HANDLES, handleSchema, normalizeHandle } from '@/lib/handles'
import { checkHandleAvailability } from '@/lib/handles.client'
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  handle: handleSchema,
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FieldKey = 'name' | 'handle' | 'email' | 'password'
type FieldErrors = Partial<Record<FieldKey, string[]>>
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  // Short-lived, in-memory cache (normalized handle → available?) so retyping a
  // handle we already looked up this session doesn't re-hit Firestore. Kept as
  // state (not a ref) so a completed lookup re-renders and can be read during
  // render; not persisted — cleared on refresh/navigation.
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, boolean>>({})
  // The normalized handle whose last availability check failed (network/rules).
  // Cleared implicitly when the handle changes (the derived status recomputes).
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const trimmedHandle = handle.trim()
  const handleKey = normalizeHandle(trimmedHandle)
  // Reserved handles fail the schema, so check them separately to show the
  // unavailable icon live — and never query Firestore for one (no /handles doc
  // exists for it, which would otherwise read as "available").
  const isReserved = trimmedHandle !== '' && RESERVED_HANDLES.has(handleKey)
  const handleFormatValid =
    trimmedHandle !== '' && handleSchema.safeParse(trimmedHandle).success

  // Live "handle available?" feedback. Only queries once the format is valid
  // (format errors surface on submit); debounced, guarded against stale
  // responses, and skipped entirely when the handle is already cached. This is
  // UX only — the server transaction is authoritative.
  useEffect(() => {
    if (!handleFormatValid || handleKey in availabilityCache) return

    let active = true
    const timer = setTimeout(async () => {
      try {
        const free = await checkHandleAvailability(trimmedHandle)
        if (active) setAvailabilityCache((prev) => ({ ...prev, [handleKey]: free }))
      } catch (err) {
        // Surface instead of spinning forever. Most likely the `/handles`
        // read rule isn't deployed (firebase deploy --only firestore:rules).
        console.error('[handle-availability] check failed:', err)
        if (active) setErrorKey(handleKey)
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [trimmedHandle, handleKey, handleFormatValid, availabilityCache])

  // Derived (not effect-set) so the effect never updates state synchronously.
  const cachedFree = handleFormatValid ? availabilityCache[handleKey] : undefined
  const availability: Availability = isReserved
    ? 'taken'
    : !handleFormatValid
      ? 'idle'
      : cachedFree !== undefined
        ? cachedFree
          ? 'available'
          : 'taken'
        : errorKey === handleKey
          ? 'error'
          : 'checking'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError('')

    const result = schema.safeParse({ name, handle, email, password })
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors)
      return
    }

    setStatus('loading')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })

      if (res.ok) {
        // Genuine registration AND duplicate email land here identically — the
        // server never reveals whether the email already exists.
        window.location.href = '/verify-email'
        return
      }

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        fieldErrors?: FieldErrors
      }

      if (res.status === 409 && data.error === 'handle_taken') {
        setFieldErrors({ handle: ['This handle is already taken'] })
      } else if (res.status === 400 && data.error === 'validation') {
        setFieldErrors(data.fieldErrors ?? {})
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
      setStatus('error')
    } catch {
      setGeneralError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {generalError && <FieldError role="alert">{generalError}</FieldError>}

      <FieldGroup>
        <Field data-invalid={!!fieldErrors.name?.length}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!fieldErrors.name?.length}
          />
          <FieldError>{fieldErrors.name?.[0]}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.handle?.length}>
          <FieldLabel htmlFor="handle">Handle</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">@</InputGroupAddon>
            <InputGroupInput
              id="handle"
              type="text"
              placeholder="yourhandle"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              aria-invalid={!!fieldErrors.handle?.length}
            />
            {availability === 'checking' ? (
              <InputGroupAddon align="inline-end">
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking availability" />
              </InputGroupAddon>
            ) : availability === 'available' ? (
              <InputGroupAddon align="inline-end">
                <CircleCheck className="size-4 text-emerald-600" aria-label="Handle available" />
              </InputGroupAddon>
            ) : availability === 'taken' ? (
              <InputGroupAddon align="inline-end">
                <CircleX className="size-4 text-destructive" aria-label="Handle already taken" />
              </InputGroupAddon>
            ) : availability === 'error' ? (
              <InputGroupAddon align="inline-end">
                <CircleAlert className="size-4 text-muted-foreground" aria-label="Couldn't check availability" />
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <FieldError>{fieldErrors.handle?.[0]}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.email?.length}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email?.length}
          />
          <FieldError>{fieldErrors.email?.[0]}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.password?.length}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <InputGroup className="overflow-hidden">
            <InputGroupInput
              id="password"
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
      </FieldGroup>

      <Button type="submit" disabled={status === 'loading'} className="w-full">
        {status === 'loading' && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {status === 'loading' ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
