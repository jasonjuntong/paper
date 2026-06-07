'use client'

import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { auth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string[]>>

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError('')

    const result = schema.safeParse({ name, email, password })
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors)
      return
    }

    setStatus('loading')

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: name })
      await sendEmailVerification(credential.user, {
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/login`,
      })
      window.location.href = '/verify-email'
    } catch (err: unknown) {
      const code = (err as { code?: string }).code

      if (code === 'auth/email-already-in-use') {
        // Suppress — identical UX to success to prevent enumeration
        window.location.href = '/verify-email'
        return
      }

      if (code === 'auth/weak-password') {
        setFieldErrors({ password: ['Password must be at least 8 characters'] })
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
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
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!fieldErrors.password?.length}
          />
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
