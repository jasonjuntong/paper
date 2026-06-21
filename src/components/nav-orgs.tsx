'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { OrgMark } from '@/components/org-mark'

export interface OrgNavItem {
  id: string
  name: string
  mark: string
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
                    <OrgMark
                      data-org-mark
                      name={org.name}
                      mark={org.mark}
                      className="transition-[width,height] duration-200 ease-out group-hover/nav-btn:size-5.5"
                    />
                    <span>{org.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="More"
              isActive={false}
              className={itemClassName}
            >
              <Link href="/orgs">
                <MoreHorizontal />
                <span>More</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
