'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Library, Plus, Search } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { AddPaperDialog } from '@/components/add-paper-dialog'

function OrgsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  )
}

function AddPaperIcon() {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full transition-[width,height] duration-200 ease-out group-hover/nav-btn:size-5.5"
      style={{ background: 'oklch(0.918 0.004 106.937)' }}
    >
      <Plus />
    </span>
  )
}

const itemClassName =
  'group/nav-btn gap-3 [&>svg]:size-5! hover:[&>svg]:size-[22px]! [&>svg]:transition-[width,height] [&>svg]:duration-200 [&>svg]:ease-out group-data-[collapsible=icon]:p-1.5! data-[active=true]:font-normal'

const items = [
  { title: 'Home', href: '/', icon: House },
  { title: 'Library', href: '/library', icon: Library },
  { title: 'Idea Search', href: '/idea-search', icon: Search },
  { title: 'Orgs', href: '/orgs', icon: OrgsIcon },
]

export function NavMain() {
  const pathname = usePathname()
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-0.5">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Add paper"
              onClick={() => setUploadOpen(true)}
              className={itemClassName}
            >
              <AddPaperIcon />
              <span>Add paper</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                className={itemClassName}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
      <AddPaperDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </SidebarGroup>
  )
}
