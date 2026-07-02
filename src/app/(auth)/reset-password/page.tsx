import type { Metadata } from 'next'
import Link from 'next/link'
import { CircleX } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = { title: 'Reset password — Scolar' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  // Arriving from the reset email link (?code=<oobCode>) — let the form verify
  // and consume it. Without a code there's nothing to reset.
  if (code) {
    return <ResetPasswordForm code={code} />
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CircleX className="mx-auto size-8 text-destructive" />
        <CardTitle className="text-xl">Invalid reset link</CardTitle>
        <CardDescription>
          This password reset link is missing or malformed.
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
