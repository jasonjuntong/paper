'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PdfReaderDialog } from './pdf-reader-dialog'

interface ReadButtonProps {
  paperId: string
  title: string
}

export function ReadButton({ paperId, title }: ReadButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <BookOpen className="size-4" />
        Read paper
      </Button>
      <PdfReaderDialog paperId={paperId} title={title} open={open} onOpenChange={setOpen} />
    </>
  )
}
