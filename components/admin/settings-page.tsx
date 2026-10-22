'use client'

import { AlertTriangle, CheckCircle2, Download, RotateCcw, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { Panel } from '@/components/admin/widgets'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { SwitchField, TextField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { formatNumber } from '@/lib/format'
import { restoreSeedData, updateSettings } from '@/lib/store/actions'
import { useData } from '@/lib/store/hooks'
import { computeDelta, COLLECTIONS } from '@/lib/store/persistence'
import type { Settings } from '@/lib/types'
import { validateDataset, type DataIssue } from '@/lib/validate-data'

export function AdminSettingsPage() {
  const data = useData()
  const toast = useToast()
  const [v, setV] = useState<Settings>(data.settings)
  const [saved, setSaved] = useState(data.settings)
  const [pageSize, setPageSize] = useState(String(data.settings.pageSize))
  const [featured, setFeatured] = useState(String(data.settings.featuredLimit))
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<DataIssue[] | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Pick up changes made elsewhere (another tab, a restore).
  if (saved !== data.settings) {
    setSaved(data.settings)
    setV(data.settings)
    setPageSize(String(data.settings.pageSize))
    setFeatured(String(data.settings.featuredLimit))
  }

  const draft: Settings = { ...v, pageSize: Number(pageSize), featuredLimit: Number(featured) }
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings)

  const changed = useMemo(() => {
    const delta = computeDelta(data)
    let n = 0
    for (const k of COLLECTIONS) {
      const d = delta[k]
      if (d) n += Object.keys(d.upserts).length + d.deleted.length
    }
    return n + (delta.settings ? 1 : 0)
  }, [data])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const r = updateSettings(draft)
    if (!r.ok) return setError(r.error)
    setError(null)
    toast.success('Settings saved')
  }

  const snapshot = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `find-botswana-demo-snapshot-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Snapshot downloaded')
  }

  const errors = issues?.filter((i) => i.level === 'error') ?? []
  const warnings = issues?.filter((i) => i.level === 'warning') ?? []

  return (
    <>
      <AdminPageHeader title="Settings" description="Demo configuration. Every setting here changes how the public site and the owner workspace behave." />

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <form onSubmit={save} noValidate className="flex flex-col gap-6">
          <Panel title="Platform">
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField label="Site name" value={v.siteName} onChange={(e) => setV({ ...v, siteName: e.target.value })} />
                <TextField label="Contact email" type="email" value={v.contactEmail} onChange={(e) => setV({ ...v, contactEmail: e.target.value })} />
              </div>
              <TextField label="Tagline" value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField label="Items per page" inputMode="numeric" value={pageSize} onChange={(e) => setPageSize(e.target.value.replace(/\D/g, ''))} hint="6–48. Applies to every public directory." />
                <TextField label="Featured businesses on the home page" inputMode="numeric" value={featured} onChange={(e) => setFeatured(e.target.value.replace(/\D/g, ''))} hint="1–24." />
              </div>
            </div>
          </Panel>

          <Panel title="Behaviour">
            <div className="grid grid-cols-1 gap-5 divide-y divide-divider [&>*]:pt-5 first:[&>*]:pt-0">
              <SwitchField label="Require approval for new businesses" description="When on, registrations wait in the approval queue. When off, they are published immediately." checked={v.requireApproval} onChange={(requireApproval) => setV({ ...v, requireApproval })} />
              <SwitchField label="Show the demo banner" description="The “Fictional demo data” strip above the public header." checked={v.showDemoBanner} onChange={(showDemoBanner) => setV({ ...v, showDemoBanner })} />
              <SwitchField label="Show verified badges" description="Display the Verified mark on cards and profiles." checked={v.showVerifiedBadges} onChange={(showVerifiedBadges) => setV({ ...v, showVerifiedBadges })} />
              <SwitchField label="Allow enquiries" description="Turn off to hide every enquiry form and button across the public site." checked={v.allowEnquiries} onChange={(allowEnquiries) => setV({ ...v, allowEnquiries })} />
            </div>
          </Panel>

          {error && <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-xs font-medium text-danger">{error}</p>}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line-strong bg-white px-4 py-3">
            <p className="text-xs text-ink-muted" role="status">{dirty ? 'You have unsaved changes.' : 'Settings are up to date.'}</p>
            <div className="flex gap-2">
              <Button type="button" variant="soft" size="md" disabled={!dirty} onClick={() => { setV(data.settings); setPageSize(String(data.settings.pageSize)); setFeatured(String(data.settings.featuredLimit)); setError(null) }}>Discard</Button>
              <Button type="submit" variant="brand" size="md" disabled={!dirty}>Save settings</Button>
            </div>
          </div>
        </form>

        <div className="flex flex-col gap-6">
          <Panel title="Demo data" subtitle="Everything lives in this browser's localStorage">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ['Businesses', data.businesses.length],
                ['Products', data.products.length],
                ['Services', data.services.length],
                ['Categories', data.categories.length],
                ['Regions', data.regions.length],
                ['Towns', data.towns.length],
                ['Users', data.users.length],
                ['Enquiries', data.enquiries.length],
                ['Activity records', data.activities.length],
              ].map(([k, n]) => (
                <div key={k as string} className="flex items-center justify-between border-b border-divider pb-2">
                  <dt className="text-xs text-ink-muted">{k}</dt>
                  <dd className="font-semibold text-ink">{formatNumber(n as number)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-ink-muted"><span className="font-semibold text-ink">{formatNumber(changed)}</span> record{changed === 1 ? '' : 's'} differ from the original seed data.</p>
            <Button variant="soft" size="md" className="mt-4" onClick={snapshot}><Download /> Download snapshot (JSON)</Button>
          </Panel>

          <Panel title="Data integrity" subtitle="Checks references, duplicate IDs and slugs, coordinates and statuses">
            <Button variant="soft" size="md" onClick={() => setIssues(validateDataset(data))}><ShieldCheck /> Run integrity check</Button>
            {issues && (
              <div className="mt-4 text-sm" role="status">
                {errors.length === 0 ? (
                  <p className="flex items-center gap-2 font-medium text-brand"><CheckCircle2 className="size-4" /> No problems found{warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}.</p>
                ) : (
                  <p className="flex items-center gap-2 font-medium text-danger"><AlertTriangle className="size-4" /> {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning{warnings.length === 1 ? '' : 's'}</p>
                )}
                {[...errors, ...warnings].slice(0, 12).map((i, n) => (
                  <p key={n} className={`mt-2 text-xs ${i.level === 'error' ? 'text-danger' : 'text-warn'}`}>
                    <span className="font-semibold uppercase">{i.level}</span> [{i.area}] {i.message}
                  </p>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Restore seed data">
            <p className="text-xs leading-5 text-ink-muted">Discards every change made in this browser — new businesses, approvals, edits, deletions, enquiries and settings — and restores the original deterministic dataset.</p>
            <Button variant="danger" size="md" className="mt-4" onClick={() => { setConfirmText(''); setRestoring(true) }}><RotateCcw /> Restore seed data…</Button>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={restoring}
        onOpenChange={setRestoring}
        title="Restore the original seed data?"
        description="This cannot be undone. All demo changes in this browser will be lost."
        confirmLabel="Restore seed data"
        destructive
        confirmDisabled={confirmText.trim().toUpperCase() !== 'RESTORE'}
        onConfirm={() => {
          restoreSeedData()
          toast.success('Seed data restored — the original records are back')
        }}
      >
        <TextField label="Type RESTORE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
      </ConfirmDialog>
    </>
  )
}
