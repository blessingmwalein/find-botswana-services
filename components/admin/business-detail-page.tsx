'use client'

import { ArrowLeft, Check, ExternalLink, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useBusinessActions } from '@/components/admin/business-actions'
import { ActivityTimeline, Panel } from '@/components/admin/widgets'
import { MapView } from '@/components/map/map-loader'
import { ProfileForm } from '@/components/owner/profile-form'
import { ProductFormModal, ServiceFormModal } from '@/components/shared/catalog-forms'
import { ProductTable, ServiceTable } from '@/components/shared/catalog-tables'
import { OpeningHoursCard } from '@/components/shared/contact-panel'
import { BizLogo } from '@/components/ui/art'
import { Badge, EnquiryStatusBadge, LifecycleBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable, TableCard, type Column } from '@/components/ui/data-table'
import { RowMenu } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/states'
import { Tabs } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/format'
import { businessLifecycle, completenessChecklist, isBusinessPublic, listingCompleteness } from '@/lib/rules'
import { ADMIN_ACTOR } from '@/lib/store/actions'
import { useHydrated, useIndex } from '@/lib/store/hooks'
import { businessCategories, locationLabel } from '@/lib/store/indexes'
import type { Business, Enquiry } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { tab: 'overview' }
const TABS = ['overview', 'edit', 'products', 'services', 'enquiries', 'activity']

export function AdminBusinessDetail({ id }: { id: string }) {
  const idx = useIndex()
  const hydrated = useHydrated()
  const b = idx.businessById.get(id)
  if (!b) {
    return (
      <EmptyState
        title={hydrated ? 'Business not found' : 'Loading…'}
        action={
          <Link href="/admin/businesses" className={buttonVariants({ variant: 'brand', size: 'md' })}>
            Back to businesses
          </Link>
        }
      >
        {hydrated ? 'This business may have been deleted.' : ''}
      </EmptyState>
    )
  }
  return <Detail business={b} />
}

