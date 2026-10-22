'use client'

import { ArrowRight, List, MapPin, Phone, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { MapView } from '@/components/map/map-loader'
import { VerifiedMark } from '@/components/shared/cards'
import { ActiveFilters, CategoryFilter, FilterSelect, LocationFilter, type Chip } from '@/components/shared/filters'
import { SearchBox } from '@/components/shared/search-box'
import { BizLogo } from '@/components/ui/art'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { BUSINESS_DEFAULTS, searchBusinesses } from '@/lib/search/engine'
import { useIndex } from '@/lib/store/hooks'
import { primaryCategory } from '@/lib/store/indexes'
import type { Business } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { q: BUSINESS_DEFAULTS.q, category: '', region: '', town: '', verified: '' }
const LIST_STEP = 30

export function MapPage() {
  const idx = useIndex()
  const { value: f, set, clear } = useQueryState(PARAMS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pane, setPane] = useState<'map' | 'list'>('map')
  const [shown, setShown] = useState(LIST_STEP)

  const hits = useMemo(() => searchBusinesses(idx, { ...BUSINESS_DEFAULTS, ...f }), [idx, f])
  const businesses = useMemo(() => hits.map((h) => h.item), [hits])
  const fitKey = `${f.q}|${f.category}|${f.region}|${f.town}|${f.verified}`
  const selected = selectedId ? businesses.find((b) => b.id === selectedId) ?? null : null

  // Reset list length and drop a selection that no longer matches whenever the filters change.
  useEffect(() => {
    setShown(LIST_STEP)
  }, [fitKey])
  useEffect(() => {
    if (selectedId && !businesses.some((b) => b.id === selectedId)) setSelectedId(null)
  }, [businesses, selectedId])

  const chips: Chip[] = []
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, onRemove: () => set({ q: '' }) })
  if (f.category) chips.push({ key: 'category', label: idx.categoryBySlug.get(f.category)?.name ?? f.category, onRemove: () => set({ category: '' }) })
  if (f.region) chips.push({ key: 'region', label: `${idx.regionBySlug.get(f.region)?.name ?? f.region} region`, onRemove: () => set({ region: '', town: '' }) })
  if (f.town) chips.push({ key: 'town', label: idx.townBySlug.get(f.town)?.name ?? f.town, onRemove: () => set({ town: '' }) })
  if (f.verified) chips.push({ key: 'verified', label: f.verified === 'verified' ? 'Verified only' : 'Not verified', onRemove: () => set({ verified: '' }) })

  const select = (id: string) => {
    setSelectedId(id)
    setPane('map')
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Find Botswana directory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-forest md:text-4xl">Explore businesses on the map</h1>
          <p className="mt-2 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{formatNumber(businesses.length)}</span> {businesses.length === 1 ? 'business' : 'businesses'} plotted. Positions are illustrative offsets around real town centres.
          </p>
        </div>
        <div role="group" aria-label="Map or list" className="flex gap-1.5 lg:hidden">
          <Button variant={pane === 'map' ? 'brand' : 'soft'} size="md" aria-pressed={pane === 'map'} onClick={() => setPane('map')}>
            <MapPin /> Map
          </Button>
          <Button variant={pane === 'list' ? 'brand' : 'soft'} size="md" aria-pressed={pane === 'list'} onClick={() => setPane('list')}>
            <List /> List
          </Button>
        </div>
      </div>

      <SearchBox className="mt-6" value={f.q} onCommit={(q) => set({ q })} suggestions={false} placeholder="Search businesses, products or towns" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CategoryFilter value={f.category} onChange={(category) => set({ category })} />
        <LocationFilter region={f.region} town={f.town} onChange={(p) => set(p)} />
        <FilterSelect label="Verification" value={f.verified} onChange={(verified) => set({ verified })}>
          <option value="">All businesses</option>
          <option value="verified">Verified only</option>
          <option value="unverified">Not yet verified</option>
        </FilterSelect>
      </div>
      {chips.length > 0 && (
        <div className="mt-4">
          <ActiveFilters chips={chips} onClear={() => clear()} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:h-[680px] lg:grid-cols-[360px_1fr]">
        <aside aria-label="Results list" className={cn('min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-white lg:flex', pane === 'list' ? 'flex max-h-[640px]' : 'hidden')}>
          <div className="flex items-center justify-between border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold text-forest">Results</h2>
            <span className="text-xs text-ink-muted">{formatNumber(businesses.length)}</span>
          </div>
          {businesses.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="grid grid-cols-1 size-11 place-items-center rounded-xl bg-mint text-brand">
                <MapPin className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-forest">No businesses on the map</h3>
              <p className="mt-2 text-xs leading-5 text-ink-muted">Nothing matches these filters. Try a wider area or remove a filter.</p>
              <Button variant="brand" size="md" className="mt-4" onClick={() => clear()}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-divider overflow-y-auto">
              {businesses.slice(0, shown).map((b) => (
                <ResultRow key={b.id} business={b} active={b.id === selectedId} onSelect={() => select(b.id)} />
              ))}
              {businesses.length > shown && (
                <li className="p-3">
                  <Button variant="soft" size="md" className="w-full" onClick={() => setShown((n) => n + LIST_STEP)}>
                    Show {Math.min(LIST_STEP, businesses.length - shown)} more
                  </Button>
                </li>
              )}
            </ul>
          )}
        </aside>

        <div className={cn('relative h-[520px] lg:h-auto', pane === 'map' ? 'block' : 'hidden lg:block')}>
          <MapView businesses={businesses} selectedId={selectedId} onSelect={setSelectedId} fitKey={fitKey} className="h-full w-full" />
          {selected && <PreviewCard business={selected} onClose={() => setSelectedId(null)} />}
        </div>
      </div>
    </div>
  )
}

