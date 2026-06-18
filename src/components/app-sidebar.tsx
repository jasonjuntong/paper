import type { DecodedIdToken } from 'firebase-admin/auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/nav-main'
import { NavOrgs, type OrgNavItem } from '@/components/nav-orgs'
import { NavUser } from '@/components/nav-user'

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: DecodedIdToken
  orgs: OrgNavItem[]
}

export function AppSidebar({ user, orgs, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <span className="group-data-[collapsible=icon]:hidden px-2 font-serif text-xl font-semibold">Scolar</span>
            <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavOrgs orgs={orgs} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email }} />
      </SidebarFooter>
    </Sidebar>
  )
}
