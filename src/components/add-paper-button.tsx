'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddPaperDialog } from '@/components/add-paper-dialog'

export function AddPaperButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Add paper
      </Button>
      <AddPaperDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
