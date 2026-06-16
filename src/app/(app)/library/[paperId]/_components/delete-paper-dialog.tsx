'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Step = 'confirm' | 'deleting' | 'done'

interface DeletePaperDialogProps {
  entryId: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePaperDialog({
  entryId,
  title,
  open,
  onOpenChange,
}: DeletePaperDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('confirm')

  async function handleDelete() {
    setStep('deleting')
    try {
      const res = await fetch('/api/papers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      })
      if (!res.ok) throw new Error('Failed')
      setStep('done')
      setTimeout(() => {
        router.push('/library')
        router.refresh()
      }, 900)
    } catch {
      setStep('confirm')
    }
  }

  const busy = step === 'deleting' || step === 'done'

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={busy ? (e) => e.preventDefault() : undefined}
      >
        {step === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CircleCheck className="size-6 text-foreground/60" />
            </div>
            <p className="text-sm font-medium">Removed from library</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Remove from library</DialogTitle>
              <DialogDescription>
                This removes{' '}
                <span className="font-medium text-foreground">{title}</span> from your library. If
                the same PDF was uploaded by someone else, their copy is unaffected.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={step === 'deleting'}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={step === 'deleting'}
                className="gap-2 bg-[oklch(0.576_0.186_25deg)] text-white hover:bg-[oklch(0.434_0.140_25deg)] border-transparent"
              >
                {step === 'deleting' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {step === 'deleting' ? 'Removing…' : 'Remove'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
