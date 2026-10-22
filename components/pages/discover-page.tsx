'use client'

import { ArrowRight, Building2, Clock, MapPin, Package, SearchX, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CategoryTile } from '@/components/shared/browse-tiles'
import { BusinessCard, ProductCard, ServiceCard } from '@/components/shared/cards'
import { EnquiryDialog } from '@/components/shared/enquiry-dialog'
import { ActiveFilters, CategoryFilter, LocationFilter, type Chip } from '@/components/shared/filters'
import { BackLink, PageHeader, pageContainer } from '@/components/shared/page-header'
import { SearchBox } from '@/components/shared/search-box'
import { Button } from '@/components/ui/button'
import { Card, SectionHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { formatNumber } from '@/lib/format'
import { prefs } from '@/lib/store/actions'
import { unifiedSearch } from '@/lib/search/engine'
import { useIndex, usePrefs } from '@/lib/store/hooks'
import { parentCategories } from '@/lib/store/indexes'
import { categoryBusinessCounts, featuredBusinesses, recentBusinesses, regionBusinessCounts } from '@/lib/store/selectors'
import type { Service } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { q: '', category: '', region: '', town: '' }
const SUGGESTED = ['cement', 'solar installation', 'tyres', 'accountant', 'safari', 'irrigation']

function qs(params: Record<string, string>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v)
  return p.size ? `?${p}` : ''
}

function GroupHeader({ icon: Icon, title, total, href, noun }: { icon: React.ComponentType<{ className?: string }>; title: string; total: number; href: string; noun: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.02em] text-forest">
        <span className="grid grid-cols-1 size-8 place-items-center rounded-lg bg-mint text-brand">
          <Icon className="size-4" />
        </span>
        {title} <span className="text-sm font-normal text-ink-faint">{formatNumber(total)}</span>
      </h2>
      {total > 6 && (
        <Link href={href} className="text-xs font-semibold text-brand hover:text-forest">
          See all {formatNumber(total)} {noun} <ArrowRight className="ml-1 inline size-3" />
        </Link>
      )}
    </div>
  )
}

