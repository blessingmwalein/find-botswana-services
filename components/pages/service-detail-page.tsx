'use client'

import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ContactPanel, OpeningHoursCard } from '@/components/shared/contact-panel'
import { ServiceCard, VerifiedBadge } from '@/components/shared/cards'
import { EnquiryDialog } from '@/components/shared/enquiry-dialog'
import { MissingEntity, NotPublicEntity } from '@/components/shared/entity-states'
import { BackLink, Breadcrumbs, pageContainer } from '@/components/shared/page-header'
import { BizLogo } from '@/components/ui/art'
import { Badge, ServiceAvailabilityBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate, servicePriceLabel } from '@/lib/format'
import { isServicePublic } from '@/lib/rules'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { relatedServices } from '@/lib/store/selectors'
import type { Service } from '@/lib/types'

const COVERAGE_COPY = { local: 'Local — serves the provider’s own town and its surrounds.', regional: 'Regional — travels to several nearby towns.', nationwide: 'Nationwide — available across Botswana, by arrangement.' }

export function ServiceDetailPage({ slug }: { slug: string }) {
  const idx = useIndex()
  const service = idx.serviceBySlug.get(slug)
  if (!service) return <MissingEntity kind="service" backHref="/services" backLabel="Browse services" />
  if (!isServicePublic(service, idx.businessById.get(service.businessId))) {
    return <NotPublicEntity kind="service" reason="The provider has unpublished this service, or the provider’s listing is not currently public." backHref="/services" backLabel="Browse services" />
  }
  return <Detail service={service} />
}

function Detail({ service: s }: { service: Service }) {
  const idx = useIndex()
  const { allowEnquiries } = useSettings()
  const [enquire, setEnquire] = useState<Service | null>(null)
  const biz = idx.businessById.get(s.businessId)!
  const category = idx.categoryById.get(s.categoryId)
  const towns = s.townIds.map((id) => idx.townById.get(id)).filter((t): t is NonNullable<typeof t> => !!t)
  const regions = s.regionIds.map((id) => idx.regionById.get(id)).filter((r): r is NonNullable<typeof r> => !!r)
  const related = relatedServices(idx, s, 3)
  const canEnquire = allowEnquiries && biz.contactPreferences.acceptEnquiries

  return (
    <div className={pageContainer}>
      <BackLink href="/services">Back to services</BackLink>
      <Breadcrumbs className="mt-4" items={[{ label: 'Services', href: '/services' }, ...(category ? [{ label: category.name, href: `/services?category=${category.slug}` }] : []), { label: s.name }]} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Card className="p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{servicePriceLabel(s)}</Badge>
              <ServiceAvailabilityBadge value={s.availability} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-forest md:text-4xl">{s.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
              <Link href={`/businesses/${biz.slug}`} className="font-semibold text-brand hover:underline">
                {biz.name}
              </Link>
              <span>·</span>
              <span>{idx.townById.get(biz.townId)?.name}</span>
              {biz.verificationStatus === 'verified' && <VerifiedBadge />}
            </p>
            <p className="mt-8 max-w-2xl text-sm leading-7 text-ink-muted">{s.description}</p>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="bg-mint p-5">
                <MapPin className="size-5 text-brand" />
                <h2 className="mt-3 font-semibold">Service area</h2>
                <p className="mt-2 text-sm text-ink-muted">{s.serviceAreaNote}</p>
                <p className="mt-2 text-xs text-ink-muted">{COVERAGE_COPY[s.coverage]}</p>
                {s.coverage !== 'nationwide' && towns.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {towns.map((t) => (
                      <Link key={t.id} href={`/services?town=${t.slug}`} className="rounded-full border border-line-green bg-white px-2.5 py-1 text-[11px] font-medium text-brand hover:bg-sage">
                        {t.name}
                      </Link>
                    ))}
                  </div>
                )}
                {s.coverage === 'nationwide' && <p className="mt-3 text-[11px] text-ink-muted">Covers all {regions.length} regions.</p>}
              </Card>
              <Card className="p-5">
                <CalendarDays className="size-5 text-brand" />
                <h2 className="mt-3 font-semibold">Ready to enquire?</h2>
                <p className="mt-2 text-sm text-ink-muted">Send your preferred date and requirements.</p>
                {canEnquire ? (
                  <button type="button" onClick={() => setEnquire(s)} className={`mt-4 ${buttonVariants({ variant: 'brand', size: 'md' })}`}>
                    Request booking
                  </button>
                ) : (
                  <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">Enquiries are currently switched off for this provider.</p>
                )}
              </Card>
            </div>
            <p className="mt-6 text-[11px] text-ink-faint">Listed {formatDate(s.createdAt)} · Updated {formatDate(s.updatedAt)}</p>
          </Card>

          {related.length > 0 && (
            <section className="mt-10" aria-label="Related services">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-forest">Related services</h2>
                {category && (
                  <Link href={`/services?category=${category.slug}`} className="text-xs font-semibold text-brand hover:text-forest">
                    More in {category.name} <ArrowRight className="ml-1 inline size-3" />
                  </Link>
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((o) => (
                  <ServiceCard key={o.id} service={o} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex items-center gap-3 p-4">
            <BizLogo business={biz} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Provided by</p>
              <Link href={`/businesses/${biz.slug}`} className="block truncate font-semibold text-forest hover:text-brand">
                {biz.name}
              </Link>
            </div>
          </Card>
          <ContactPanel business={biz} onEnquire={() => setEnquire(s)} />
          <OpeningHoursCard business={biz} />
        </aside>
      </div>

      {enquire && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(null)} business={biz} target={{ type: 'service', id: enquire.id, name: enquire.name }} />}
    </div>
  )
}
