import type { Session } from '@supabase/supabase-js'
import { Suspense, lazy, useEffect } from 'react'
import { Redirect, Route, Router, Switch } from 'wouter'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminHeader } from './layout/AdminHeader'
import { AppSidebar } from './layout/AppSidebar'
import { BASE } from './nav'
import { useAdminStore } from './store'
import { PageSkeleton } from './ui/PageSkeleton'

// One chunk per module: opening Inbox never downloads the PDF tooling of Slides, etc.
const Dashboard = lazy(() => import('./modules/dashboard/DashboardModule'))
const Profile = lazy(() => import('./modules/profile/ProfileModule'))
const Settings = lazy(() => import('./modules/settings/SettingsModule'))
const Portfolio = lazy(() => import('./modules/portfolio/PortfolioModule'))
const Services = lazy(() => import('./modules/services/ServicesModule'))
const Inbox = lazy(() => import('./modules/inbox/InboxModule'))
const Skills = lazy(() => import('./modules/skills/SkillsModule'))
const Site = lazy(() => import('./modules/site/SiteModule'))
const Slides = lazy(() => import('./modules/slides/SlidesModule'))

/** Signed-in admin shell: collapsible sidebar + header + lazily loaded module routes under /secure. */
export default function AdminApp({ session }: { session: Session }) {
  const refresh = useAdminStore((s) => s.refresh)
  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <Router base={BASE}>
      <TooltipProvider delayDuration={200}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AdminHeader session={session} />
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
              <Suspense fallback={<PageSkeleton />}>
                <Switch>
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/profile" component={Profile} />
                  <Route path="/settings" component={Settings} />
                  <Route path="/portfolio" component={Portfolio} />
                  <Route path="/services" component={Services} />
                  <Route path="/inbox" component={Inbox} />
                  <Route path="/skills" component={Skills} />
                  <Route path="/site" component={Site} />
                  <Route path="/slides" component={Slides} />
                  <Route>
                    <Redirect to="/dashboard" replace />
                  </Route>
                </Switch>
              </Suspense>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </Router>
  )
}
