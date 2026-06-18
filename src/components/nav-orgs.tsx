'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2 } from 'lucide-react'

function FindOrCreateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export interface OrgNavItem {
  id: string
  name: string
}

interface NavOrgsProps {
  orgs: OrgNavItem[]
}

const itemClassName =
  'group/nav-btn gap-3 [&>svg]:size-5! hover:[&>svg]:size-[22px]! [&>svg]:transition-[width,height] [&>svg]:duration-200 [&>svg]:ease-out group-data-[collapsible=icon]:p-1.5! data-[active=true]:font-normal'

export function NavOrgs({ orgs }: NavOrgsProps) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Your Orgs
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {orgs.map((org) => {
            const href = `/orgs/${org.id}`
            return (
              <SidebarMenuItem key={org.id}>
                <SidebarMenuButton
                  asChild
                  tooltip={org.name}
                  isActive={pathname === href || pathname.startsWith(href + '/')}
                  className={itemClassName}
                >
                  <Link href={href}>
                    <Building2 />
                    <span>{org.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Find or create"
              isActive={pathname === '/orgs'}
              className={itemClassName}
            >
              <Link href="/orgs">
                <FindOrCreateIcon />
                <span>Find or create</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
