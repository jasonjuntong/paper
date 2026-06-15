'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadPaperDialog } from '@/components/upload-paper-dialog'

export function UploadButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Add paper
      </Button>
      <UploadPaperDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
