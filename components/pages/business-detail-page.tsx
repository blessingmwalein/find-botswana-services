'use client'

import { ArrowRight, ExternalLink, MapPin, MessageSquare, Phone, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MapView } from '@/components/map/map-loader'
import { ContactPanel, OpeningHoursCard } from '@/components/shared/contact-panel'
import { BusinessCard, ProductCard, ServiceCard, VerifiedBadge } from '@/components/shared/cards'
import { EnquiryDialog, type EnquiryTargetRef } from '@/components/shared/enquiry-dialog'
import { MissingEntity, NotPublicEntity } from '@/components/shared/entity-states'
import { BackLink, pageContainer } from '@/components/shared/page-header'
import { SearchBox } from '@/components/shared/search-box'
import { Art, BizLogo } from '@/components/ui/art'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatNumber } from '@/lib/format'
import { searchProducts, PRODUCT_DEFAULTS, paginate } from '@/lib/search/engine'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { businessCategories } from '@/lib/store/indexes'
import { relatedBusinesses } from '@/lib/store/selectors'
import { isBusinessPublic } from '@/lib/rules'
import type { Business, Service } from '@/lib/types'
import { useQueryState } from '@/lib/use-query-state'

const PARAMS = { tab: 'overview', q: '', category: '' }
const PAGE = 9

export function BusinessDetailPage({ slug }: { slug: string }) {
  const idx = useIndex()
  const biz = idx.businessBySlug.get(slug)
  if (!biz) return <MissingEntity kind="business" backHref="/businesses" backLabel="Browse businesses" />
  if (!isBusinessPublic(biz)) {
    const reason =
      biz.listingStatus === 'suspended'
        ? 'This listing has been suspended by the directory administrators.'
        : biz.approvalStatus === 'approved'
          ? 'The owner has unpublished this listing.'
          : 'This listing is still waiting for approval.'
    return <NotPublicEntity kind="listing" reason={reason} backHref="/businesses" backLabel="Browse businesses" />
  }
  return <Profile business={biz} />
}

