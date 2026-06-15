'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Library, Plus, Search } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

function AddPaperIcon() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full" style={{ background: 'oklch(0.9180 0.0040 106.937)' }}>
      <Plus />
    </span>
  )
}

const items = [
  { title: 'Add paper', href: '/add', icon: AddPaperIcon },
  { title: 'Library', href: '/library', icon: Library },
  { title: 'Idea Search', href: '/search', icon: Search },
  { title: 'Discover', href: '/discover', icon: Compass },
]

export function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-0.5">
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                className="gap-3 [&>svg]:size-5! hover:[&>svg]:size-[22px]! [&>svg]:transition-[width,height] [&>svg]:duration-200 [&>svg]:ease-out group-data-[collapsible=icon]:p-1.5! data-[active=true]:font-normal"
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
    </SidebarGroup>
  )
}
