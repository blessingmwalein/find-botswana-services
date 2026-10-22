'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { MapView } from '@/components/map/map-loader'
import { BusinessCard, ProductCard, ServiceCard } from '@/components/shared/cards'
import { CategoryTile, RegionTile } from '@/components/shared/browse-tiles'
import { EnquiryDialog } from '@/components/shared/enquiry-dialog'
import { SearchBox } from '@/components/shared/search-box'
import { DemoBadge } from '@/components/layout/logo'
import { SectionHeading } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { parentCategories } from '@/lib/store/indexes'
import { categoryBusinessCounts, featuredBusinesses, featuredServices, popularProducts, recentBusinesses, regionBusinessCounts } from '@/lib/store/selectors'
import type { Service } from '@/lib/types'

const POPULAR = ['Building materials', 'Cement', 'Plumbing', 'Solar', 'Tyres', 'Agricultural supplies']

function SearchPanel() {
  const idx = useIndex()
  const router = useRouter()
  const [term, setTerm] = useState('')
  const [region, setRegion] = useState('')
  const [category, setCategory] = useState('')

  const go = (q: string) => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (region) params.set('region', region)
    if (category) params.set('category', category)
    router.push(`/discover${params.size ? `?${params}` : ''}`)
  }

  const select = 'rounded-xl bg-canvas px-4 py-3 text-sm text-ink-muted outline-none focus:ring-2 focus:ring-brand/20'
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        go(term)
      }}
      className="rounded-2xl border border-[#dce5dc] bg-white p-2 shadow-[0_14px_40px_rgba(18,55,42,0.10)]"
    >
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
        <SearchBox bare value="" debounce={false} onDraftChange={setTerm} onCommit={go} placeholder="Business, product or service" label="Search the directory" />
        <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} className={select}>
          <option value="">All regions</option>
          {idx.data.regions
            .filter((r) => r.enabled)
            .map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name}
              </option>
            ))}
        </select>
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={select}>
          <option value="">All categories</option>
          {parentCategories(idx)
            .filter((c) => c.enabled)
            .map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
        </select>
        <button type="submit" className="rounded-xl bg-brand px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest">
          Search
        </button>
      </div>
    </form>
  )
}

const more = 'text-sm font-semibold text-brand hover:text-forest'