function ResultRow({ business: b, active, onSelect }: { business: Business; active: boolean; onSelect: () => void }) {
  const idx = useIndex()
  return (
    <li>
      <button type="button" onClick={onSelect} aria-pressed={active} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition', active ? 'bg-mint' : 'hover:bg-canvas')}>
        <BizLogo business={b} className="size-9 rounded-lg text-xs" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{b.name}</span>
            {b.verificationStatus === 'verified' && <VerifiedMark />}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-muted">
            {primaryCategory(idx, b)?.name} · {idx.townById.get(b.townId)?.name}
          </span>
        </span>
      </button>
    </li>
  )
}

function PreviewCard({ business: b, onClose }: { business: Business; onClose: () => void }) {
  const idx = useIndex()
  const products = idx.publicProductCount.get(b.id) ?? 0
  const services = idx.publicServiceCount.get(b.id) ?? 0
  return (
    <div role="dialog" aria-label={`${b.name} preview`} className="absolute inset-x-3 bottom-3 z-[700] rounded-xl border border-line bg-white p-4 shadow-[0_14px_40px_rgba(18,55,42,0.2)] sm:inset-x-auto sm:left-4 sm:w-[380px]">
      <button type="button" onClick={onClose} aria-label="Close preview" className="absolute right-2 top-2 rounded-lg p-1.5 text-ink-muted hover:bg-neutral-bg hover:text-ink">
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <BizLogo business={b} />
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{b.name}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {primaryCategory(idx, b)?.name} · {idx.townById.get(b.townId)?.name}, {idx.regionById.get(b.regionId)?.name}
          </p>
          {b.verificationStatus === 'verified' && <VerifiedMark className="mt-1" />}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-muted">{b.shortDescription}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span>{products} products · {services} services</span>
        {b.contactPreferences.showPhone && (
          <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            <Phone className="size-3" /> {b.phone}
          </a>
        )}
      </div>
      <Link href={`/businesses/${b.slug}`} className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-forest">
        View profile <ArrowRight className="ml-1.5 size-3.5" />
      </Link>
    </div>
  )
}
