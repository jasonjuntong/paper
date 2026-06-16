'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, House, Library, Plus, Search } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { UploadPaperDialog } from '@/components/upload-paper-dialog'

function AddPaperIcon() {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full transition-[width,height] duration-200 ease-out group-hover/nav-btn:size-[22px]"
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
  { title: 'Discover', href: '/discover', icon: Compass },
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
      <UploadPaperDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </SidebarGroup>
  )
}
