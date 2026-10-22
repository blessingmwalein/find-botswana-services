'use client'

import { Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ServiceCard } from '@/components/shared/cards'
import { EnquiryDialog } from '@/components/shared/enquiry-dialog'
import { ActiveFilters, CategoryFilter, FilterPanel, FilterSelect, LocationFilter, ResultsBar, type Chip } from '@/components/shared/filters'
import { BackLink, PageHeader, pageContainer } from '@/components/shared/page-header'
import { SearchBox } from '@/components/shared/search-box'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { serviceAvailabilityLabel } from '@/lib/format'
import { SERVICE_DEFAULTS, paginate, searchServices } from '@/lib/search/engine'
import { useIndex, useSettings } from '@/lib/store/hooks'
import type { Service, ServiceAvailability } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { ...SERVICE_DEFAULTS, view: '' }
const AVAILABILITY: ServiceAvailability[] = ['available', 'limited', 'waitlist', 'unavailable']
const COVERAGE_LABEL: Record<string, string> = { local: 'Local', regional: 'Regional', nationwide: 'Nationwide' }

export function ServicesPage() {
  const idx = useIndex()
  const { pageSize } = useSettings()
  const { value: f, page, set, clear } = useQueryState(PARAMS)
  const view = f.view === 'list' ? 'list' : 'grid'
  const [enquire, setEnquire] = useState<Service | null>(null)

  const hits = useMemo(() => searchServices(idx, f), [idx, f])
  const pg = paginate(hits, page, pageSize)
  const provider = f.provider ? idx.businessBySlug.get(f.provider) : undefined
  const enquireBiz = enquire ? idx.businessById.get(enquire.businessId) : undefined

  const chips: Chip[] = []
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, onRemove: () => set({ q: '' }) })
  if (f.category) chips.push({ key: 'category', label: idx.categoryBySlug.get(f.category)?.name ?? f.category, onRemove: () => set({ category: '' }) })
  if (f.region) chips.push({ key: 'region', label: `Serves ${idx.regionBySlug.get(f.region)?.name ?? f.region}`, onRemove: () => set({ region: '', town: '' }) })
  if (f.town) chips.push({ key: 'town', label: `Serves ${idx.townBySlug.get(f.town)?.name ?? f.town}`, onRemove: () => set({ town: '' }) })
  if (f.availability) chips.push({ key: 'availability', label: serviceAvailabilityLabel(f.availability as ServiceAvailability), onRemove: () => set({ availability: '' }) })
  if (f.price) chips.push({ key: 'price', label: f.price === 'quote' ? 'Quote only' : 'Priced listings', onRemove: () => set({ price: '' }) })
  if (f.coverage) chips.push({ key: 'coverage', label: `${COVERAGE_LABEL[f.coverage] ?? f.coverage} coverage`, onRemove: () => set({ coverage: '' }) })
  if (f.provider) chips.push({ key: 'provider', label: `Provider: ${provider?.name ?? f.provider}`, onRemove: () => set({ provider: '' }) })

  return (
    <div className={pageContainer}>
      <BackLink href="/">Back to home</BackLink>
      <PageHeader className="mt-7" eyebrow="Find Botswana directory" title="Find a service provider" description="Filter by the area a provider actually serves — not just where their office is." />
      <SearchBox className="mt-7" value={f.q} onCommit={(q) => set({ q })} suggestions={false} placeholder="Search services — e.g. solar installation, bookkeeping, tyre fitting" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <FilterPanel activeCount={chips.filter((c) => c.key !== 'q').length} onClear={() => clear(['q', 'view', 'sort'])}>
          <CategoryFilter value={f.category} onChange={(category) => set({ category })} />
          <LocationFilter region={f.region} town={f.town} onChange={(p) => set(p)} />
          <FilterSelect label="Pricing" value={f.price} onChange={(price) => set({ price })}>
            <option value="">Priced and quote-only</option>
            <option value="priced">Priced listings</option>
            <option value="quote">Quote only</option>
          </FilterSelect>
          <FilterSelect label="Availability" value={f.availability} onChange={(availability) => set({ availability })}>
            <option value="">Any availability</option>
            {AVAILABILITY.map((a) => (
              <option key={a} value={a}>
                {serviceAvailabilityLabel(a)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Coverage" value={f.coverage} onChange={(coverage) => set({ coverage })}>
            <option value="">Any coverage</option>
            <option value="local">Local</option>
            <option value="regional">Regional</option>
            <option value="nationwide">Nationwide</option>
          </FilterSelect>
        </FilterPanel>

        <section aria-label="Service results">
          <ActiveFilters chips={chips} onClear={() => clear(['view', 'sort'])} />
          <ResultsBar
            from={pg.from}
            to={pg.to}
            total={pg.total}
            noun="service"
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
          {pg.total === 0 ? (
            <EmptyState
              icon={<Wrench className="size-5" />}
              title="No services found"
              action={
                <Button variant="brand" size="md" onClick={() => clear(['view', 'sort'])}>
                  Clear all filters
                </Button>
              }
            >
              {f.q ? <>Nothing matched “{f.q}” with the current filters. Try a broader term, or search a wider area.</> : <>No services match these filters. Try removing one.</>}
            </EmptyState>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3'}>
                {pg.items.map((h) => (
                  <ServiceCard key={h.item.id} service={h.item} variant={view} onEnquire={setEnquire} />
                ))}
              </div>
              <Pagination className="mt-8" page={pg.page} pageCount={pg.pageCount} onPage={(p) => set({ page: p })} />
            </>
          )}
        </section>
      </div>
      {enquire && enquireBiz && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(null)} business={enquireBiz} target={{ type: 'service', id: enquire.id, name: enquire.name }} />}
    </div>
  )
}
