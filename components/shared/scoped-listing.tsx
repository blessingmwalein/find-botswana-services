'use client'

import { useMemo, useState } from 'react'
import { BusinessCard, ProductCard, ServiceCard } from '@/components/shared/cards'
import { EnquiryDialog } from '@/components/shared/enquiry-dialog'
import { SearchBox } from '@/components/shared/search-box'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { Tabs } from '@/components/ui/tabs'
import { BUSINESS_DEFAULTS, PRODUCT_DEFAULTS, SERVICE_DEFAULTS, paginate, searchBusinesses, searchProducts, searchServices, type SearchScope } from '@/lib/search/engine'
import { useIndex, useSettings } from '@/lib/store/hooks'
import type { Service } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'
import Link from 'next/link'

const PARAMS = { tab: 'businesses', q: '' }

/**
 * Businesses / products / services for a category, region or town — always computed from the shared
 * dataset with the same engine the directory pages use (nothing is hardcoded per place).
 */
export function ScopedListing({ scope, label }: { scope: SearchScope; label: string }) {
  const idx = useIndex()
  const { pageSize } = useSettings()
  const { value: f, page, set } = useQueryState(PARAMS)
  const [enquire, setEnquire] = useState<Service | null>(null)

  const facets = { category: scope.category ?? '', region: scope.region ?? '', town: scope.town ?? '' }
  const businesses = useMemo(() => searchBusinesses(idx, { ...BUSINESS_DEFAULTS, q: f.q, ...facets }), [idx, f.q, facets.category, facets.region, facets.town]) // eslint-disable-line react-hooks/exhaustive-deps
  const products = useMemo(() => searchProducts(idx, { ...PRODUCT_DEFAULTS, q: f.q, ...facets }), [idx, f.q, facets.category, facets.region, facets.town]) // eslint-disable-line react-hooks/exhaustive-deps
  const services = useMemo(() => searchServices(idx, { ...SERVICE_DEFAULTS, q: f.q, ...facets }), [idx, f.q, facets.category, facets.region, facets.town]) // eslint-disable-line react-hooks/exhaustive-deps

  const tab = ['businesses', 'products', 'services'].includes(f.tab) ? f.tab : 'businesses'
  const enquireBiz = enquire ? idx.businessById.get(enquire.businessId) : undefined
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...facets, q: f.q })) if (v) params.set(k, v)
  const full = `?${params}`

  const current = tab === 'businesses' ? businesses : tab === 'products' ? products : services
  const pg = paginate(current as unknown[], page, pageSize)

  return (
    <section aria-label={`Listings for ${label}`}>
      <Tabs
        label={`Listings for ${label}`}
        idPrefix="scope"
        value={tab}
        onChange={(t) => set({ tab: t === 'businesses' ? '' : t })}
        items={[
          { id: 'businesses', label: 'Businesses', count: businesses.length },
          { id: 'products', label: 'Products', count: products.length },
          { id: 'services', label: 'Services', count: services.length },
        ]}
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox className="sm:w-96" value={f.q} onCommit={(q) => set({ q })} suggestions={false} label={`Search within ${label}`} placeholder={`Search within ${label}`} />
        <Link href={`/${tab}${full}`} className="text-xs font-semibold text-brand hover:text-forest">
          Open in the {tab} directory with more filters →
        </Link>
      </div>

      <div role="tabpanel" id={`scope-panel-${tab}`} aria-labelledby={`scope-${tab}`} className="mt-5">
        {pg.total === 0 ? (
          <EmptyState title={`No ${tab} found`} action={f.q ? <Button variant="brand" size="md" onClick={() => set({ q: '' })}>Clear search</Button> : undefined}>
            {f.q ? <>Nothing in {label} matched “{f.q}”.</> : <>There are no {tab} listed for {label} yet.</>}
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 text-xs text-ink-muted" role="status">
              Showing {pg.from}–{pg.to} of {pg.total} {tab}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tab === 'businesses' && (pg.items as typeof businesses).map((h) => <BusinessCard key={h.item.id} business={h.item} />)}
              {tab === 'products' && (pg.items as typeof products).map((h) => <ProductCard key={h.item.id} product={h.item} />)}
              {tab === 'services' && (pg.items as typeof services).map((h) => <ServiceCard key={h.item.id} service={h.item} onEnquire={setEnquire} />)}
            </div>
            <Pagination className="mt-8" page={pg.page} pageCount={pg.pageCount} onPage={(p) => set({ page: p })} />
          </>
        )}
      </div>
      {enquire && enquireBiz && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(null)} business={enquireBiz} target={{ type: 'service', id: enquire.id, name: enquire.name }} />}
    </section>
  )
}
