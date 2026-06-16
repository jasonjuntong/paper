'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeletePaperDialog } from './delete-paper-dialog'

interface PaperActionsProps {
  entryId: string
  title: string
}

export function PaperActions({ entryId, title }: PaperActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-lg gap-2 hover:bg-[oklch(0.9491_0.0041_91.616)]">
        <Pencil className="size-3.5" />
        Edit details
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg gap-2 text-[oklch(0.434_0.140_25deg)] hover:bg-[oklch(0.576_0.186_25deg)] hover:text-white hover:border-[oklch(0.576_0.186_25deg)]"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-3.5" />
        Delete paper
      </Button>

      <DeletePaperDialog
        entryId={entryId}
        title={title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
