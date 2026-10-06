import { Anchor } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from '@/components/ui/sidebar'
import { NAV, NAV_GROUPS } from '../nav'
import { useAdminStore } from '../store'

/**
 * Collapsible sidebar: full labels when expanded, icon-only with tooltips when
 * collapsed (desktop), slide-over sheet on mobile (handled by shadcn Sidebar).
 */
export function AppSidebar() {
  const [location] = useLocation()
  const unread = useAdminStore((s) => s.unreadInbox)
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" aria-label="Admin navigation">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Ray Diansyah — Admin">
              <Link href="/dashboard">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <Anchor className="size-4" aria-hidden />
                </span>
                <span className="grid text-left leading-tight">
                  <span className="truncate text-sm font-semibold">Ray Diansyah</span>
                  <span className="hud-label truncate text-[10px] text-muted-foreground">Admin</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.filter((n) => n.group === group).map((item) => {
                  const active = location === item.path || location.startsWith(`${item.path}/`)
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-10 data-[active=true]:font-semibold"
                      >
                        <Link
                          href={item.path}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => isMobile && setOpenMobile(false)}
                        >
                          <item.icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.path === '/inbox' && unread > 0 && (
                        <SidebarMenuBadge aria-label={`${unread} unread messages`}>{unread}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <p className="hud-label px-2 pb-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">Mock data · Supabase ready</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