function Profile({ business: b }: { business: Business }) {
  const idx = useIndex()
  const toast = useToast()
  const { allowEnquiries } = useSettings()
  const { value: f, page, set } = useQueryState(PARAMS)
  const [enquire, setEnquire] = useState<EnquiryTargetRef | null>(null)

  const cats = businessCategories(idx, b)
  const town = idx.townById.get(b.townId)
  const region = idx.regionById.get(b.regionId)
  const products = useMemo(() => idx.publicProducts.filter((p) => p.businessId === b.id), [idx, b.id])
  const services = useMemo(() => idx.publicServices.filter((s) => s.businessId === b.id), [idx, b.id])
  const related = relatedBusinesses(idx, b, 4)
  const tab = ['overview', 'products', 'services', 'location'].includes(f.tab) ? f.tab : 'overview'
  const canEnquire = allowEnquiries && b.contactPreferences.acceptEnquiries

  const catalogue = useMemo(() => searchProducts(idx, { ...PRODUCT_DEFAULTS, q: f.q, category: f.category, supplier: b.slug }), [idx, f.q, f.category, b.slug])
  const catalogueCats = useMemo(() => Array.from(new Set(products.map((p) => p.categoryId))).map((id) => idx.categoryById.get(id)).filter(Boolean), [products, idx])
  const pg = paginate(catalogue, page, PAGE)
  const bizList = useMemo(() => [b], [b])

  const share = async () => {
    const url = window.location.origin + `/businesses/${b.slug}`
    try {
      if (navigator.share) await navigator.share({ title: b.name, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Profile link copied to clipboard')
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const osm = `https://www.openstreetmap.org/?mlat=${b.lat}&mlon=${b.lng}#map=16/${b.lat}/${b.lng}`

  return (
    <div className={pageContainer}>
      <BackLink href="/businesses">Back to businesses</BackLink>

      <Card className="mt-6 overflow-hidden">
        <Art art={b.cover} className="h-36 sm:h-44" />
        <div className="p-6 md:p-10">
          <div className="relative z-10 -mt-16 grid grid-cols-1 size-20 place-items-center sm:-mt-20">
            <BizLogo business={b} className="size-20 rounded-2xl border-4 border-white text-xl" />
          </div>
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-forest">{b.name}</h1>
                {b.verificationStatus === 'verified' && <VerifiedBadge />}
                {b.featured && <Badge tone="amber">Featured</Badge>}
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                {cats[0]?.name} · {town?.name}, {region?.name}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-muted">{b.shortDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cats.map((c) => (
                  <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-full border border-line-green bg-mint px-3 py-1 text-xs font-medium text-brand hover:bg-sage">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {canEnquire && (
                <button type="button" onClick={() => setEnquire({ type: 'business', id: b.id, name: b.name })} className={buttonVariants({ variant: 'brand', size: 'md' })}>
                  <MessageSquare /> Send an enquiry
                </button>
              )}
              {b.contactPreferences.showPhone && (
                <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className={buttonVariants({ variant: 'soft', size: 'md' })}>
                  <Phone /> Call
                </a>
              )}
              <a href={osm} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'soft', size: 'md' })}>
                <MapPin /> Directions <ExternalLink className="size-3" />
              </a>
              <button type="button" onClick={share} className={buttonVariants({ variant: 'soft', size: 'md' })}>
                <Share2 /> Share
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Tabs
            label="Business profile sections"
            idPrefix="biz"
            value={tab}
            onChange={(t) => set({ tab: t === 'overview' ? '' : t, q: '', category: '' })}
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products', count: products.length },
              { id: 'services', label: 'Services', count: services.length },
              { id: 'location', label: 'Location' },
            ]}
          />

          <div role="tabpanel" id={`biz-panel-${tab}`} aria-labelledby={`biz-${tab}`} className="mt-6">
            {tab === 'overview' && (
              <div className="flex flex-col gap-6">
                <Card className="p-6">
                  <h2 className="font-semibold text-forest">About this business</h2>
                  <p className="mt-3 text-sm leading-7 text-ink-muted">{b.description}</p>
                  <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-divider pt-5 text-sm sm:grid-cols-2">
                    <Fact label="Business type">{b.businessType}</Fact>
                    {b.yearEstablished && <Fact label="Established">{b.yearEstablished}</Fact>}
                    <Fact label="Location">{town?.name}, {region?.name} District</Fact>
                    <Fact label="Listed since">{formatDate(b.createdAt)}</Fact>
                    {b.registrationRef && <Fact label="Registration reference">{b.registrationRef}</Fact>}
                    <Fact label="Verification">{b.verificationStatus === 'verified' ? 'Verified by Find Botswana' : 'Not yet verified'}</Fact>
                  </dl>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-forest">Catalogue</h2>
                    <Link href={`/products?supplier=${b.slug}`} className="text-xs font-semibold text-brand hover:text-forest">
                      Browse catalogue <ArrowRight className="ml-1 inline size-3" />
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {formatNumber(products.length)} products and {formatNumber(services.length)} services listed.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => set({ tab: 'products' })} className={buttonVariants({ variant: 'soft', size: 'md' })}>
                      View products ({products.length})
                    </button>
                    <button type="button" onClick={() => set({ tab: 'services' })} className={buttonVariants({ variant: 'soft', size: 'md' })}>
                      View services ({services.length})
                    </button>
                  </div>
                </Card>

                {related.length > 0 && (
                  <section aria-label="Related businesses">
                    <h2 className="font-semibold text-forest">Similar businesses</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {related.map((r) => (
                        <BusinessCard key={r.id} business={r} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {tab === 'products' && (
              <div>
                {products.length === 0 ? (
                  <EmptyState title="No products listed yet">{b.name} hasn’t published any products. Check the services tab or send an enquiry.</EmptyState>
                ) : (
                  <>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                      <SearchBox className="flex-1" value={f.q} onCommit={(q) => set({ q })} suggestions={false} label="Search this catalogue" placeholder="Search this catalogue" />
                      {catalogueCats.length > 1 && (
                        <select aria-label="Filter by category" value={f.category} onChange={(e) => set({ category: e.target.value })} className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand sm:w-60">
                          <option value="">All categories</option>
                          {catalogueCats.map((c) => (
                            <option key={c!.id} value={c!.slug}>
                              {c!.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <p className="mb-3 text-xs text-ink-muted" role="status">
                      {formatNumber(pg.total)} product{pg.total === 1 ? '' : 's'}
                    </p>
                    {pg.total === 0 ? (
                      <EmptyState title="No matching products">Try a different search or category.</EmptyState>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {pg.items.map((h) => (
                            <ProductCard key={h.item.id} product={h.item} />
                          ))}
                        </div>
                        <Pagination className="mt-6" page={pg.page} pageCount={pg.pageCount} onPage={(p) => set({ page: p })} />
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === 'services' && (
              <div>
                {services.length === 0 ? (
                  <EmptyState title="No services listed yet">{b.name} hasn’t published any services.</EmptyState>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {services.map((s) => (
                      <ServiceCard key={s.id} service={s} onEnquire={canEnquire ? (svc: Service) => setEnquire({ type: 'service', id: svc.id, name: svc.name }) : undefined} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'location' && (
              <div className="flex flex-col gap-4">
                <MapView businesses={bizList} selectedId={b.id} interactive cluster={false} maxFitZoom={14} tag="Illustrative position" className="h-[360px] w-full" />
                <Card className="p-5">
                  <p className="flex items-start gap-3 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span>
                      <span className="font-semibold text-ink">{b.address}</span>
                      <span className="mt-1 block text-xs text-ink-muted">Map pins are illustrative positions near the centre of {town?.name} and do not identify real premises.</span>
                    </span>
                  </p>
                  <Link href={`/map?town=${town?.slug}`} className="mt-3 inline-flex text-xs font-semibold text-brand hover:text-forest">
                    See other businesses in {town?.name} on the map <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Card>
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <ContactPanel business={b} onEnquire={() => setEnquire({ type: 'business', id: b.id, name: b.name })} />
          <OpeningHoursCard business={b} />
        </aside>
      </div>

      {enquire && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(null)} business={b} target={enquire} />}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  )
}
