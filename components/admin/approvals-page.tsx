'use client'

import { AlertTriangle, Check, CheckCircle2, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { useBusinessActions } from '@/components/admin/business-actions'
import { Panel } from '@/components/admin/widgets'
import { MapView } from '@/components/map/map-loader'
import { BizLogo } from '@/components/ui/art'
import { AvailabilityBadge, Badge, LifecycleBadge, PublicationBadge, ServiceAvailabilityBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { formatDate, formatDateTime, formatHoursRange, DAYS, productPriceLabel, servicePriceLabel, timeAgo } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { businessLifecycle, completenessChecklist, isInApprovalQueue, listingCompleteness } from '@/lib/rules'
import { useIndex } from '@/lib/store/hooks'
import { businessCategories, locationLabel } from '@/lib/store/indexes'
import { referenceTime } from '@/lib/store/stats'
import type { Business } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { view: 'pending', id: '' }
const VIEWS = [
  { id: 'pending', label: 'Pending' },
  { id: 'changes', label: 'Changes requested' },
  { id: 'rejected', label: 'Rejected' },
] as const

function inView(b: Business, view: string) {
  if (view === 'changes') return b.approvalStatus === 'changes_requested'
  if (view === 'rejected') return b.approvalStatus === 'rejected'
  return isInApprovalQueue(b)
}

export function AdminApprovalsPage() {
  const idx = useIndex()
  const { value, set } = useQueryState(PARAMS)
  const view = VIEWS.some((v) => v.id === value.view) ? value.view : 'pending'
  const ref = referenceTime(idx.data)

  const lists = useMemo(() => {
    const sortBy = (a: Business, b: Business) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt)
    return {
      pending: idx.data.businesses.filter((b) => inView(b, 'pending')).sort(sortBy),
      changes: idx.data.businesses.filter((b) => inView(b, 'changes')).sort(sortBy),
      rejected: idx.data.businesses.filter((b) => inView(b, 'rejected')).sort(sortBy),
    }
  }, [idx])
  const list = lists[view as keyof typeof lists]
  const selected = list.find((b) => b.id === value.id) ?? list[0]

  const { open, element } = useBusinessActions({
    onDecided: (b) => {
      // Move on to the next submission in the same view.
      const i = list.findIndex((x) => x.id === b.id)
      const next = list[i + 1] ?? list[i - 1]
      set({ id: next && next.id !== b.id ? next.id : '' })
    },
  })

  return (
    <>
      <AdminPageHeader title="Approvals" description="Review submitted businesses. Each decision is recorded in the activity history." />

      <div role="tablist" aria-label="Approval queues" className="mt-6 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => set({ view: v.id === 'pending' ? '' : v.id, id: '' })} className={cn('rounded-full border px-4 py-2 text-xs font-semibold transition', view === v.id ? 'border-brand bg-brand text-white' : 'border-[#d7dfd7] bg-white text-ink-muted hover:border-brand hover:text-brand')}>
            {v.label} <span className={view === v.id ? 'text-white/80' : 'text-ink-faint'}>{lists[v.id as keyof typeof lists].length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<CheckCircle2 className="size-5" />} title={view === 'pending' ? 'The approval queue is empty' : 'Nothing here'}>
            {view === 'pending' ? 'New business registrations will appear here for review. Try registering one from the public site.' : 'No businesses are in this state right now.'}
            <span className="mt-4 block">
              <Link href="/business/register" className={buttonVariants({ variant: 'soft', size: 'md' })}>Register a test business</Link>
            </span>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside aria-label="Submissions" className="self-start overflow-hidden rounded-xl border border-line-strong bg-white lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto">
            <ul className="divide-y divide-divider">
              {list.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => set({ id: b.id })} aria-current={selected?.id === b.id} className={cn('flex w-full items-start gap-3 px-4 py-3.5 text-left transition', selected?.id === b.id ? 'bg-mint' : 'hover:bg-hover-row')}>
                    <BizLogo business={b} className="size-9 rounded-lg text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{b.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">{idx.townById.get(b.townId)?.name} · {businessCategories(idx, b)[0]?.name}</span>
                      <span className="mt-1 block text-[10px] text-ink-faint">Submitted {timeAgo(b.submittedAt ?? b.createdAt, ref)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {selected && <ReviewPanel key={selected.id} business={selected} onApprove={() => open('approve', selected)} onChanges={() => open('changes', selected)} onReject={() => open('reject', selected)} />}
        </div>
      )}
      {element}
    </>
  )
}

