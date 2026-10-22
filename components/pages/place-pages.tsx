'use client'

import { ArrowRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MapView } from '@/components/map/map-loader'
import { RegionTile, TownChip } from '@/components/shared/browse-tiles'
import { MissingEntity } from '@/components/shared/entity-states'
import { Breadcrumbs, PageHeader, pageContainer } from '@/components/shared/page-header'
import { ScopedListing } from '@/components/shared/scoped-listing'
import { SearchBox } from '@/components/shared/search-box'
import { Badge } from '@/components/ui/badge'
import { Card, SectionHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { haversineKm } from '@/lib/geo'
import { formatNumber } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { useIndex } from '@/lib/store/hooks'
import { regionBusinessCounts, townBusinessCounts } from '@/lib/store/selectors'

const TYPE_LABEL = { city: 'City', town: 'Town', village: 'Village', settlement: 'Settlement' }

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-2xl font-semibold tracking-[-0.03em] text-forest">{formatNumber(value)}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}

export function RegionPage({ slug }: { slug: string }) {
  const idx = useIndex()
  const region = idx.regionBySlug.get(slug)
  const townCounts = useMemo(() => townBusinessCounts(idx), [idx])
  const businesses = useMemo(() => (region ? idx.publicBusinesses.filter((b) => b.regionId === region.id) : []), [idx, region])
  if (!region) return <MissingEntity kind="region" backHref="/regions" backLabel="All regions" />

  const towns = (idx.townsByRegion.get(region.id) ?? []).filter((t) => t.enabled).sort((a, b) => (townCounts.get(b.id) ?? 0) - (townCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name))
  const ids = new Set(businesses.map((b) => b.id))
  const products = idx.publicProducts.filter((p) => ids.has(p.businessId)).length
  const services = idx.publicServices.filter((s) => s.coverage === 'nationwide' || s.regionIds.includes(region.id)).length

  return (
    <div className={pageContainer}>
      <Breadcrumbs items={[{ label: 'Regions', href: '/regions' }, { label: region.name }]} />
      <PageHeader className="mt-6" eyebrow={`${region.name} District`} title={`Businesses in ${region.name}`} description={`${region.description} District seat: ${region.seat}.`} />
      {!region.enabled && <p role="status" className="mt-5 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">This region is currently disabled by the administrators. Existing listings are still shown.</p>}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Stat label="Businesses" value={businesses.length} />
        <Stat label="Products" value={products} />
        <Stat label="Services available here" value={services} />
        <Stat label="Towns & villages" value={towns.length} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative">
          <MapView businesses={businesses} interactive={false} maxFitZoom={9} tag={`${businesses.length} businesses in ${region.name}`} className="h-[300px] w-full" />
          <Link href={`/map?region=${region.slug}`} aria-label={`Open ${region.name} on the interactive map`} className="absolute inset-0 z-[600] rounded-xl" />
        </div>
        <Card className="p-5">
          <h2 className="font-semibold text-forest">Towns & villages</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {towns.map((t) => (
              <TownChip key={t.id} town={t} count={townCounts.get(t.id) ?? 0} />
            ))}
          </div>
          <Link href={`/map?region=${region.slug}`} className="mt-5 inline-flex text-xs font-semibold text-brand hover:text-forest">
            Explore {region.name} on the map <ArrowRight className="ml-1 size-3" />
          </Link>
        </Card>
      </div>

      <div className="mt-10">
        <ScopedListing scope={{ region: region.slug }} label={`${region.name} region`} />
      </div>
    </div>
  )
}

export function RegionsIndexPage() {
  const idx = useIndex()
  const regionCounts = useMemo(() => regionBusinessCounts(idx), [idx])
  const townCounts = useMemo(() => townBusinessCounts(idx), [idx])
  return (
    <div className={pageContainer}>
      <PageHeader eyebrow="Browse the directory" title="Regions of Botswana" description="Botswana’s ten administrative districts. Cities and town councils sit inside the district that contains them." />
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {idx.data.regions
          .filter((r) => r.enabled)
          .map((r) => (
            <RegionTile key={r.id} region={r} count={regionCounts.get(r.id) ?? 0} towns={idx.townsByRegion.get(r.id)?.length ?? 0} />
          ))}
      </div>
      <SectionHeading className="mt-14" eyebrow="Popular towns" title="Busiest towns" action={<Link href="/towns" className="text-sm font-semibold text-brand hover:text-forest">All towns <ArrowRight className="ml-1 inline size-4" /></Link>} />
      <div className="mt-6 flex flex-wrap gap-2">
        {idx.data.towns
          .filter((t) => t.enabled)
          .sort((a, b) => (townCounts.get(b.id) ?? 0) - (townCounts.get(a.id) ?? 0))
          .slice(0, 16)
          .map((t) => (
            <TownChip key={t.id} town={t} count={townCounts.get(t.id) ?? 0} />
          ))}
      </div>
    </div>
  )
}

export function TownPage({ slug }: { slug: string }) {
  const idx = useIndex()
  const town = idx.townBySlug.get(slug)
  const businesses = useMemo(() => (town ? idx.publicBusinesses.filter((b) => b.townId === town.id) : []), [idx, town])
  const townCounts = useMemo(() => townBusinessCounts(idx), [idx])
  if (!town) return <MissingEntity kind="town" backHref="/towns" backLabel="All towns" />

  const region = idx.regionById.get(town.regionId)
  const ids = new Set(businesses.map((b) => b.id))
  const products = idx.publicProducts.filter((p) => ids.has(p.businessId)).length
  const services = idx.publicServices.filter((s) => s.coverage === 'nationwide' || s.townIds.includes(town.id) || (s.coverage === 'regional' && s.regionIds.includes(town.regionId))).length
  const nearby = idx.data.towns
    .filter((t) => t.id !== town.id && t.enabled)
    .map((t) => ({ t, d: haversineKm(town.lat, town.lng, t.lat, t.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)

  return (
    <div className={pageContainer}>
      <Breadcrumbs items={[{ label: 'Towns', href: '/towns' }, ...(region ? [{ label: `${region.name} region`, href: `/regions/${region.slug}` }] : []), { label: town.name }]} />
      <PageHeader
        className="mt-6"
        eyebrow={`${TYPE_LABEL[town.localityType]} · ${region?.name} District`}
        title={`Businesses in ${town.name}`}
        description={town.description ?? `Suppliers, products and services in and around ${town.name}.`}
        actions={<Badge tone="gray">{town.lat.toFixed(3)}°, {town.lng.toFixed(3)}°</Badge>}
      />
      {!town.enabled && <p role="status" className="mt-5 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">This town is currently disabled by the administrators. Existing listings are still shown.</p>}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Businesses" value={businesses.length} />
        <Stat label="Products" value={products} />
        <Stat label="Services available here" value={services} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative">
          <MapView businesses={businesses} interactive={false} maxFitZoom={13} tag={`${businesses.length} businesses in ${town.name}`} className="h-[280px] w-full" />
          <Link href={`/map?town=${town.slug}`} aria-label={`Open ${town.name} on the interactive map`} className="absolute inset-0 z-[600] rounded-xl" />
        </div>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold text-forest">
            <MapPin className="size-4 text-brand" /> Nearby places
          </h2>
          <ul className="mt-3 divide-y divide-divider text-sm">
            {nearby.map(({ t, d }) => (
              <li key={t.id}>
                <Link href={`/towns/${t.slug}`} className="flex items-center justify-between py-2.5 hover:text-brand">
                  <span>{t.name}</span>
                  <span className="text-xs text-ink-faint">
                    {Math.round(d)} km · {townCounts.get(t.id) ?? 0} listed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-10">
        <ScopedListing scope={{ town: town.slug }} label={town.name} />
      </div>
    </div>
  )
}

export function TownsIndexPage() {
  const idx = useIndex()
  const [q, setQ] = useState('')
  const townCounts = useMemo(() => townBusinessCounts(idx), [idx])
  const needle = normalize(q)
  const groups = idx.data.regions
    .filter((r) => r.enabled)
    .map((r) => ({
      region: r,
      towns: (idx.townsByRegion.get(r.id) ?? [])
        .filter((t) => t.enabled && (!needle || normalize(t.name).includes(needle)))
        .sort((a, b) => (townCounts.get(b.id) ?? 0) - (townCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.towns.length)

  return (
    <div className={pageContainer}>
      <PageHeader eyebrow="Browse the directory" title="Towns & villages" description={`${idx.data.towns.filter((t) => t.enabled).length} places across Botswana, grouped by district.`} />
      <SearchBox className="mt-7 max-w-md" value={q} onCommit={setQ} suggestions={false} label="Find a town" placeholder="Find a town or village" />
      {groups.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No matching towns">No town or village matches “{q}”.</EmptyState>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {groups.map(({ region, towns }) => (
            <section key={region.id} aria-label={`${region.name} district`}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-forest">
                <Link href={`/regions/${region.slug}`} className="hover:text-brand">
                  {region.name} District
                </Link>
                <span className="text-xs font-normal text-ink-faint">{towns.length} places</span>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {towns.map((t) => (
                  <TownChip key={t.id} town={t} count={townCounts.get(t.id) ?? 0} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
