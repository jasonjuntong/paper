'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { applyActionCode } from 'firebase/auth'
import { CircleCheck, CircleX, Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailConfirm({ code }: { code: string }) {
  const [status, setStatus] = useState<Status>('verifying')
  // The verification link is single-use; React Strict Mode mounts effects twice
  // in dev, so guard against a second applyActionCode call consuming the code.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    applyActionCode(auth, code)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [code])

  if (status === 'verifying') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verifying your email</CardTitle>
          <CardDescription>Hang tight while we confirm your account</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-2">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (status === 'success') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CircleCheck className="mx-auto size-8 text-emerald-600" />
          <CardTitle className="text-xl">Email verified</CardTitle>
          <CardDescription>Your account is ready. Sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CircleX className="mx-auto size-8 text-destructive" />
        <CardTitle className="text-xl">Link expired or invalid</CardTitle>
        <CardDescription>
          This verification link is no longer valid. It may have expired or already been used.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Sign in to request a new verification email.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
