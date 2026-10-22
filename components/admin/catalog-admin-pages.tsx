'use client'

import { Download, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { ProductFormModal, ServiceFormModal } from '@/components/shared/catalog-forms'
import { ProductTable, ServiceTable } from '@/components/shared/catalog-tables'
import { Button } from '@/components/ui/button'
import { TableCard } from '@/components/ui/data-table'
import { inputClass } from '@/components/ui/form'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { downloadCsv, toCsv } from '@/lib/csv'
import { availabilityLabel, productPriceLabel, serviceAvailabilityLabel, servicePriceLabel } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { ADMIN_ACTOR } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import { useQueryState } from '@/lib/use-query-state'

const sel = `${inputClass} py-2 text-xs sm:w-auto`

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onChange(draft), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])
  return (
    <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line-strong px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <Search className="size-4 text-ink-faint" aria-hidden />
      <input aria-label={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className="w-full text-sm outline-none" />
    </div>
  )
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const idx = useIndex()
  return (
    <select aria-label="Category" value={value} onChange={(e) => onChange(e.target.value)} className={sel}>
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
  )
}

// ───────────────────────── products ─────────────────────────

const P_PARAMS = { q: '', status: '', availability: '', category: '', price: '', business: '' }

export function AdminProductsPage() {
  const idx = useIndex()
  const toast = useToast()
  const { value: f, set, clear } = useQueryState(P_PARAMS)
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    const needle = normalize(f.q)
    const cat = f.category ? idx.categoryBySlug.get(f.category) : undefined
    const ids = cat ? idx.categoryTree.get(cat.id) : undefined
    return idx.data.products.filter((p) => {
      if (needle) {
        const hay = normalize(`${p.name} ${p.sku} ${idx.businessById.get(p.businessId)?.name ?? ''}`)
        if (!needle.split(' ').every((t) => hay.includes(t))) return false
      }
      if (f.status && p.publicationStatus !== f.status) return false
      if (f.availability && p.availability !== f.availability) return false
      if (ids && !ids.has(p.categoryId)) return false
      if (f.category && !cat) return false
      if (f.price === 'quote' && p.priceType !== 'quote') return false
      if (f.price === 'priced' && p.priceType === 'quote') return false
      if (f.business && p.businessId !== f.business) return false
      return true
    })
  }, [idx, f])

  const exportCsv = () => {
    downloadCsv(
      'products',
      toCsv(rows, [
        { header: 'ID', value: (p) => p.id },
        { header: 'Name', value: (p) => p.name },
        { header: 'SKU', value: (p) => p.sku },
        { header: 'Business', value: (p) => idx.businessById.get(p.businessId)?.name },
        { header: 'Category', value: (p) => idx.categoryById.get(p.categoryId)?.name },
        { header: 'Price type', value: (p) => p.priceType },
        { header: 'Price (BWP)', value: (p) => p.price },
        { header: 'Unit', value: (p) => p.unit },
        { header: 'Availability', value: (p) => availabilityLabel(p.availability, p.unit) },
        { header: 'Publication', value: (p) => p.publicationStatus },
        { header: 'Created', value: (p) => p.createdAt },
      ]),
    )
    toast.success(`Exported ${rows.length} products`)
  }
  const active = Object.values(f).filter(Boolean).length
  const bizFilter = f.business ? idx.businessById.get(f.business) : undefined

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Every product across all suppliers. Publish, edit or remove listings."
        actions={
          <>
            <Button variant="soft" size="md" onClick={exportCsv} disabled={!rows.length}><Download /> Export CSV</Button>
            <Button variant="brand" size="md" onClick={() => setAdding(true)}><Plus /> Add product</Button>
          </>
        }
      />
      <TableCard
        className="mt-7"
        toolbar={
          <>
            <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search name, SKU or supplier…" />
            <select aria-label="Visibility" value={f.status} onChange={(e) => set({ status: e.target.value })} className={sel}>
              <option value="">All visibility</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="unpublished">Unpublished</option>
            </select>
            <CategorySelect value={f.category} onChange={(category) => set({ category })} />
            <select aria-label="Availability" value={f.availability} onChange={(e) => set({ availability: e.target.value })} className={sel}>
              <option value="">Any availability</option>
              {(['in_stock', 'low_stock', 'made_to_order', 'seasonal', 'out_of_stock'] as const).map((a) => (
                <option key={a} value={a}>{availabilityLabel(a)}</option>
              ))}
            </select>
            <select aria-label="Pricing" value={f.price} onChange={(e) => set({ price: e.target.value })} className={sel}>
              <option value="">Priced and quote-only</option>
              <option value="priced">Priced</option>
              <option value="quote">Quote only</option>
            </select>
            {bizFilter && <span className="rounded-full border border-line-green bg-mint px-3 py-1 text-xs font-medium text-brand">Supplier: {bizFilter.name}</span>}
            {active > 0 && <button type="button" onClick={() => clear()} className="text-xs font-semibold text-brand hover:text-forest">Clear filters ({active})</button>}
          </>
        }
      >
        <ProductTable rows={rows} actor={ADMIN_ACTOR} showBusiness businesses={idx.data.businesses} resetKey={JSON.stringify(f)} empty={<EmptyState className="border-0" title="No products match">Try a different search or remove a filter.</EmptyState>} />
      </TableCard>
      <ProductFormModal open={adding} onOpenChange={setAdding} businesses={idx.data.businesses} actor={ADMIN_ACTOR} />
    </>
  )
}

