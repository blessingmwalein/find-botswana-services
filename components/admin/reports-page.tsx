'use client'

import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { ColumnChart, Panel, StatCard } from '@/components/admin/widgets'
import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { downloadCsv, toCsv } from '@/lib/csv'
import { availabilityLabel, formatNumber } from '@/lib/format'
import { businessLifecycle, type BusinessLifecycle } from '@/lib/rules'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories, primaryCategory } from '@/lib/store/indexes'
import { monthlyBuckets, referenceTime } from '@/lib/store/stats'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { from: '', to: '', region: '', town: '', category: '', verified: '', status: '' }
const STATUS: { id: BusinessLifecycle; label: string }[] = [
  { id: 'published', label: 'Published' },
  { id: 'pending', label: 'Pending approval' },
  { id: 'changes_requested', label: 'Changes requested' },
  { id: 'draft', label: 'Draft' },
  { id: 'unpublished', label: 'Unpublished' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
]
const statusLabel = (id: string) => STATUS.find((s) => s.id === id)?.label ?? id

type Cell = string | number

function ReportTable({ title, subtitle, headers, rows, filename, total }: { title: string; subtitle?: string; headers: string[]; rows: Cell[][]; filename: string; total?: Cell[] }) {
  const toast = useToast()
  const exportIt = () => {
    const all = total ? [...rows, total] : rows
    downloadCsv(filename, toCsv(all, headers.map((h, i) => ({ header: h, value: (r: Cell[]) => r[i] }))))
    toast.success(`Exported “${title}” (${rows.length} rows)`)
  }
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        <Button variant="soft" size="md-sm" onClick={exportIt} disabled={!rows.length}>
          <Download /> CSV
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No data for the current filters.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <caption className="sr-only">{title}</caption>
            <thead className="text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              <tr>
                {headers.map((h, i) => (
                  <th key={h} scope="col" className={`px-2 py-2 font-semibold ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {rows.map((r, ri) => (
                <tr key={`${r[0]}-${ri}`}>
                  {r.map((c, i) => (
                    <td key={i} className={`px-2 py-2.5 ${i > 0 ? 'text-right tabular-nums text-ink-muted' : 'font-medium text-ink'}`}>{typeof c === 'number' ? formatNumber(c) : c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            {total && (
              <tfoot className="border-t-2 border-line-strong">
                <tr>
                  {total.map((c, i) => (
                    <th key={i} scope={i === 0 ? 'row' : undefined} className={`px-2 py-2.5 font-semibold text-ink ${i > 0 ? 'text-right tabular-nums' : ''}`}>{typeof c === 'number' ? formatNumber(c) : c}</th>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </Panel>
  )
}

export function AdminReportsPage() {
  const idx = useIndex()
  const toast = useToast()
  const { value: f, set, clear } = useQueryState(PARAMS)

  const R = useMemo(() => {
    const data = idx.data
    const region = f.region ? idx.regionBySlug.get(f.region) : undefined
    const town = f.town ? idx.townBySlug.get(f.town) : undefined
    const cat = f.category ? idx.categoryBySlug.get(f.category) : undefined
    const catIds = cat ? idx.categoryTree.get(cat.id) : undefined
    const from = f.from ? Date.parse(`${f.from}T00:00:00Z`) : null
    const to = f.to ? Date.parse(`${f.to}T23:59:59Z`) : null

    const businesses = data.businesses.filter((b) => {
      const created = Date.parse(b.createdAt)
      if (from !== null && created < from) return false
      if (to !== null && created > to) return false
      if (f.region && region?.id !== b.regionId) return false
      if (f.town && town?.id !== b.townId) return false
      if (catIds && !b.categoryIds.some((c) => catIds.has(c))) return false
      if (f.category && !cat) return false
      if (f.verified === 'verified' && b.verificationStatus !== 'verified') return false
      if (f.verified === 'unverified' && b.verificationStatus === 'verified') return false
      if (f.status && businessLifecycle(b) !== f.status) return false
      return true
    })
    const ids = new Set(businesses.map((b) => b.id))
    const products = data.products.filter((p) => ids.has(p.businessId))
    const services = data.services.filter((s) => ids.has(s.businessId))
    const pCount = (set: typeof businesses) => {
      const s = new Set(set.map((b) => b.id))
      return products.filter((p) => s.has(p.businessId)).length
    }
    const sCount = (set: typeof businesses) => {
      const s = new Set(set.map((b) => b.id))
      return services.filter((x) => s.has(x.businessId)).length
    }
    const published = (set: typeof businesses) => set.filter((b) => businessLifecycle(b) === 'published').length
    const verified = (set: typeof businesses) => set.filter((b) => b.verificationStatus === 'verified').length

    const byRegion: Cell[][] = data.regions.map((r) => {
      const bs = businesses.filter((b) => b.regionId === r.id)
      return [r.name, bs.length, published(bs), verified(bs), pCount(bs), sCount(bs)]
    })
    const byTown: Cell[][] = data.towns
      .map((t) => {
        const bs = businesses.filter((b) => b.townId === t.id)
        return [t.name, idx.regionById.get(t.regionId)?.name ?? '', bs.length, published(bs), pCount(bs), sCount(bs)] as Cell[]
      })
      .filter((r) => (r[2] as number) > 0)
      .sort((a, b) => (b[2] as number) - (a[2] as number) || String(a[0]).localeCompare(String(b[0])))

    const catRows: Cell[][] = []
    for (const p of parentCategories(idx)) {
      for (const c of [p, ...childCategories(idx, p.id)]) {
        const tree = idx.categoryTree.get(c.id)!
        const bs = businesses.filter((b) => b.categoryIds.some((x) => tree.has(x)))
        catRows.push([c.parentId ? `   ${c.name}` : c.name, bs.length, products.filter((x) => tree.has(x.categoryId)).length, services.filter((x) => tree.has(x.categoryId)).length])
      }
    }
    const verificationRows: Cell[][] = [
      ['Verified', verified(businesses), businesses.length ? `${Math.round((verified(businesses) / businesses.length) * 100)}%` : '0%'],
      ['Unverified', businesses.length - verified(businesses), businesses.length ? `${Math.round(((businesses.length - verified(businesses)) / businesses.length) * 100)}%` : '0%'],
    ]
    const statusRows: Cell[][] = STATUS.map((s) => [s.label, businesses.filter((b) => businessLifecycle(b) === s.id).length])
    const availability: Cell[][] = (['in_stock', 'low_stock', 'made_to_order', 'seasonal', 'out_of_stock'] as const).map((a) => [availabilityLabel(a), products.filter((p) => p.availability === a).length])
    const priceTypes: Cell[][] = [
      ['Fixed price', products.filter((p) => p.priceType === 'fixed').length],
      ['Price from', products.filter((p) => p.priceType === 'from').length],
      ['Quote only', products.filter((p) => p.priceType === 'quote').length],
    ]
    const perBiz = businesses.map((b) => products.filter((p) => p.businessId === b.id).length)
    const histogram: Cell[][] = [
      ['No products', perBiz.filter((n) => n === 0).length],
      ['1–3 products', perBiz.filter((n) => n >= 1 && n <= 3).length],
      ['4–7 products', perBiz.filter((n) => n >= 4 && n <= 7).length],
      ['8–15 products', perBiz.filter((n) => n >= 8 && n <= 15).length],
      ['16+ products', perBiz.filter((n) => n >= 16).length],
    ]
    const ref = referenceTime(data)
    const trend = monthlyBuckets(businesses.map((b) => b.submittedAt ?? b.createdAt), 12, ref)
    return { businesses, products, services, byRegion, byTown, catRows, verificationRows, statusRows, availability, priceTypes, histogram, trend }
  }, [idx, f])

  const townsOfRegion = idx.data.towns.filter((t) => !f.region || t.regionId === idx.regionBySlug.get(f.region)?.id).sort((a, b) => a.name.localeCompare(b.name))
  const active = Object.values(f).filter(Boolean).length
  const sel = `${inputClass} py-2 text-xs`

  const exportBusinesses = () => {
    downloadCsv(
      'businesses-report',
      toCsv(R.businesses, [
        { header: 'ID', value: (b) => b.id },
        { header: 'Name', value: (b) => b.name },
        { header: 'Primary category', value: (b) => primaryCategory(idx, b)?.name },
        { header: 'Town', value: (b) => idx.townById.get(b.townId)?.name },
        { header: 'Region', value: (b) => idx.regionById.get(b.regionId)?.name },
        { header: 'Status', value: (b) => statusLabel(businessLifecycle(b)) },
        { header: 'Verification', value: (b) => b.verificationStatus },
        { header: 'Products', value: (b) => idx.productsByBusiness.get(b.id)?.length ?? 0 },
        { header: 'Services', value: (b) => idx.servicesByBusiness.get(b.id)?.length ?? 0 },
        { header: 'Created', value: (b) => b.createdAt },
        { header: 'Submitted', value: (b) => b.submittedAt },
      ]),
    )
    toast.success(`Exported ${R.businesses.length} businesses with the current filters`)
  }

  const published = R.businesses.filter((b) => businessLifecycle(b) === 'published').length
  const avgProducts = R.businesses.length ? (R.products.length / R.businesses.length).toFixed(1) : '0'

  return (
    <>
      <AdminPageHeader
        title="Reports"
        description="Data-driven breakdowns of the directory. Filters apply to every table and every export."
        actions={
          <Button variant="brand" size="md" onClick={exportBusinesses} disabled={!R.businesses.length}>
            <Download /> Export filtered businesses
          </Button>
        }
      />

      <div className="mt-6 rounded-xl border border-line-strong bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium">Created from<input type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} className={`${sel} mt-1.5`} /></label>
          <label className="text-xs font-medium">Created to<input type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} className={`${sel} mt-1.5`} /></label>
          <label className="text-xs font-medium">Region
            <select value={f.region} onChange={(e) => set({ region: e.target.value, town: '' })} className={`${sel} mt-1.5`}>
              <option value="">All regions</option>
              {idx.data.regions.map((r) => (<option key={r.id} value={r.slug}>{r.name}</option>))}
            </select>
          </label>
          <label className="text-xs font-medium">Town
            <select value={f.town} onChange={(e) => set({ town: e.target.value })} className={`${sel} mt-1.5`}>
              <option value="">All towns</option>
              {townsOfRegion.map((t) => (<option key={t.id} value={t.slug}>{t.name}</option>))}
            </select>
          </label>
          <label className="text-xs font-medium">Category
            <select value={f.category} onChange={(e) => set({ category: e.target.value })} className={`${sel} mt-1.5`}>
              <option value="">All categories</option>
              {parentCategories(idx).map((p) => (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.slug}>All {p.name}</option>
                  {childCategories(idx, p.id).map((c) => (<option key={c.id} value={c.slug}>{c.name}</option>))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">Verification
            <select value={f.verified} onChange={(e) => set({ verified: e.target.value })} className={`${sel} mt-1.5`}>
              <option value="">Any</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </label>
          <label className="text-xs font-medium">Publication status
            <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={`${sel} mt-1.5`}>
              <option value="">Any status</option>
              {STATUS.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
            </select>
          </label>
          <div className="flex items-end">
            <Button variant="soft" size="md" onClick={() => clear()} disabled={!active}>Reset filters{active ? ` (${active})` : ''}</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-live="polite">
        <StatCard label="Businesses" value={R.businesses.length} />
        <StatCard label="Published" value={published} />
        <StatCard label="Verified" value={R.businesses.filter((b) => b.verificationStatus === 'verified').length} />
        <StatCard label="Products" value={R.products.length} note={`${avgProducts} per business`} />
        <StatCard label="Services" value={R.services.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Submission trend" subtitle="Businesses submitted or created per month (last 12 months)" className="xl:col-span-2">
          <ColumnChart data={R.trend.map((t) => ({ label: t.label, value: t.count }))} ariaLabel="Businesses submitted per month" height={170} />
        </Panel>
        <ReportTable title="By region" headers={['Region', 'Businesses', 'Published', 'Verified', 'Products', 'Services']} rows={R.byRegion} filename="report-by-region" total={['Total', R.businesses.length, published, R.businesses.filter((b) => b.verificationStatus === 'verified').length, R.products.length, R.services.length]} />
        <ReportTable title="By town" subtitle="Towns with at least one business" headers={['Town', 'Region', 'Businesses', 'Published', 'Products', 'Services']} rows={R.byTown} filename="report-by-town" />
        <ReportTable title="By category" subtitle="Parent categories include their sub-categories" headers={['Category', 'Businesses', 'Products', 'Services']} rows={R.catRows} filename="report-by-category" />
        <div className="grid grid-cols-1 content-start gap-6">
          <ReportTable title="Verification status" headers={['Status', 'Businesses', 'Share']} rows={R.verificationRows} filename="report-verification" />
          <ReportTable title="Publication status" headers={['Status', 'Businesses']} rows={R.statusRows} filename="report-publication-status" />
        </div>
        <ReportTable title="Products by availability" headers={['Availability', 'Products']} rows={R.availability} filename="report-product-availability" />
        <ReportTable title="Products by pricing" headers={['Pricing', 'Products']} rows={R.priceTypes} filename="report-product-pricing" />
        <ReportTable title="Catalogue size distribution" subtitle="Businesses by number of products" headers={['Products listed', 'Businesses']} rows={R.histogram} filename="report-catalogue-size" />
        <ReportTable title="Submission trend (table)" headers={['Month', 'Businesses']} rows={R.trend.map((t) => [t.label, t.count])} filename="report-submission-trend" />
      </div>
    </>
  )
}
