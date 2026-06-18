'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateOrgDialog } from './create-org-dialog'

export function CreateOrgButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Create org
      </Button>
      <CreateOrgDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
