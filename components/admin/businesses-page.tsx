'use client'

import { Download, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { useBusinessActions } from '@/components/admin/business-actions'
import { BusinessCreateModal } from '@/components/admin/business-create-modal'
import { BizLogo } from '@/components/ui/art'
import { Button } from '@/components/ui/button'
import { DataTable, TableCard, type Column } from '@/components/ui/data-table'
import { LifecycleBadge } from '@/components/ui/badge'
import { RowMenu } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { toCsv, downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { businessLifecycle, type BusinessLifecycle } from '@/lib/rules'
import { useIndex } from '@/lib/store/hooks'
import { parentCategories, childCategories, primaryCategory, locationLabel } from '@/lib/store/indexes'
import type { Business } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'
import { inputClass } from '@/components/ui/form'

const PARAMS = { q: '', status: '', category: '', region: '', verified: '', featured: '', new: '', sort: '' }
const STATUSES: { id: BusinessLifecycle; label: string }[] = [
  { id: 'published', label: 'Published' },
  { id: 'pending', label: 'Pending approval' },
  { id: 'changes_requested', label: 'Changes requested' },
  { id: 'draft', label: 'Draft' },
  { id: 'unpublished', label: 'Unpublished' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
]

export function AdminBusinessesPage() {
  const idx = useIndex()
  const router = useRouter()
  const toast = useToast()
  const { value: f, set, clear } = useQueryState(PARAMS)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(f.q)
  const { menuFor, element } = useBusinessActions()

  // `?new=1` (from the dashboard's "Add business" button) opens the create dialog once.
  useEffect(() => {
    if (f.new) {
      setCreating(true)
      set({ new: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.new])
  useEffect(() => setDraft(f.q), [f.q])
  useEffect(() => {
    if (draft === f.q) return
    const t = setTimeout(() => set({ q: draft }), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const rows = useMemo(() => {
    const needle = normalize(f.q)
    const cat = f.category ? idx.categoryBySlug.get(f.category) : undefined
    const catIds = cat ? idx.categoryTree.get(cat.id) : undefined
    const region = f.region ? idx.regionBySlug.get(f.region) : undefined
    return idx.data.businesses.filter((b) => {
      if (needle) {
        const hay = normalize(`${b.name} ${b.id} ${b.email} ${b.phone} ${idx.townById.get(b.townId)?.name ?? ''} ${idx.regionById.get(b.regionId)?.name ?? ''} ${b.categoryIds.map((c) => idx.categoryById.get(c)?.name).join(' ')}`)
        if (!needle.split(' ').every((t) => hay.includes(t))) return false
      }
      if (f.status && businessLifecycle(b) !== f.status) return false
      if (catIds && !b.categoryIds.some((c) => catIds.has(c))) return false
      if (f.category && !cat) return false
      if (f.region && region?.id !== b.regionId) return false
      if (f.verified === 'verified' && b.verificationStatus !== 'verified') return false
      if (f.verified === 'unverified' && b.verificationStatus === 'verified') return false
      if (f.featured === '1' && !b.featured) return false
      return true
    })
  }, [idx, f])

  const columns: Column<Business>[] = [
    {
      id: 'name',
      header: 'Business',
      sort: (b) => b.name,
      cell: (b) => (
        <Link href={`/admin/businesses/${b.id}`} className="flex items-center gap-3 hover:opacity-80">
          <BizLogo business={b} className="size-8 rounded-lg text-[10px]" />
          <div>
            <p className="font-semibold text-ink">{b.name}</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">{b.id} · {b.verificationStatus === 'verified' ? 'Verified listing' : 'Unverified listing'}</p>
          </div>
        </Link>
      ),
    },
    { id: 'category', header: 'Category', sort: (b) => primaryCategory(idx, b)?.name ?? '', hideBelow: 'lg', cell: (b) => <span className="text-ink-muted">{primaryCategory(idx, b)?.name}</span> },
    { id: 'location', header: 'Location', sort: (b) => idx.townById.get(b.townId)?.name ?? '', hideBelow: 'md', cell: (b) => <span className="text-ink-muted">{locationLabel(idx, b.regionId, b.townId)}</span> },
    {
      id: 'contact',
      header: 'Contact',
      hideBelow: 'lg',
      cell: (b) => (
        <div className="text-ink-muted">
          <p>{b.phone}</p>
          <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-ink-faint">{b.email}</p>
        </div>
      ),
    },
    { id: 'verification', header: 'Verification', sort: (b) => b.verificationStatus, hideBelow: 'md', cell: (b) => <span className={b.verificationStatus === 'verified' ? 'font-semibold text-brand' : 'text-ink-faint'}>{b.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}</span> },
    { id: 'status', header: 'Status', sort: (b) => businessLifecycle(b), cell: (b) => <LifecycleBadge status={businessLifecycle(b)} /> },
    { id: 'products', header: 'Products', sort: (b) => idx.productsByBusiness.get(b.id)?.length ?? 0, hideBelow: 'sm', cell: (b) => <span className="text-ink-muted">{idx.productsByBusiness.get(b.id)?.length ?? 0}</span> },
    { id: 'services', header: 'Services', sort: (b) => idx.servicesByBusiness.get(b.id)?.length ?? 0, hideBelow: 'lg', cell: (b) => <span className="text-ink-muted">{idx.servicesByBusiness.get(b.id)?.length ?? 0}</span> },
    { id: 'submitted', header: 'Submitted', sort: (b) => b.submittedAt ?? b.createdAt, hideBelow: 'lg', cell: (b) => <span className="whitespace-nowrap text-ink-muted">{formatDate(b.submittedAt ?? b.createdAt)}</span> },
    { id: 'actions', header: '', cell: (b) => <RowMenu label={`Actions for ${b.name}`} actions={menuFor(b)} /> },
  ]

  const exportCsv = () => {
    const csv = toCsv(rows, [
      { header: 'ID', value: (b) => b.id },
      { header: 'Name', value: (b) => b.name },
      { header: 'Category', value: (b) => primaryCategory(idx, b)?.name },
      { header: 'Town', value: (b) => idx.townById.get(b.townId)?.name },
      { header: 'Region', value: (b) => idx.regionById.get(b.regionId)?.name },
      { header: 'Phone', value: (b) => b.phone },
      { header: 'Email', value: (b) => b.email },
      { header: 'Status', value: (b) => businessLifecycle(b) },
      { header: 'Approval', value: (b) => b.approvalStatus },
      { header: 'Listing', value: (b) => b.listingStatus },
      { header: 'Verification', value: (b) => b.verificationStatus },
      { header: 'Featured', value: (b) => (b.featured ? 'yes' : 'no') },
      { header: 'Products', value: (b) => idx.productsByBusiness.get(b.id)?.length ?? 0 },
      { header: 'Services', value: (b) => idx.servicesByBusiness.get(b.id)?.length ?? 0 },
      { header: 'Submitted/created', value: (b) => b.submittedAt ?? b.createdAt },
    ])
    downloadCsv('businesses', csv)
    toast.success(`Exported ${rows.length} businesses`)
  }

  const active = Object.entries(f).filter(([k, v]) => v && k !== 'new' && k !== 'sort').length
  const sel = `${inputClass} py-2 text-xs sm:w-auto`

  return (
    <>
      <AdminPageHeader
        title="Businesses"
        description="Manage listings, approvals, verification and visibility."
        actions={
          <>
            <Button variant="soft" size="md" onClick={exportCsv} disabled={rows.length === 0}>
              <Download /> Export CSV
            </Button>
            <Button variant="brand" size="md" onClick={() => setCreating(true)}>
              <Plus /> Add business
            </Button>
          </>
        }
      />

      <TableCard
        className="mt-7"
        toolbar={
          <>
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line-strong px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Search className="size-4 text-ink-faint" aria-hidden />
              <input aria-label="Search businesses" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search name, ID, town, phone, email…" className="w-full text-sm outline-none" />
            </div>
            <select aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })} className={sel}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <select aria-label="Category" value={f.category} onChange={(e) => set({ category: e.target.value })} className={sel}>
              <option value="">All categories</option>
              {parentCategories(idx).map((p) => (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.slug}>All {p.name}</option>
                  {childCategories(idx, p.id).map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select aria-label="Region" value={f.region} onChange={(e) => set({ region: e.target.value })} className={sel}>
              <option value="">All regions</option>
              {idx.data.regions.map((r) => (
                <option key={r.id} value={r.slug}>{r.name}</option>
              ))}
            </select>
            <select aria-label="Verification" value={f.verified} onChange={(e) => set({ verified: e.target.value })} className={sel}>
              <option value="">Any verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
            {active > 0 && (
              <button type="button" onClick={() => clear()} className="text-xs font-semibold text-brand hover:text-forest">
                Clear filters ({active})
              </button>
            )}
          </>
        }
      >
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(b) => b.id}
          caption="Businesses"
          defaultSort={f.sort === 'newest' ? { id: 'submitted', dir: 'desc' } : { id: 'name', dir: 'asc' }}
          pageSize={15}
          resetKey={JSON.stringify(f)}
          onRowClick={(b) => router.push(`/admin/businesses/${b.id}`)}
          empty={
            <EmptyState className="border-0" title="No businesses match" action={<Button variant="brand" size="md" onClick={() => clear()}>Clear filters</Button>}>
              Try a different search or remove a filter.
            </EmptyState>
          }
        />
      </TableCard>

      <BusinessCreateModal open={creating} onOpenChange={setCreating} />
      {element}
    </>
  )
}