function Detail({ business: b }: { business: Business }) {
  const idx = useIndex()
  const router = useRouter()
  const { value, set } = useQueryState(PARAMS)
  const tab = TABS.includes(value.tab) ? value.tab : 'overview'
  const [addProduct, setAddProduct] = useState(false)
  const [addService, setAddService] = useState(false)
  const { menuFor, open, element } = useBusinessActions({ onDeleted: () => router.push('/admin/businesses') })

  const products = idx.productsByBusiness.get(b.id) ?? []
  const services = idx.servicesByBusiness.get(b.id) ?? []
  const enquiries = (idx.enquiriesByBusiness.get(b.id) ?? []).slice().sort((a, c) => c.createdAt.localeCompare(a.createdAt))
  const lc = businessLifecycle(b)
  const owner = b.ownerUserId ? idx.userById.get(b.ownerUserId) : undefined
  const cats = businessCategories(idx, b)
  const town = idx.townById.get(b.townId)
  const completeness = listingCompleteness(b, products.length, services.length)
  const productIds = new Set(products.map((p) => p.id))
  const serviceIds = new Set(services.map((s) => s.id))
  const activity = idx.data.activities
    .filter((a) => a.entityId === b.id || (a.entityType === 'product' && productIds.has(a.entityId)) || (a.entityType === 'service' && serviceIds.has(a.entityId)) || (a.entityType === 'enquiry' && enquiries.some((e) => e.id === a.entityId)))
    .sort((x, y) => y.at.localeCompare(x.at))

  const decidable = lc === 'pending' || lc === 'changes_requested' || lc === 'rejected' || lc === 'draft'

  const enquiryColumns: Column<Enquiry>[] = [
    { id: 'from', header: 'From', sort: (e) => e.name, cell: (e) => (<div><p className="font-semibold text-ink">{e.name}</p><p className="mt-0.5 text-[10px] text-ink-faint">{e.email}</p></div>) },
    { id: 'about', header: 'About', hideBelow: 'md', cell: (e) => <span className="capitalize text-ink-muted">{e.targetType}</span> },
    { id: 'message', header: 'Message', hideBelow: 'lg', cell: (e) => <p className="max-w-[320px] truncate text-ink-muted">{e.message}</p> },
    { id: 'received', header: 'Received', sort: (e) => e.createdAt, cell: (e) => <span className="whitespace-nowrap text-ink-muted">{formatDateTime(e.createdAt)}</span> },
    { id: 'status', header: 'Status', cell: (e) => <EnquiryStatusBadge status={e.status} /> },
  ]

  return (
    <>
      <Link href="/admin/businesses" className="inline-flex items-center gap-2 text-xs font-semibold text-brand hover:text-forest">
        <ArrowLeft className="size-3" /> Back to businesses
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <BizLogo business={b} className="size-14 rounded-xl text-base" />
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-forest">{b.name}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {cats[0]?.name} · {locationLabel(idx, b.regionId, b.townId)} · <span className="font-mono text-xs">{b.id}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LifecycleBadge status={lc} />
              <Badge tone={b.verificationStatus === 'verified' ? 'green' : 'gray'}>{b.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}</Badge>
              {b.featured && <Badge tone="amber">Featured</Badge>}
              {isBusinessPublic(b) ? <Badge tone="green">Public</Badge> : <Badge tone="gray">Not public</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lc === 'pending' && (
            <>
              <Button variant="brand" size="md" onClick={() => open('approve', b)}><Check /> Approve</Button>
              <Button variant="soft" size="md" onClick={() => open('changes', b)}>Request changes</Button>
              <Button variant="danger" size="md" onClick={() => open('reject', b)}><X /> Reject</Button>
            </>
          )}
          {lc !== 'pending' && decidable && (
            <Button variant="brand" size="md" onClick={() => open('approve', b)}><Check /> Approve</Button>
          )}
          {isBusinessPublic(b) && (
            <Link href={`/businesses/${b.slug}`} target="_blank" className={buttonVariants({ variant: 'soft', size: 'md' })}>
              Public profile <ExternalLink className="size-3" />
            </Link>
          )}
          <RowMenu label="More actions" actions={menuFor(b, { view: `/admin/businesses/${b.id}`, edit: `/admin/businesses/${b.id}?tab=edit` })} className="border border-line-strong bg-white" />
        </div>
      </div>

      {(b.rejectionReason || b.changeRequest) && (
        <p role="status" className={`mt-5 rounded-lg px-4 py-3 text-sm ${b.rejectionReason ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn'}`}>
          <span className="font-semibold">{b.rejectionReason ? 'Rejection reason: ' : 'Requested changes: '}</span>
          {b.rejectionReason ?? b.changeRequest}
        </p>
      )}

      <div className="mt-6">
        <Tabs
          label="Business sections"
          idPrefix="admbiz"
          value={tab}
          onChange={(t) => set({ tab: t === 'overview' ? '' : t })}
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'edit', label: 'Edit profile' },
            { id: 'products', label: 'Products', count: products.length },
            { id: 'services', label: 'Services', count: services.length },
            { id: 'enquiries', label: 'Enquiries', count: enquiries.length },
            { id: 'activity', label: 'Activity', count: activity.length },
          ]}
        />
      </div>

      <div role="tabpanel" id={`admbiz-panel-${tab}`} aria-labelledby={`admbiz-${tab}`} className="mt-6">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-6">
              <Panel title="About">
                <p className="text-sm leading-7 text-ink-muted">{b.description}</p>
                <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-divider pt-5 text-sm sm:grid-cols-2">
                  <F label="Short description">{b.shortDescription}</F>
                  <F label="Business type">{b.businessType}</F>
                  <F label="Categories">{cats.map((c) => c.name).join(', ')}</F>
                  <F label="Established">{b.yearEstablished ?? '—'}</F>
                  <F label="Registration reference">{b.registrationRef ?? '—'}</F>
                  <F label="Created">{formatDateTime(b.createdAt)}</F>
                  <F label="Last updated">{formatDateTime(b.updatedAt)}</F>
                  <F label="Submitted">{b.submittedAt ? formatDateTime(b.submittedAt) : '—'}</F>
                </dl>
              </Panel>
              <Panel title="Contact & location">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  <F label="Phone">{b.phone}{b.alternatePhone ? ` · ${b.alternatePhone}` : ''}</F>
                  <F label="Email">{b.email}</F>
                  <F label="Website">{b.website ?? '—'}</F>
                  <F label="Social">{b.social ? Object.entries(b.social).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}</F>
                  <F label="Address">{b.address}</F>
                  <F label="Coordinates">{b.lat.toFixed(5)}, {b.lng.toFixed(5)} <span className="text-ink-faint">(illustrative, near {town?.name})</span></F>
                  <F label="Visibility of contact">{[b.contactPreferences.showPhone && 'phone', b.contactPreferences.showEmail && 'email'].filter(Boolean).join(' & ') || 'hidden'}; enquiries {b.contactPreferences.acceptEnquiries ? 'accepted' : 'off'}</F>
                  <F label="Preferred contact" >{b.contactPreferences.preferredContact}</F>
                </dl>
                <MapView businesses={[b]} selectedId={b.id} interactive={false} cluster={false} maxFitZoom={13} tag="Illustrative position" className="mt-5 h-52 w-full" />
              </Panel>
              <OpeningHoursCard business={b} />
            </div>
            <div className="flex flex-col gap-6">
              <Panel title="Status">
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <S label="Approval"><span className="capitalize">{b.approvalStatus.replace('_', ' ')}</span></S>
                  <S label="Listing"><span className="capitalize">{b.listingStatus}</span></S>
                  <S label="Verification"><span className="capitalize">{b.verificationStatus}</span></S>
                  <S label="Featured">{b.featured ? 'Yes' : 'No'}</S>
                  <S label="Public"><span className={isBusinessPublic(b) ? 'font-semibold text-brand' : ''}>{isBusinessPublic(b) ? 'Yes' : 'No'}</span></S>
                </dl>
                <p className="mt-4 text-[11px] leading-4 text-ink-faint">Public = approved <em>and</em> published. Verification is independent and only adds a badge.</p>
              </Panel>
              <Panel title="Owner">
                {owner ? (
                  <div className="text-sm">
                    <Link href="/admin/users" className="font-semibold text-brand hover:underline">{owner.name}</Link>
                    <p className="mt-1 text-xs text-ink-muted">{owner.email}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">Account {owner.status}</p>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">Managed by the directory team (no owner account linked).</p>
                )}
              </Panel>
              <Panel title="Listing completeness" subtitle={`${completeness}% complete`}>
                <ul className="grid grid-cols-1 gap-2 text-xs">
                  {completenessChecklist(b, products.length, services.length).map((c) => (
                    <li key={c.label} className="flex items-center gap-2">
                      {c.done ? <Check className="size-3.5 text-brand" /> : <X className="size-3.5 text-ink-faint" />}
                      <span className={c.done ? 'text-ink-muted' : 'text-ink'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'edit' && <ProfileForm business={b} actor={ADMIN_ACTOR} />}

        {tab === 'products' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-forest">Products ({products.length})</h3>
              <Button variant="brand" size="md" onClick={() => setAddProduct(true)}><Plus /> Add product</Button>
            </div>
            <TableCard><ProductTable rows={products} actor={ADMIN_ACTOR} empty={<EmptyState className="border-0" title="No products">Add the first product for this business.</EmptyState>} /></TableCard>
          </div>
        )}

        {tab === 'services' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-forest">Services ({services.length})</h3>
              <Button variant="brand" size="md" onClick={() => setAddService(true)}><Plus /> Add service</Button>
            </div>
            <TableCard><ServiceTable rows={services} actor={ADMIN_ACTOR} empty={<EmptyState className="border-0" title="No services">Add the first service for this business.</EmptyState>} /></TableCard>
          </div>
        )}

        {tab === 'enquiries' && (
          <TableCard>
            <DataTable rows={enquiries} columns={enquiryColumns} rowKey={(e) => e.id} caption="Enquiries" pageSize={10} defaultSort={{ id: 'received', dir: 'desc' }} empty={<EmptyState className="border-0" title="No enquiries">Visitors haven’t contacted this business through the directory yet.</EmptyState>} />
          </TableCard>
        )}

        {tab === 'activity' && (
          <Card className="border-line-strong p-6">
            <ActivityTimeline items={activity} emptyText="No recorded activity for this business yet." />
          </Card>
        )}
      </div>

      <ProductFormModal open={addProduct} onOpenChange={setAddProduct} business={b} actor={ADMIN_ACTOR} />
      <ServiceFormModal open={addService} onOpenChange={setAddService} business={b} actor={ADMIN_ACTOR} />
      {element}
    </>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  )
}

function S({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  )
}