function ReviewPanel({ business: b, onApprove, onChanges, onReject }: { business: Business; onApprove: () => void; onChanges: () => void; onReject: () => void }) {
  const idx = useIndex()
  const products = idx.productsByBusiness.get(b.id) ?? []
  const services = idx.servicesByBusiness.get(b.id) ?? []
  const lc = businessLifecycle(b)
  const cats = businessCategories(idx, b)
  const completeness = listingCompleteness(b, products.length, services.length)
  const owner = b.ownerUserId ? idx.userById.get(b.ownerUserId) : undefined

  const duplicates = idx.data.businesses.filter((o) => o.id !== b.id && (normalize(o.name) === normalize(b.name) || o.phone.replace(/\s/g, '') === b.phone.replace(/\s/g, '') || o.email.toLowerCase() === b.email.toLowerCase()))
  const checks = [
    { label: 'Contact details present', ok: !!b.phone && !!b.email },
    { label: 'Description is detailed (80+ characters)', ok: b.description.length >= 80 },
    { label: 'Catalogue has at least one product or service', ok: products.length + services.length > 0 },
    { label: 'Category and location are set', ok: b.categoryIds.length > 0 && !!b.townId },
    { label: 'No duplicate name, phone or email', ok: duplicates.length === 0 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-line-strong p-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div className="flex items-start gap-4">
            <BizLogo business={b} className="size-12 rounded-xl" />
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-forest">{b.name}</h3>
              <p className="mt-1 text-xs text-ink-muted">
                {cats.map((c) => c.name).join(' · ')} · {locationLabel(idx, b.regionId, b.townId)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <LifecycleBadge status={lc} />
                <Badge tone="gray">{b.id}</Badge>
                <span className="text-[11px] text-ink-faint">Submitted {formatDateTime(b.submittedAt ?? b.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="brand" size="md" onClick={onApprove}><Check /> Approve</Button>
            {lc === 'pending' && <Button variant="soft" size="md" onClick={onChanges}>Request changes</Button>}
            {(lc === 'pending' || lc === 'changes_requested') && <Button variant="danger" size="md" onClick={onReject}><X /> Reject</Button>}
            <Link href={`/admin/businesses/${b.id}`} className={buttonVariants({ variant: 'quiet', size: 'md' })}>Full record <ExternalLink className="size-3" /></Link>
          </div>
        </div>
        {(b.rejectionReason || b.changeRequest) && (
          <p className={cn('mt-4 rounded-lg px-4 py-3 text-xs', b.rejectionReason ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn')}>
            <span className="font-semibold">{b.rejectionReason ? 'Rejected: ' : 'Changes requested: '}</span>
            {b.rejectionReason ?? b.changeRequest}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Automated checks" subtitle={`${checks.filter((c) => c.ok).length} of ${checks.length} passed · ${completeness}% complete`}>
          <ul className="grid grid-cols-1 gap-2.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5">
                {c.ok ? <Check className="mt-0.5 size-4 shrink-0 text-brand" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />}
                <span className={c.ok ? 'text-ink-muted' : 'font-medium text-ink'}>{c.label}</span>
              </li>
            ))}
          </ul>
          {duplicates.length > 0 && (
            <div className="mt-4 rounded-lg bg-warn-bg p-3 text-xs text-warn">
              <p className="font-semibold">Possible duplicates</p>
              <ul className="mt-1.5 grid grid-cols-1 gap-1">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/businesses/${d.id}`} className="underline underline-offset-2">{d.name}</Link> — {d.id} ({businessLifecycle(d).replace('_', ' ')})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="mt-4 grid grid-cols-1 gap-1.5 border-t border-divider pt-4 text-xs">
            {completenessChecklist(b, products.length, services.length).filter((c) => !c.done).slice(0, 4).map((c) => (
              <li key={c.label} className="text-ink-muted">• {c.label}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Submitted information">
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <Item label="Business type">{b.businessType}</Item>
            <Item label="Short description">{b.shortDescription}</Item>
            <Item label="Description">{b.description}</Item>
            <Item label="Established">{b.yearEstablished ?? '—'}</Item>
            <Item label="Registration reference">{b.registrationRef ?? '—'}</Item>
            <Item label="Submitted by">{owner ? `${owner.name} (${owner.email})` : 'Visitor / no account'}</Item>
          </dl>
        </Panel>

        <Panel title="Contact & location">
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <Item label="Phone">{b.phone}{b.alternatePhone ? ` · ${b.alternatePhone}` : ''}</Item>
            <Item label="Email">{b.email}</Item>
            <Item label="Website">{b.website ?? '—'}</Item>
            <Item label="Address">{b.address}</Item>
            <Item label="Opening hours">
              {b.openingHours ? (
                <span className="grid grid-cols-1 gap-0.5 text-xs">
                  {DAYS.map((d) => (
                    <span key={d.key} className="flex justify-between gap-4"><span className="text-ink-muted">{d.short}</span><span>{formatHoursRange(b.openingHours![d.key])}</span></span>
                  ))}
                </span>
              ) : (
                '—'
              )}
            </Item>
          </dl>
          <MapView businesses={[b]} selectedId={b.id} interactive={false} cluster={false} maxFitZoom={13} tag="Illustrative position" className="mt-4 h-40 w-full" />
        </Panel>

        <Panel title="Catalogue" subtitle={`${products.length} products · ${services.length} services`}>
          {products.length + services.length === 0 ? (
            <p className="text-sm text-ink-muted">No products or services were submitted.</p>
          ) : (
            <ul className="divide-y divide-divider text-sm">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-faint">Product · {productPriceLabel(p)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5"><AvailabilityBadge value={p.availability} unit={p.unit} /><PublicationBadge status={p.publicationStatus} /></div>
                </li>
              ))}
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{s.name}</p>
                    <p className="text-[11px] text-ink-faint">Service · {servicePriceLabel(s)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5"><ServiceAvailabilityBadge value={s.availability} /><PublicationBadge status={s.publicationStatus} /></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-ink-faint">Created {formatDate(b.createdAt)}. Catalogue items stay hidden until the business is approved and published.</p>
        </Panel>
      </div>
    </div>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{children}</dd>
    </div>
  )
}
