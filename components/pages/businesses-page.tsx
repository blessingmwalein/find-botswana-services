'use client'

import { Building2 } from 'lucide-react'
import { useMemo } from 'react'
import { BusinessCard } from '@/components/shared/cards'
import { ActiveFilters, CategoryFilter, FilterPanel, FilterSelect, LocationFilter, ResultsBar, type Chip } from '@/components/shared/filters'
import { BackLink, PageHeader, pageContainer } from '@/components/shared/page-header'
import { SearchBox } from '@/components/shared/search-box'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { BUSINESS_DEFAULTS, paginate, searchBusinesses } from '@/lib/search/engine'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { ...BUSINESS_DEFAULTS, view: '' }
const TYPES = ['Retailer', 'Wholesaler', 'Manufacturer', 'Distributor', 'Contractor', 'Service provider', 'Importer', 'Cooperative']

export function BusinessesPage() {
  const idx = useIndex()
  const { pageSize } = useSettings()
  const { value: f, page, set, clear } = useQueryState(PARAMS)
  const view = f.view === 'list' ? 'list' : 'grid'

  const hits = useMemo(() => searchBusinesses(idx, f), [idx, f])
  const pg = paginate(hits, page, pageSize)

  const chips: Chip[] = []
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, onRemove: () => set({ q: '' }) })
  if (f.category) chips.push({ key: 'category', label: idx.categoryBySlug.get(f.category)?.name ?? f.category, onRemove: () => set({ category: '' }) })
  if (f.region) chips.push({ key: 'region', label: `${idx.regionBySlug.get(f.region)?.name ?? f.region} region`, onRemove: () => set({ region: '', town: '' }) })
  if (f.town) chips.push({ key: 'town', label: idx.townBySlug.get(f.town)?.name ?? f.town, onRemove: () => set({ town: '' }) })
  if (f.verified) chips.push({ key: 'verified', label: f.verified === 'verified' ? 'Verified only' : 'Not verified', onRemove: () => set({ verified: '' }) })
  if (f.type) chips.push({ key: 'type', label: f.type, onRemove: () => set({ type: '' }) })
  if (f.near) chips.push({ key: 'near', label: `Near ${idx.townBySlug.get(f.near)?.name ?? f.near}`, onRemove: () => set({ near: '', sort: f.sort === 'distance' ? '' : f.sort }) })

  const mapParams = new URLSearchParams()
  for (const k of ['q', 'category', 'region', 'town', 'verified'] as const) if (f[k]) mapParams.set(k, f[k])

  return (
    <div className={pageContainer}>
      <BackLink href="/">Back to home</BackLink>
      <PageHeader className="mt-7" eyebrow="Find Botswana directory" title="Businesses across Botswana" description="Search, filter and open every fictional demo listing." />
      <SearchBox className="mt-7" value={f.q} onCommit={(q) => set({ q })} suggestions={false} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <FilterPanel activeCount={chips.filter((c) => c.key !== 'q').length} onClear={() => clear(['q', 'view', 'sort'])}>
          <CategoryFilter value={f.category} onChange={(category) => set({ category })} />
          <LocationFilter region={f.region} town={f.town} onChange={(p) => set(p)} />
          <FilterSelect label="Verification" value={f.verified} onChange={(verified) => set({ verified })}>
            <option value="">All businesses</option>
            <option value="verified">Verified only</option>
            <option value="unverified">Not yet verified</option>
          </FilterSelect>
          <FilterSelect label="Business type" value={f.type} onChange={(type) => set({ type })}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Distance from" value={f.near} onChange={(near) => set({ near, sort: !near && f.sort === 'distance' ? '' : f.sort })}>
            <option value="">No reference point</option>
            {idx.data.towns
              .filter((t) => t.enabled)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
          </FilterSelect>
        </FilterPanel>

        <section aria-label="Business results">
          <ActiveFilters chips={chips} onClear={() => clear(['view', 'sort'])} />
          <ResultsBar
            from={pg.from}
            to={pg.to}
            total={pg.total}
            noun="business"
            sort={f.sort || 'relevance'}
            sortOptions={[
              { value: 'relevance', label: f.q ? 'Best match' : 'Recommended' },
              { value: 'name', label: 'Name (A–Z)' },
              { value: 'newest', label: 'Newest first' },
              { value: 'products', label: 'Most products' },
              { value: 'distance', label: f.near ? 'Nearest first' : 'Nearest (choose “Distance from”)', disabled: !f.near },
            ]}
            onSort={(sort) => set({ sort: sort === 'relevance' ? '' : sort })}
            view={view}
            onView={(v) => set({ view: v === 'grid' ? '' : v })}
            mapHref={`/map${mapParams.size ? `?${mapParams}` : ''}`}
          />
          {pg.total === 0 ? (
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="No businesses found"
              action={
                <Button variant="brand" size="md" onClick={() => clear(['view', 'sort'])}>
                  Clear all filters
                </Button>
              }
            >
              {f.q ? <>Nothing matched “{f.q}” with the current filters. Try a broader term, another town, or remove a filter.</> : <>No businesses match these filters. Try removing one.</>}
            </EmptyState>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'}>
                {pg.items.map((h) => (
                  <BusinessCard key={h.item.id} business={h.item} variant={view} distanceKm={h.distanceKm} />
                ))}
              </div>
              <Pagination className="mt-8" page={pg.page} pageCount={pg.pageCount} onPage={(p) => set({ page: p })} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
