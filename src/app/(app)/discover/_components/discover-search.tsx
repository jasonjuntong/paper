'use client'

import { Search } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'

export function DiscoverSearch() {
  return (
    <InputGroup className="max-w-md">
      <InputGroupAddon>
        <InputGroupText>
          <Search />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder="Search orgs by name or keyword…"
      />
    </InputGroup>
  )
}
