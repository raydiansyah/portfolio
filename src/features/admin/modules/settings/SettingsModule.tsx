import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSettings } from '../../data/repo'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { GeneralTab } from './GeneralTab'
import { LegalTab } from './LegalTab'
import { PoliciesTab } from './PoliciesTab'

export default function SettingsModule() {
  const { data, error, reload, setData } = useResource(getSettings)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="System" title="Settings" description="Branding, legal entity details and public policies." />
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 p-4 text-sm">
          <span>Could not load settings: {error.message}</span>
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </div>
      ) : (
        <Tabs defaultValue="general" className="gap-6">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            <TabsTrigger value="policies">Terms &amp; Privacy</TabsTrigger>
          </TabsList>
          {data ? (
            <>
              {/* Each tab keeps its own draft; saving merges the returned row back. */}
              <TabsContent value="general" forceMount className="data-[state=inactive]:hidden"><GeneralTab settings={data} onSaved={setData} /></TabsContent>
              <TabsContent value="legal" forceMount className="data-[state=inactive]:hidden"><LegalTab settings={data} onSaved={setData} /></TabsContent>
              <TabsContent value="policies" forceMount className="data-[state=inactive]:hidden"><PoliciesTab settings={data} onSaved={setData} /></TabsContent>
            </>
          ) : (
            <div className="flex max-w-2xl flex-col gap-6" aria-busy="true" aria-label="Loading settings">
              <Skeleton className="h-[58px]" />
              <Skeleton className="h-[118px] rounded-lg" />
              <Skeleton className="h-[118px] rounded-lg" />
            </div>
          )}
        </Tabs>
      )}
    </div>
  )
}