export function DiscoverPage() {
  const idx = useIndex()
  const { recentSearches } = usePrefs()
  const { value: f, set, clear } = useQueryState(PARAMS)
  const [enquire, setEnquire] = useState<Service | null>(null)

  const searching = !!(f.q.trim() || f.category || f.region || f.town)
  const scope = { category: f.category, region: f.region, town: f.town }
  const results = useMemo(() => {
    if (!searching) return null
    return unifiedSearch(idx, f.q, { category: f.category, region: f.region, town: f.town })
  }, [idx, searching, f.q, f.category, f.region, f.town])

  const catCounts = useMemo(() => categoryBusinessCounts(idx), [idx])
  const regionCounts = useMemo(() => regionBusinessCounts(idx), [idx])
  const enquireBiz = enquire ? idx.businessById.get(enquire.businessId) : undefined

  const chips: Chip[] = []
  if (f.category) chips.push({ key: 'category', label: idx.categoryBySlug.get(f.category)?.name ?? f.category, onRemove: () => set({ category: '' }) })
  if (f.region) chips.push({ key: 'region', label: `${idx.regionBySlug.get(f.region)?.name ?? f.region} region`, onRemove: () => set({ region: '', town: '' }) })
  if (f.town) chips.push({ key: 'town', label: idx.townBySlug.get(f.town)?.name ?? f.town, onRemove: () => set({ town: '' }) })

  return (
    <div className={pageContainer}>
      <BackLink href="/">Back to home</BackLink>
      <PageHeader className="mt-7" eyebrow="Find Botswana directory" title="Discover local suppliers" description="One search across businesses, products and services. Narrow it by category or place." />
      <SearchBox className="mt-7" value={f.q} onCommit={(q) => set({ q })} autoFocus={false} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CategoryFilter value={f.category} onChange={(category) => set({ category })} />
        <LocationFilter region={f.region} town={f.town} onChange={(p) => set(p)} />
      </div>
      {chips.length > 0 && <div className="mt-4"><ActiveFilters chips={chips} onClear={() => clear()} /></div>}

      {searching && results ? (
        <div className="mt-8" aria-live="polite">
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">{formatNumber(results.total)}</span> results{f.q ? <> for <span className="font-semibold text-ink">“{f.q}”</span></> : null}
            {results.categories.length > 0 && f.q ? (
              <span className="ml-3 inline-flex flex-wrap gap-2 align-middle">
                {results.categories.slice(0, 3).map((c) => (
                  <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-full border border-line-green bg-mint px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-sage">
                    Category: {c.name}
                  </Link>
                ))}
                {results.towns.slice(0, 2).map((t) => (
                  <Link key={t.slug} href={`/towns/${t.slug}`} className="rounded-full border border-line-green bg-mint px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-sage">
                    Town: {t.name}
                  </Link>
                ))}
              </span>
            ) : null}
          </p>

          {results.total === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={<SearchX className="size-5" />}
                title="No results found"
                action={
                  <>
                    <Button variant="brand" size="md" onClick={() => clear()}>
                      Clear search and filters
                    </Button>
                    <Button variant="soft" size="md" render={<Link href="/businesses" />}>
                      Browse all businesses
                    </Button>
                  </>
                }
              >
                We couldn’t find anything{f.q ? <> matching “{f.q}”</> : null} with these filters. Check the spelling, try a more general word, or search a wider area.
                <span className="mt-4 block text-xs">
                  Try:{' '}
                  {SUGGESTED.slice(0, 4).map((s, i) => (
                    <button key={s} type="button" onClick={() => set({ q: s, category: '', region: '', town: '' })} className="font-semibold text-brand hover:underline">
                      {s}
                      {i < 3 ? ', ' : ''}
                    </button>
                  ))}
                </span>
              </EmptyState>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-12">
              {results.businesses.length > 0 && (
                <section aria-label="Business results">
                  <GroupHeader icon={Building2} title="Businesses" total={results.businesses.length} noun="businesses" href={`/businesses${qs({ ...scope, q: f.q })}`} />
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {results.businesses.slice(0, 6).map((h) => (
                      <BusinessCard key={h.item.id} business={h.item} />
                    ))}
                  </div>
                </section>
              )}
              {results.products.length > 0 && (
                <section aria-label="Product results">
                  <GroupHeader icon={Package} title="Products" total={results.products.length} noun="products" href={`/products${qs({ ...scope, q: f.q })}`} />
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {results.products.slice(0, 6).map((h) => (
                      <ProductCard key={h.item.id} product={h.item} />
                    ))}
                  </div>
                </section>
              )}
              {results.services.length > 0 && (
                <section aria-label="Service results">
                  <GroupHeader icon={Wrench} title="Services" total={results.services.length} noun="services" href={`/services${qs({ ...scope, q: f.q })}`} />
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {results.services.slice(0, 6).map((h) => (
                      <ServiceCard key={h.item.id} service={h.item} onEnquire={setEnquire} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        <DiscoverHome recent={recentSearches} onSearch={(q) => set({ q })} catCounts={catCounts} regionCounts={regionCounts} />
      )}
      {enquire && enquireBiz && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(null)} business={enquireBiz} target={{ type: 'service', id: enquire.id, name: enquire.name }} />}
    </div>
  )
}

function DiscoverHome({ recent, onSearch, catCounts, regionCounts }: { recent: string[]; onSearch: (q: string) => void; catCounts: Map<string, number>; regionCounts: Map<string, number> }) {
  const idx = useIndex()
  const featured = featuredBusinesses(idx, 4)
  const newest = recentBusinesses(idx, 4)
  const categories = parentCategories(idx).filter((c) => c.enabled)
  const directories = [
    { href: '/businesses', title: 'Businesses', icon: Building2, count: idx.publicBusinesses.length, text: 'Every listed company, filterable by category and place.' },
    { href: '/products', title: 'Products', icon: Package, count: idx.publicProducts.length, text: 'Compare products, prices and availability.' },
    { href: '/services', title: 'Services', icon: Wrench, count: idx.publicServices.length, text: 'Providers filtered by the areas they serve.' },
    { href: '/map', title: 'Explore map', icon: MapPin, count: idx.publicBusinesses.length, text: 'See every business plotted across Botswana.' },
  ]
  return (
    <div className="mt-10 flex flex-col gap-14">
      <section aria-label="Recent and suggested searches" className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-forest">
              <Clock className="size-4 text-brand" /> Recent demo searches
            </h2>
            {recent.length > 0 && (
              <button type="button" onClick={() => prefs.clearRecentSearches()} className="text-xs font-semibold text-brand hover:text-forest">
                Clear
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {recent.length === 0 && <p className="text-xs text-ink-muted">Your recent searches will appear here.</p>}
            {recent.map((s) => (
              <button key={s} type="button" onClick={() => onSearch(s)} className="rounded-full border border-[#d7dfd7] bg-white px-3 py-1.5 text-xs transition hover:border-brand hover:text-brand">
                {s}
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-forest">Try searching for</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button key={s} type="button" onClick={() => onSearch(s)} className="rounded-full border border-[#d7dfd7] bg-white px-3 py-1.5 text-xs transition hover:border-brand hover:text-brand">
                {s}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section aria-label="Directories" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {directories.map((d) => (
          <Link key={d.href} href={d.href} className="group rounded-xl border border-line bg-white p-5 transition hover:border-[#a9c7af] hover:bg-[#f4f9f4]">
            <span className="grid grid-cols-1 size-10 place-items-center rounded-xl bg-mint text-brand">
              <d.icon className="size-5" />
            </span>
            <h2 className="mt-5 font-semibold text-forest">{d.title}</h2>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{d.text}</p>
            <p className="mt-3 text-xs font-semibold text-brand">
              {formatNumber(d.count)} listed <ArrowRight className="ml-1 inline size-3 transition group-hover:translate-x-0.5" />
            </p>
          </Link>
        ))}
      </section>

      <section aria-label="Featured businesses">
        <SectionHeading eyebrow="Featured" title="Trusted by customers" />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>

      <section aria-label="Browse by category">
        <SectionHeading eyebrow="Categories" title="Jump to a category" action={<Link href="/categories" className="text-sm font-semibold text-brand hover:text-forest">All categories <ArrowRight className="ml-1 inline size-4" /></Link>} />
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <CategoryTile key={c.id} category={c} count={catCounts.get(c.id) ?? 0} />
          ))}
        </div>
      </section>

      <section aria-label="Browse by region">
        <SectionHeading eyebrow="Regions" title="Start with where you are" action={<Link href="/regions" className="text-sm font-semibold text-brand hover:text-forest">All regions <ArrowRight className="ml-1 inline size-4" /></Link>} />
        <div className="mt-6 flex flex-wrap gap-2">
          {idx.data.regions
            .filter((r) => r.enabled)
            .map((r) => (
              <Link key={r.id} href={`/regions/${r.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[#d7dfd7] bg-white px-4 py-2 text-sm transition hover:border-brand hover:text-brand">
                <MapPin className="size-3.5 text-brand" /> {r.name}
                <span className="text-xs text-ink-faint">{formatNumber(regionCounts.get(r.id) ?? 0)}</span>
              </Link>
            ))}
        </div>
      </section>

      <section aria-label="Recently added">
        <SectionHeading eyebrow="Recently added" title="New to the directory" action={<Link href="/businesses?sort=newest" className="text-sm font-semibold text-brand hover:text-forest">See newest <ArrowRight className="ml-1 inline size-4" /></Link>} />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {newest.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>
    </div>
  )
}