export function HomePage() {
  const idx = useIndex()
  const settings = useSettings()
  const [enquire, setEnquire] = useState<Service | null>(null)

  const counts = useMemo(() => categoryBusinessCounts(idx), [idx])
  const regionCounts = useMemo(() => regionBusinessCounts(idx), [idx])
  const categories = parentCategories(idx).filter((c) => c.enabled)
  const featured = featuredBusinesses(idx, settings.featuredLimit)
  const products = popularProducts(idx, 8)
  const services = featuredServices(idx, 6)
  const recent = recentBusinesses(idx, 8)
  const enquireBiz = enquire ? idx.businessById.get(enquire.businessId) : undefined

  return (
    <>
      <section className="mx-auto max-w-[1240px] px-5 pb-14 pt-16 lg:px-8 lg:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <DemoBadge />
            <span className="text-xs text-ink-muted">
              Explore {formatNumber(idx.publicBusinesses.length)} local businesses · {formatNumber(idx.publicProducts.length)} products · {formatNumber(idx.publicServices.length)} services
            </span>
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.03] tracking-[-0.055em] text-forest md:text-7xl">
            Find the right business, <span className="text-brand">closer to home.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-muted">Discover trusted local suppliers, products and services across Botswana — without the long drive to find them.</p>
        </div>
        <div className="mt-10 max-w-5xl">
          <SearchPanel />
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="mr-1 font-medium">Popular:</span>
            {POPULAR.map((item) => (
              <Link key={item} href={`/discover?q=${encodeURIComponent(item)}`} className="rounded-full border border-[#d7dfd7] bg-white px-3 py-1.5 transition hover:border-brand hover:text-brand">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
          <SectionHeading
            eyebrow="Browse the directory"
            title="Everything you need, in one place."
            action={
              <Link href="/categories" className={`hidden sm:block ${more}`}>
                View all categories <ArrowRight className="ml-1 inline size-4" />
              </Link>
            }
          />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <CategoryTile key={c.id} category={c} count={counts.get(c.id) ?? 0} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <SectionHeading
          eyebrow="Selected businesses"
          title="A better way to buy local."
          action={
            <Link href="/businesses" className={more}>
              Explore all <ArrowRight className="ml-1 inline size-4" />
            </Link>
          }
        />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
          <SectionHeading
            eyebrow="Popular products"
            title="What people are asking suppliers about."
            action={
              <Link href="/products" className={more}>
                Browse products <ArrowRight className="ml-1 inline size-4" />
              </Link>
            }
          />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <SectionHeading
          eyebrow="Featured services"
          title="Skilled providers, near you."
          action={
            <Link href="/services" className={more}>
              Browse services <ArrowRight className="ml-1 inline size-4" />
            </Link>
          }
        />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} onEnquire={setEnquire} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid grid-cols-1 max-w-[1240px] gap-8 px-5 py-14 lg:grid-cols-[1fr_1.6fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Explore the map</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-forest">See who’s nearby, across the whole country.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-ink-muted">Every business has a position on the map. Filter by category, region or town, then open a profile straight from its pin.</p>
            <Link href="/map" className="mt-6 inline-flex items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest">
              Open the map <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </div>
          <div className="relative">
            <MapView businesses={idx.publicBusinesses} interactive={false} className="h-[320px] w-full" />
            <Link href="/map" aria-label="Open the interactive map" className="absolute inset-0 z-[600] rounded-xl focus-visible:outline-2" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <SectionHeading
          eyebrow="Discover by region"
          title="Start with where you are."
          action={
            <Link href="/regions" className={more}>
              All regions <ArrowRight className="ml-1 inline size-4" />
            </Link>
          }
        />
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {idx.data.regions
            .filter((r) => r.enabled)
            .map((r) => (
              <RegionTile key={r.id} region={r} count={regionCounts.get(r.id) ?? 0} towns={idx.townsByRegion.get(r.id)?.length ?? 0} />
            ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
          <SectionHeading
            eyebrow="Recently added"
            title="New to the directory."
            action={
              <Link href="/businesses?sort=newest" className={more}>
                See newest <ArrowRight className="ml-1 inline size-4" />
              </Link>
            }
          />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {recent.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-forest text-white">
        <div className="mx-auto grid grid-cols-1 max-w-[1240px] gap-12 px-5 py-16 lg:grid-cols-[1fr_1.4fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-forest-soft">Why Find Botswana</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-[-0.04em]">Local knowledge. Better decisions.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#c5d5c8]">Search, compare and connect with businesses that serve your town and region.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              ['01', 'Search locally', 'Find suppliers by product, service, category or town.'],
              ['02', 'Compare clearly', 'See what businesses offer before you make the trip.'],
              ['03', 'Connect directly', 'Contact suppliers with the details you need.'],
            ].map(([n, t, d]) => (
              <div key={n} className="border-l border-white/15 pl-5">
                <span className="text-xs text-on-forest-soft">{n}</span>
                <h3 className="mt-8 font-semibold">{t}</h3>
                <p className="mt-2 text-xs leading-5 text-[#b4cabe]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="register" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
        <div className="flex flex-col justify-between gap-7 rounded-2xl bg-sage p-8 md:flex-row md:items-center md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Grow your reach</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-forest">Put your business on the map.</h2>
            <p className="mt-2 text-sm text-ink-muted">Create a listing and help customers find you closer to home.</p>
          </div>
          <Link href="/business/register" className="rounded-lg bg-brand px-5 py-3 text-center text-sm font-semibold text-white hover:bg-forest">
            List your business <ArrowRight className="ml-1 inline size-4" />
          </Link>
        </div>
      </section>

      {enquire && enquireBiz && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(null)} business={enquireBiz} target={{ type: 'service', id: enquire.id, name: enquire.name }} />}
    </>
  )
}
