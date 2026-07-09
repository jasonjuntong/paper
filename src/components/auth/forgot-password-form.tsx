'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string[] }>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})

    const result = schema.safeParse({ email })
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors)
      return
    }

    setStatus('loading')
    try {
      // The route always responds `{ ok: true }` (enumeration protection), so we
      // don't branch on the result — reaching here at all means "sent".
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Swallow network errors too — never reveal whether an email is registered.
    }
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="text-foreground font-medium">{email}</span>, a
          reset link is on its way.
        </p>
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FieldGroup>
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
      </FieldGroup>

      <Button
        type="submit"
        disabled={status === 'loading'}
        aria-busy={status === 'loading'}
        className="w-full"
      >
        {status === 'loading' && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {status === 'loading' ? 'Sending…' : 'Send reset link'}
      </Button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </form>
  )
}
