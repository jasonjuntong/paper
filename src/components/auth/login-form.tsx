'use client'

import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { auth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FieldErrors = Partial<Record<'email' | 'password', string[]>>
type Status = 'idle' | 'loading' | 'error' | 'unverified'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')

  function handleTogglePassword() {
    // Autofill bypasses onChange, so read the real DOM values before re-rendering.
    const emailEl = document.getElementById('email') as HTMLInputElement | null
    const passwordEl = document.getElementById('password') as HTMLInputElement | null
    if (emailEl) setEmail(emailEl.value)
    if (passwordEl) setPassword(passwordEl.value)
    setShowPassword((v) => !v)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError('')

    const result = schema.safeParse({ email, password })
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors)
      return
    }

    setStatus('loading')

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)

      if (!credential.user.emailVerified) {
        await signOut(auth)
        setStatus('unverified')
        return
      }

      const idToken = await credential.user.getIdToken()
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) throw new Error('session_error')

      window.location.href = '/'
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        setGeneralError('Incorrect email or password.')
      } else if (code === 'auth/too-many-requests') {
        setGeneralError('Too many attempts. Please try again later.')
      } else if (code === 'auth/user-disabled') {
        setGeneralError('This account has been disabled.')
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
      setStatus('error')
    }
  }

  if (status === 'unverified') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Your email hasn't been verified yet. Check your inbox for the link we sent when you
          signed up.
        </p>
        <Button variant="ghost" className="self-start px-0" onClick={() => setStatus('idle')}>
          ← Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {generalError && <FieldError role="alert">{generalError}</FieldError>}

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

        <Field data-invalid={!!fieldErrors.password?.length}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <InputGroup className="overflow-hidden">
            <InputGroupInput
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password?.length}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={handleTogglePassword}
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
        {status === 'loading' ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
