'use client'

import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Art, BizLogo } from '@/components/ui/art'
import { AvailabilityBadge, Badge, ServiceAvailabilityBadge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatDistance } from '@/lib/geo'
import { productPriceLabel, productPriceSuffix, servicePriceLabel } from '@/lib/format'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { locationLabel, primaryCategory } from '@/lib/store/indexes'
import type { Business, Product, Service } from '@/lib/types'
import { cn } from '@/lib/utils'

type Variant = 'grid' | 'list'

export function VerifiedMark({ className }: { className?: string }) {
  const { showVerifiedBadges } = useSettings()
  if (!showVerifiedBadges) return null
  return (
    <span className={cn('flex shrink-0 items-center gap-1 text-[10px] font-semibold text-brand', className)}>
      <ShieldCheck aria-hidden className="size-3.5" /> Verified
    </span>
  )
}

/** Mint pill used on profile headers; hidden when verified badges are switched off in settings. */
export function VerifiedBadge() {
  const { showVerifiedBadges } = useSettings()
  if (!showVerifiedBadges) return null
  return (
    <Badge>
      <ShieldCheck aria-hidden className="size-3" /> Verified
    </Badge>
  )
}

/** The whole card is one link (stretched title link) so it is easy to hit and keyboard-friendly. */
export function BusinessCard({ business: b, variant = 'grid', distanceKm }: { business: Business; variant?: Variant; distanceKm?: number }) {
  const idx = useIndex()
  const category = primaryCategory(idx, b)
  const town = idx.townById.get(b.townId)
  const products = idx.publicProductCount.get(b.id) ?? 0
  const services = idx.publicServiceCount.get(b.id) ?? 0
  const verified = b.verificationStatus === 'verified'

  const meta = (
    <p className="mt-1 text-xs text-ink-muted">
      {category?.name} · {town?.name}
      {distanceKm !== undefined && <span className="ml-1.5 font-medium text-brand">· {formatDistance(distanceKm)} away</span>}
    </p>
  )

  if (variant === 'list') {
    return (
      <Card className="group relative flex items-start gap-4 p-4 transition hover:border-[#b9d1be] hover:shadow-[0_12px_28px_rgba(18,55,42,0.08)]">
        <BizLogo business={b} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-semibold text-ink">
              <Link href={`/businesses/${b.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
                {b.name}
              </Link>
            </h3>
            {verified && <VerifiedMark />}
            {b.featured && <Badge tone="amber">Featured</Badge>}
          </div>
          {meta}
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-muted">{b.shortDescription}</p>
        </div>
        <div className="hidden shrink-0 text-right text-[11px] text-ink-muted sm:block">
          <p>{products} products</p>
          <p className="mt-0.5">{services} services</p>
          <p className="mt-2 font-semibold text-brand opacity-0 transition group-hover:opacity-100">
            View profile <ArrowRight className="ml-0.5 inline size-3" />
          </p>
        </div>
      </Card>
    )
  }

  return (
    <article className="group relative rounded-xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#b9d1be] hover:shadow-[0_12px_28px_rgba(18,55,42,0.08)]">
      <div className="flex items-start justify-between">
        <BizLogo business={b} />
        {verified && <VerifiedMark />}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-ink">
          <Link href={`/businesses/${b.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
            {b.name}
          </Link>
        </h3>
        {meta}
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-muted">{b.shortDescription}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-divider pt-3 text-[11px] text-ink-muted">
        <span>
          {products} products · {services} services
        </span>
        <span className="font-semibold text-brand opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 max-lg:opacity-100">
          View profile <ArrowRight className="ml-1 inline size-3" />
        </span>
      </div>
    </article>
  )
}

export function ProductCard({ product: p, variant = 'grid' }: { product: Product; variant?: Variant }) {
  const idx = useIndex()
  const biz = idx.businessById.get(p.businessId)
  const where = biz ? locationLabel(idx, biz.regionId, biz.townId).split(',')[0] : ''
  const suffix = productPriceSuffix(p)
  const price = (
    <p className="text-sm font-semibold text-brand">
      {productPriceLabel(p)}
      {suffix && <span className="ml-1 text-[11px] font-normal text-ink-faint">{suffix}</span>}
    </p>
  )

  if (variant === 'list') {
    return (
      <Card className="group relative flex items-center gap-4 p-4 transition hover:border-[#b9d1be] hover:shadow-[0_12px_28px_rgba(18,55,42,0.08)]">
        <Art art={p.image} className="size-14 shrink-0 rounded-xl" labelClassName="text-sm" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">
            <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-ink-muted">
            {biz?.name} · {where}
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <AvailabilityBadge value={p.availability} unit={p.unit} />
        </div>
        <div className="shrink-0 text-right">{price}</div>
      </Card>
    )
  }

  return (
    <Card className="group relative p-4 transition hover:-translate-y-0.5 hover:border-[#b9d1be] hover:shadow-[0_12px_28px_rgba(18,55,42,0.08)]">
      <div className="flex items-center justify-between">
        <Art art={p.image} className="size-11 rounded-xl" labelClassName="text-sm" />
        <AvailabilityBadge value={p.availability} unit={p.unit} />
      </div>
      <h3 className="mt-4 font-semibold text-ink">
        <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
          {p.name}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        {biz?.name} · {where}
      </p>
      <div className="mt-4">{price}</div>
      <span className="mt-4 inline-flex items-center text-xs font-semibold text-brand">
        View product <ArrowRight className="ml-1 size-3" />
      </span>
    </Card>
  )
}

export function ServiceCard({ service: s, variant = 'grid', onEnquire }: { service: Service; variant?: Variant; onEnquire?: (s: Service) => void }) {
  const idx = useIndex()
  const biz = idx.businessById.get(s.businessId)
  const where = biz ? idx.townById.get(biz.townId)?.name : ''

  if (variant === 'list') {
    return (
      <Card className="group relative flex items-center gap-4 p-4 transition hover:border-[#b9d1be] hover:shadow-[0_12px_28px_rgba(18,55,42,0.08)]">
        <Art art={s.image} className="size-14 shrink-0 rounded-xl" labelClassName="text-sm" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">
            <Link href={`/services/${s.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
              {s.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-ink-muted">
            {biz?.name} · {where}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-faint">
            <MapPin aria-hidden className="size-3" /> {s.coverage === 'nationwide' ? 'Nationwide' : s.serviceAreaNote}
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <ServiceAvailabilityBadge value={s.availability} />
        </div>
        <p className="shrink-0 text-right text-sm font-semibold text-brand">{servicePriceLabel(s)}</p>
      </Card>
    )
  }

  return (
    <Card className="group relative flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-[#b9d1be] hover:shadow-[0_12px_28px_rgba(18,55,42,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <Art art={s.image} className="size-11 rounded-xl" labelClassName="text-sm" />
        <Badge>{servicePriceLabel(s)}</Badge>
      </div>
      <h3 className="mt-4 font-semibold text-ink">
        <Link href={`/services/${s.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
          {s.name}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        {biz?.name} · {where}
      </p>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-muted">{s.description}</p>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-ink-faint">
        <MapPin aria-hidden className="size-3 shrink-0" /> <span className="truncate">{s.coverage === 'nationwide' ? 'Nationwide' : s.serviceAreaNote}</span>
      </p>
      <div className="relative z-10 mt-4 flex items-center justify-between gap-2 pt-1">
        <ServiceAvailabilityBadge value={s.availability} />
        {onEnquire && (
          <button type="button" onClick={() => onEnquire(s)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest">
            Request
          </button>
        )}
      </div>
    </Card>
  )
}
