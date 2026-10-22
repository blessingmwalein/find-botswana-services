'use client'

import { Package } from 'lucide-react'
import { useMemo } from 'react'
import { ProductCard } from '@/components/shared/cards'
import { ActiveFilters, CategoryFilter, FilterPanel, FilterSelect, LocationFilter, PriceRangeFilter, ResultsBar, type Chip } from '@/components/shared/filters'
import { BackLink, PageHeader, pageContainer } from '@/components/shared/page-header'
import { SearchBox } from '@/components/shared/search-box'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { availabilityLabel, formatPula } from '@/lib/format'
import { PRODUCT_DEFAULTS, paginate, searchProducts } from '@/lib/search/engine'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { ...PRODUCT_DEFAULTS, view: '' }
const AVAILABILITY = ['in_stock', 'low_stock', 'made_to_order', 'seasonal', 'out_of_stock'] as const

export function ProductsPage() {
  const idx = useIndex()
  const { pageSize } = useSettings()
  const { value: f, page, set, clear } = useQueryState(PARAMS)
  const view = f.view === 'list' ? 'list' : 'grid'

  const hits = useMemo(() => searchProducts(idx, f), [idx, f])
  const pg = paginate(hits, page, pageSize)
  const supplier = f.supplier ? idx.businessBySlug.get(f.supplier) : undefined

  const chips: Chip[] = []
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, onRemove: () => set({ q: '' }) })
  if (f.category) chips.push({ key: 'category', label: idx.categoryBySlug.get(f.category)?.name ?? f.category, onRemove: () => set({ category: '' }) })
  if (f.region) chips.push({ key: 'region', label: `${idx.regionBySlug.get(f.region)?.name ?? f.region} region`, onRemove: () => set({ region: '', town: '' }) })
  if (f.town) chips.push({ key: 'town', label: idx.townBySlug.get(f.town)?.name ?? f.town, onRemove: () => set({ town: '' }) })
  if (f.availability) chips.push({ key: 'availability', label: availabilityLabel(f.availability as (typeof AVAILABILITY)[number]), onRemove: () => set({ availability: '' }) })
  if (f.price) chips.push({ key: 'price', label: f.price === 'quote' ? 'Quote only' : 'Priced listings', onRemove: () => set({ price: '' }) })
  if (f.min || f.max) chips.push({ key: 'range', label: `${f.min ? formatPula(Number(f.min)) : 'Any'} – ${f.max ? formatPula(Number(f.max)) : 'Any'}`, onRemove: () => set({ min: '', max: '' }) })
  if (f.supplier) chips.push({ key: 'supplier', label: `Supplier: ${supplier?.name ?? f.supplier}`, onRemove: () => set({ supplier: '' }) })

  return (
    <div className={pageContainer}>
      <BackLink href="/">Back to home</BackLink>
      <PageHeader className="mt-7" eyebrow="Find Botswana directory" title="Products from local suppliers" description="Compare products, prices and availability from suppliers across Botswana." />
      <SearchBox className="mt-7" value={f.q} onCommit={(q) => set({ q })} suggestions={false} placeholder="Search products — e.g. cement, solar panel, tyres" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <FilterPanel activeCount={chips.filter((c) => c.key !== 'q').length} onClear={() => clear(['q', 'view', 'sort'])}>
          <CategoryFilter value={f.category} onChange={(category) => set({ category })} />
          <LocationFilter region={f.region} town={f.town} onChange={(p) => set(p)} />
          <FilterSelect label="Availability" value={f.availability} onChange={(availability) => set({ availability })}>
            <option value="">Any availability</option>
            {AVAILABILITY.map((a) => (
              <option key={a} value={a}>
                {availabilityLabel(a)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Pricing" value={f.price} onChange={(price) => set({ price })}>
            <option value="">Priced and quote-only</option>
            <option value="priced">Priced listings</option>
            <option value="quote">Quote only</option>
          </FilterSelect>
          <PriceRangeFilter min={f.min} max={f.max} onChange={(p) => set(p)} />
        </FilterPanel>

        <section aria-label="Product results">
          <ActiveFilters chips={chips} onClear={() => clear(['view', 'sort'])} />
          <ResultsBar
            from={pg.from}
            to={pg.to}
            total={pg.total}
            noun="product"
            sort={f.sort || 'relevance'}
            sortOptions={[
              { value: 'relevance', label: f.q ? 'Best match' : 'Recommended' },
              { value: 'name', label: 'Name (A–Z)' },
              { value: 'newest', label: 'Newest first' },
              { value: 'price-asc', label: 'Price: low to high' },
              { value: 'price-desc', label: 'Price: high to low' },
            ]}
            onSort={(sort) => set({ sort: sort === 'relevance' ? '' : sort })}
            view={view}
            onView={(v) => set({ view: v === 'grid' ? '' : v })}
          />
          {(f.sort === 'price-asc' || f.sort === 'price-desc') && <p className="-mt-2 mb-4 text-[11px] text-ink-faint">Quote-only listings have no price and are shown last.</p>}
          {pg.total === 0 ? (
            <EmptyState
              icon={<Package className="size-5" />}
              title="No products found"
              action={
                <Button variant="brand" size="md" onClick={() => clear(['view', 'sort'])}>
                  Clear all filters
                </Button>
              }
            >
              {f.q ? <>Nothing matched “{f.q}” with the current filters. Try a more general word (for example “pipe” instead of a size), or remove a filter.</> : <>No products match these filters. Try removing one.</>}
            </EmptyState>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'}>
                {pg.items.map((h) => (
                  <ProductCard key={h.item.id} product={h.item} variant={view} />
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