// ───────────────────────── services ─────────────────────────

const S_PARAMS = { q: '', status: '', availability: '', category: '', price: '', business: '' }

export function AdminServicesPage() {
  const idx = useIndex()
  const toast = useToast()
  const { value: f, set, clear } = useQueryState(S_PARAMS)
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    const needle = normalize(f.q)
    const cat = f.category ? idx.categoryBySlug.get(f.category) : undefined
    const ids = cat ? idx.categoryTree.get(cat.id) : undefined
    return idx.data.services.filter((s) => {
      if (needle) {
        const hay = normalize(`${s.name} ${idx.businessById.get(s.businessId)?.name ?? ''} ${s.serviceAreaNote}`)
        if (!needle.split(' ').every((t) => hay.includes(t))) return false
      }
      if (f.status && s.publicationStatus !== f.status) return false
      if (f.availability && s.availability !== f.availability) return false
      if (ids && !ids.has(s.categoryId)) return false
      if (f.category && !cat) return false
      if (f.price === 'quote' && s.pricingModel !== 'quote') return false
      if (f.price === 'priced' && s.pricingModel === 'quote') return false
      if (f.business && s.businessId !== f.business) return false
      return true
    })
  }, [idx, f])

  const exportCsv = () => {
    downloadCsv(
      'services',
      toCsv(rows, [
        { header: 'ID', value: (s) => s.id },
        { header: 'Name', value: (s) => s.name },
        { header: 'Provider', value: (s) => idx.businessById.get(s.businessId)?.name },
        { header: 'Category', value: (s) => idx.categoryById.get(s.categoryId)?.name },
        { header: 'Pricing model', value: (s) => s.pricingModel },
        { header: 'Price', value: (s) => servicePriceLabel(s) },
        { header: 'Coverage', value: (s) => s.coverage },
        { header: 'Service area', value: (s) => s.serviceAreaNote },
        { header: 'Availability', value: (s) => serviceAvailabilityLabel(s.availability) },
        { header: 'Publication', value: (s) => s.publicationStatus },
        { header: 'Created', value: (s) => s.createdAt },
      ]),
    )
    toast.success(`Exported ${rows.length} services`)
  }
  const active = Object.values(f).filter(Boolean).length

  return (
    <>
      <AdminPageHeader
        title="Services"
        description="Every service across all providers. Publish, edit or remove listings."
        actions={
          <>
            <Button variant="soft" size="md" onClick={exportCsv} disabled={!rows.length}><Download /> Export CSV</Button>
            <Button variant="brand" size="md" onClick={() => setAdding(true)}><Plus /> Add service</Button>
          </>
        }
      />
      <TableCard
        className="mt-7"
        toolbar={
          <>
            <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder="Search name, provider or area…" />
            <select aria-label="Visibility" value={f.status} onChange={(e) => set({ status: e.target.value })} className={sel}>
              <option value="">All visibility</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="unpublished">Unpublished</option>
            </select>
            <CategorySelect value={f.category} onChange={(category) => set({ category })} />
            <select aria-label="Availability" value={f.availability} onChange={(e) => set({ availability: e.target.value })} className={sel}>
              <option value="">Any availability</option>
              {(['available', 'limited', 'waitlist', 'unavailable'] as const).map((a) => (
                <option key={a} value={a}>{serviceAvailabilityLabel(a)}</option>
              ))}
            </select>
            <select aria-label="Pricing" value={f.price} onChange={(e) => set({ price: e.target.value })} className={sel}>
              <option value="">Priced and quote-only</option>
              <option value="priced">Priced</option>
              <option value="quote">Quote only</option>
            </select>
            {active > 0 && <button type="button" onClick={() => clear()} className="text-xs font-semibold text-brand hover:text-forest">Clear filters ({active})</button>}
          </>
        }
      >
        <ServiceTable rows={rows} actor={ADMIN_ACTOR} showBusiness businesses={idx.data.businesses} resetKey={JSON.stringify(f)} empty={<EmptyState className="border-0" title="No services match">Try a different search or remove a filter.</EmptyState>} />
      </TableCard>
      <ServiceFormModal open={adding} onOpenChange={setAdding} businesses={idx.data.businesses} actor={ADMIN_ACTOR} />
    </>
  )
}
