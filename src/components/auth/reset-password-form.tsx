'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { CircleX, Eye, EyeOff, Loader2 } from 'lucide-react'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

type FieldErrors = Partial<Record<'password' | 'confirm', string[]>>
// verifying → the mount check; ready → show the form; submitting → in flight;
// invalid → the code was expired/used/malformed (surfaced on mount or submit).
type Status = 'verifying' | 'ready' | 'submitting' | 'invalid'

export function ResetPasswordForm({ code }: { code: string }) {
  const [status, setStatus] = useState<Status>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // The oobCode is single-use; guard against React Strict Mode's double effect
  // mount consuming/duplicating the check (mirrors verify-email-confirm.tsx).
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true

    verifyPasswordResetCode(auth, code)
      .then(() => setStatus('ready'))
      .catch(() => setStatus('invalid'))
  }, [code])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})

    const result = passwordResetSchema.safeParse({ password, confirm })
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors)
      return
    }

    setStatus('submitting')
    try {
      await confirmPasswordReset(auth, code, result.data.password)
      // Password changed — send them to sign in with the new credentials.
      window.location.href = '/login'
    } catch {
      // The code was valid on mount but is now consumed/expired.
      setStatus('invalid')
    }
  }

  if (status === 'verifying') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Checking your link</CardTitle>
          <CardDescription>Hang tight while we verify your reset link</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-2">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (status === 'invalid') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CircleX className="mx-auto size-8 text-destructive" />
          <CardTitle className="text-xl">Link expired or invalid</CardTitle>
          <CardDescription>
            This reset link is no longer valid. It may have expired or already been used.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Request a new link to reset your password.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Enter and confirm your new password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.password?.length}>
              <FieldLabel htmlFor="password">New password</FieldLabel>
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

            <Field data-invalid={!!fieldErrors.confirm?.length}>
              <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!fieldErrors.confirm?.length}
              />
              <FieldError>{fieldErrors.confirm?.[0]}</FieldError>
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            disabled={status === 'submitting'}
            aria-busy={status === 'submitting'}
            className="w-full"
          >
            {status === 'submitting' && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {status === 'submitting' ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
