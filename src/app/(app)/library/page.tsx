'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadPaperDialog } from '@/components/upload-paper-dialog'

export default function LibraryPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Library</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload />
          Upload paper
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 lg:px-6">
        <p className="text-sm text-muted-foreground">
          Your library is empty. Upload a paper to get started.
        </p>
      </div>

      <UploadPaperDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
