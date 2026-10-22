'use client'

import { AlertTriangle, ArrowRight, Check, Circle, Eye, Info, Plus, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ProfileForm } from '@/components/owner/profile-form'
import { EnquiriesPanel } from '@/components/owner/enquiries-panel'
import { ProductFormModal, ServiceFormModal } from '@/components/shared/catalog-forms'
import { ProductTable, ServiceTable } from '@/components/shared/catalog-tables'
import { LifecycleBadge, EnquiryStatusBadge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, Eyebrow } from '@/components/ui/card'
import { SelectField } from '@/components/ui/form'
import { TableCard } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/states'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/format'
import { businessLifecycle, completenessChecklist, isBusinessPublic, listingCompleteness } from '@/lib/rules'
import { prefs, setListingStatus, submitForApproval, type Actor } from '@/lib/store/actions'
import { useHydrated, useIndex, usePrefs } from '@/lib/store/hooks'
import type { Business } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { tab: 'overview' }
const TABS = ['overview', 'profile', 'products', 'services', 'enquiries']

export function OwnerDashboard() {
  const idx = useIndex()
  const hydrated = useHydrated()
  const { ownerUserId, ownerBusinessId } = usePrefs()
  const owners = useMemo(() => idx.data.users.filter((u) => u.role === 'business_owner').sort((a, b) => a.name.localeCompare(b.name)), [idx])
  const owner = idx.userById.get(ownerUserId) ?? owners[0]
  const businesses = owner ? owner.businessIds.map((id) => idx.businessById.get(id)).filter((b): b is Business => !!b) : []
  const business = businesses.find((b) => b.id === ownerBusinessId) ?? businesses[0]

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Eyebrow>Business owner workspace</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-forest md:text-4xl">{business ? business.name : 'Your businesses'}</h1>
          <p className="mt-2 text-sm text-ink-muted">Manage your profile, catalogue and enquiries.</p>
        </div>
        {business && <LifecycleBadge status={businessLifecycle(business)} />}
      </div>

      <Card className="mt-6 border-line-green bg-mint p-4">
        <div className="flex gap-3">
          <Info aria-hidden className="mt-1 size-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-forest">Demo workspace — not real sign-in</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-muted">Choose any seeded business owner below to explore their workspace. Switching accounts is a demonstration convenience: there is no password, session or authentication in this product demo.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Demo account" value={owner?.id ?? ''} onChange={(e) => prefs.setOwnerUser(e.target.value)} className="bg-white py-2 text-xs">
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} — {o.businessIds.length} {o.businessIds.length === 1 ? 'business' : 'businesses'}
                    {o.status !== 'active' ? ` (${o.status})` : ''}
                  </option>
                ))}
              </SelectField>
              {businesses.length > 1 && (
                <SelectField label="Business" value={business?.id ?? ''} onChange={(e) => prefs.setOwnerBusiness(e.target.value)} className="bg-white py-2 text-xs">
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>
          </div>
        </div>
      </Card>

      {owner && owner.status === 'inactive' && (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-warn-bg px-4 py-3 text-xs text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> This account has been deactivated by an administrator. The workspace is shown read-only context for the demo; changes still work.
        </p>
      )}

      {!business ? (
        <div className="mt-8">
          <EmptyState
            title={hydrated || owners.length ? `${owner?.name ?? 'This account'} has no businesses yet` : 'Loading workspace…'}
            action={
              <Link href="/business/register" className={buttonVariants({ variant: 'brand', size: 'md' })}>
                <Plus /> List your business
              </Link>
            }
          >
            Register a business to manage its profile, catalogue and enquiries here — or pick another demo account above.
          </EmptyState>
        </div>
      ) : (
        <Workspace key={business.id} business={business} actor={{ name: owner.name, role: 'Business owner' }} />
      )}
    </div>
  )
}

function Workspace({ business: b, actor }: { business: Business; actor: Actor }) {
  const idx = useIndex()
  const toast = useToast()
  const { value, set } = useQueryState(PARAMS)
  const tab = TABS.includes(value.tab) ? value.tab : 'overview'
  const [addProduct, setAddProduct] = useState(false)
  const [addService, setAddService] = useState(false)
  const [q, setQ] = useState('')
  const [vis, setVis] = useState('')

  const products = idx.productsByBusiness.get(b.id) ?? []
  const services = idx.servicesByBusiness.get(b.id) ?? []
  const enquiries = idx.enquiriesByBusiness.get(b.id) ?? []
  const newEnquiries = enquiries.filter((e) => e.status === 'new').length
  const lifecycle = businessLifecycle(b)
  const completeness = listingCompleteness(b, products.length, services.length)
  const checklist = completenessChecklist(b, products.length, services.length)
  const publicNow = isBusinessPublic(b)
  const activeListings = products.filter((p) => p.publicationStatus === 'published').length + services.filter((s) => s.publicationStatus === 'published').length

  const run = (r: { ok: boolean; error?: string }, message: string) => (r.ok ? toast.success(message) : toast.error(r.error ?? 'Something went wrong'))

  const filter = <T extends { name: string; publicationStatus: string }>(rows: T[]) => rows.filter((r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!vis || r.publicationStatus === vis))
  const toolbar = (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <input aria-label="Filter by name" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name…" className="w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <select aria-label="Filter by visibility" value={vis} onChange={(e) => setVis(e.target.value)} className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand sm:w-48">
        <option value="">All visibility</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="unpublished">Unpublished</option>
      </select>
    </div>
  )

  return (
    <>
      {/* Lifecycle banners */}
      {lifecycle === 'pending' && (
        <Banner tone="amber" icon={<Info className="size-4" />} title="Pending profile review">
          An administrator is reviewing this listing. It will go public once approved. Submitted {b.submittedAt ? formatDate(b.submittedAt) : ''}.
        </Banner>
      )}
      {lifecycle === 'draft' && (
        <Banner tone="gray" icon={<Info className="size-4" />} title="This listing is a draft" action={<Button variant="brand" size="md" onClick={() => run(submitForApproval(b.id, actor), 'Submitted for approval')}>Submit for approval</Button>}>
          It isn’t visible to the public yet. Finish your profile and add a few products or services, then submit it for review.
        </Banner>
      )}
      {lifecycle === 'changes_requested' && (
        <Banner tone="amber" icon={<AlertTriangle className="size-4" />} title="Changes requested by the administrator" action={<Button variant="brand" size="md" onClick={() => run(submitForApproval(b.id, actor), 'Resubmitted for approval')}>Resubmit for approval</Button>}>
          “{b.changeRequest}” Update your listing, then resubmit.
        </Banner>
      )}
      {lifecycle === 'rejected' && (
        <Banner tone="red" icon={<ShieldAlert className="size-4" />} title="This listing was rejected" action={<Button variant="brand" size="md" onClick={() => run(submitForApproval(b.id, actor), 'Resubmitted for approval')}>Edit &amp; resubmit</Button>}>
          Reason: “{b.rejectionReason}” You can correct the details and resubmit.
        </Banner>
      )}
      {lifecycle === 'suspended' && (
        <Banner tone="red" icon={<ShieldAlert className="size-4" />} title="This listing is suspended">
          An administrator has hidden this listing from the public directory. Contact the directory team to have it reactivated.
        </Banner>
      )}
      {lifecycle === 'unpublished' && (
        <Banner tone="gray" icon={<Eye className="size-4" />} title="Your listing is unpublished" action={<Button variant="brand" size="md" onClick={() => run(setListingStatus(b.id, 'published', actor), 'Listing published')}>Publish listing</Button>}>
          Customers can’t find this listing right now.
        </Banner>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Profile completion" value={`${completeness}%`} action={tab !== 'profile' ? { label: 'Edit company details', onClick: () => set({ tab: 'profile' }) } : undefined} />
        <Stat label="Active listings" value={String(activeListings)} action={{ label: 'Add product', onClick: () => setAddProduct(true) }} sub={`${products.length} products · ${services.length} services`} />
        <Stat label="New enquiries" value={String(newEnquiries)} action={{ label: 'Open inbox', onClick: () => set({ tab: 'enquiries' }) }} sub={`${enquiries.length} in total`} />
        <Stat label="Public visibility" value={publicNow ? 'Live' : 'Hidden'} sub={publicNow ? 'Visible in search and on the map' : 'Not shown publicly'} />
      </div>

      <div className="mt-8">
        <Tabs
          label="Workspace sections"
          idPrefix="owner"
          value={tab}
          onChange={(t) => set({ tab: t === 'overview' ? '' : t })}
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'profile', label: 'Profile' },
            { id: 'products', label: 'Products', count: products.length },
            { id: 'services', label: 'Services', count: services.length },
            { id: 'enquiries', label: 'Enquiries', count: newEnquiries || undefined },
          ]}
        />
      </div>

      <div role="tabpanel" id={`owner-panel-${tab}`} aria-labelledby={`owner-${tab}`} className="mt-6">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-6">
              <h2 className="font-semibold text-forest">Complete your listing</h2>
              <p className="mt-1 text-xs text-ink-muted">More complete listings are easier to find and trust.</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-bg" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <ul className="mt-5 grid grid-cols-1 gap-2.5 text-sm">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2.5">
                    {c.done ? <Check className="size-4 text-brand" /> : <Circle className="size-4 text-ink-faint" />}
                    <span className={c.done ? 'text-ink-faint line-through' : 'text-ink'}>{c.label}</span>
                  </li>
                ))}
              </ul>
              {checklist.some((c) => !c.done) && (
                <Button variant="soft" size="md" className="mt-5" onClick={() => set({ tab: 'profile' })}>
                  Edit profile <ArrowRight />
                </Button>
              )}
            </Card>
            <div className="flex flex-col gap-6">
              <Card className="p-6">
                <h2 className="font-semibold text-forest">Listing status</h2>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <Row label="Approval"><LifecycleBadge status={lifecycle} /></Row>
                  <Row label="Verification"><span className={b.verificationStatus === 'verified' ? 'font-semibold text-brand' : 'text-ink-muted'}>{b.verificationStatus === 'verified' ? 'Verified' : 'Not verified'}</span></Row>
                  <Row label="Featured"><span className="text-ink-muted">{b.featured ? 'Yes' : 'No'}</span></Row>
                  <Row label="Last updated"><span className="text-ink-muted">{formatDate(b.updatedAt)}</span></Row>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  {publicNow && (
                    <>
                      <Link href={`/businesses/${b.slug}`} className={buttonVariants({ variant: 'brand', size: 'md' })}>
                        <Eye /> View public profile
                      </Link>
                      <Button variant="soft" size="md" onClick={() => run(setListingStatus(b.id, 'unpublished', actor), 'Listing unpublished')}>
                        Unpublish
                      </Button>
                    </>
                  )}
                  {lifecycle === 'unpublished' && (
                    <Button variant="brand" size="md" onClick={() => run(setListingStatus(b.id, 'published', actor), 'Listing published')}>
                      Publish listing
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-[11px] leading-4 text-ink-faint">Approval and verification are decided by directory administrators; you control whether an approved listing is published.</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-forest">Latest enquiries</h2>
                  <button type="button" onClick={() => set({ tab: 'enquiries' })} className="text-xs font-semibold text-brand hover:text-forest">View all</button>
                </div>
                {enquiries.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">No enquiries yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-divider">
                    {enquiries.slice().sort((a, c) => c.createdAt.localeCompare(a.createdAt)).slice(0, 3).map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{e.name}</p>
                          <p className="truncate text-xs text-ink-muted">{e.message}</p>
                        </div>
                        <EnquiryStatusBadge status={e.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}

        {tab === 'profile' && <ProfileForm business={b} actor={actor} />}

        {tab === 'products' && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-forest">Your products</h2>
              <Button variant="brand" size="md" onClick={() => setAddProduct(true)}>
                <Plus /> Add product
              </Button>
            </div>
            {toolbar}
            <TableCard>
              <ProductTable rows={filter(products)} actor={actor} resetKey={`${q}|${vis}`} empty={<EmptyState className="border-0" title={products.length ? 'No matching products' : 'No products yet'}>{products.length ? 'Try a different filter.' : 'Add your first product to start building your catalogue.'}</EmptyState>} />
            </TableCard>
          </div>
        )}

        {tab === 'services' && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-forest">Your services</h2>
              <Button variant="brand" size="md" onClick={() => setAddService(true)}>
                <Plus /> Add service
              </Button>
            </div>
            {toolbar}
            <TableCard>
              <ServiceTable rows={filter(services)} actor={actor} resetKey={`${q}|${vis}`} empty={<EmptyState className="border-0" title={services.length ? 'No matching services' : 'No services yet'}>{services.length ? 'Try a different filter.' : 'Add a service to let customers request your work.'}</EmptyState>} />
            </TableCard>
          </div>
        )}

        {tab === 'enquiries' && <EnquiriesPanel business={b} actor={actor} />}
      </div>

      <ProductFormModal open={addProduct} onOpenChange={setAddProduct} business={b} actor={actor} />
      <ServiceFormModal open={addService} onOpenChange={setAddService} business={b} actor={actor} />
    </>
  )
}

function Banner({ tone, icon, title, children, action }: { tone: 'amber' | 'red' | 'gray'; icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const style = { amber: 'border-[#e5d3a8] bg-warn-bg text-warn', red: 'border-[#f0d3d1] bg-danger-bg text-danger', gray: 'border-line bg-neutral-bg text-neutral' }[tone]
  return (
    <div role="status" className={`mt-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${style}`}>
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs leading-5 opacity-90">{children}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function Stat({ label, value, sub, action }: { label: string; value: string; sub?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-forest">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-faint">{sub}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="mt-3 text-xs font-semibold text-brand hover:text-forest">
          {action.label} →
        </button>
      )}
    </Card>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
