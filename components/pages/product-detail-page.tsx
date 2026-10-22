'use client'

import { ArrowRight, MapPin, MessageSquare, Phone } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ProductCard, VerifiedBadge } from '@/components/shared/cards'
import { EnquiryDialog } from '@/components/shared/enquiry-dialog'
import { MissingEntity, NotPublicEntity } from '@/components/shared/entity-states'
import { BackLink, Breadcrumbs, pageContainer } from '@/components/shared/page-header'
import { Art, BizLogo } from '@/components/ui/art'
import { AvailabilityBadge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { productPriceLabel, productPriceSuffix, formatDate } from '@/lib/format'
import { isProductPublic } from '@/lib/rules'
import { useIndex, useSettings } from '@/lib/store/hooks'
import { locationLabel } from '@/lib/store/indexes'
import { relatedProducts } from '@/lib/store/selectors'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ProductDetailPage({ slug }: { slug: string }) {
  const idx = useIndex()
  const product = idx.productBySlug.get(slug)
  if (!product) return <MissingEntity kind="product" backHref="/products" backLabel="Browse products" />
  const biz = idx.businessById.get(product.businessId)
  if (!isProductPublic(product, biz)) {
    return <NotPublicEntity kind="product" reason="The supplier has unpublished this product, or the supplier’s listing is not currently public." backHref="/products" backLabel="Browse products" />
  }
  return <Detail product={product} />
}

function Detail({ product: p }: { product: Product }) {
  const idx = useIndex()
  const { allowEnquiries } = useSettings()
  const [enquire, setEnquire] = useState(false)
  const [active, setActive] = useState(0)
  const biz = idx.businessById.get(p.businessId)!
  const category = idx.categoryById.get(p.categoryId)
  const images = [p.image, ...p.gallery]
  const related = relatedProducts(idx, p, 8)
  const sameSupplier = idx.publicProducts.filter((o) => o.businessId === p.businessId && o.id !== p.id).slice(0, 4)
  const suffix = productPriceSuffix(p)
  const canEnquire = allowEnquiries && biz.contactPreferences.acceptEnquiries

  return (
    <div className={pageContainer}>
      <BackLink href="/products">Back to products</BackLink>
      <Breadcrumbs
        className="mt-4"
        items={[{ label: 'Products', href: '/products' }, ...(category ? [{ label: category.name, href: `/products?category=${category.slug}` }] : []), { label: p.name }]}
      />

      <Card className="mt-6 p-6 md:p-10">
        <AvailabilityBadge value={p.availability} unit={p.unit} />
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-forest md:text-4xl">{p.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {category?.name} · {p.unit} · SKU {p.sku}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_300px]">
          <div>
            <div aria-live="polite">
              <Art art={{ ...images[active], label: images[active].label ?? p.image.label }} className="h-64 rounded-xl sm:h-80" labelClassName="text-5xl font-semibold" />
            </div>
            {images.length > 1 && (
              <div role="group" aria-label="Product images" className="mt-3 flex gap-2">
                {images.map((img, i) => (
                  <button key={i} type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1} of ${images.length}`} aria-pressed={i === active} className={cn('overflow-hidden rounded-lg border-2 transition', i === active ? 'border-brand' : 'border-transparent hover:border-line-green')}>
                    <Art art={{ ...img, label: undefined }} className="size-16" />
                  </button>
                ))}
              </div>
            )}
            <h2 className="mt-8 font-semibold text-forest">Description</h2>
            <p className="mt-3 text-sm leading-7 text-ink-muted">{p.description}</p>

            <h2 className="mt-8 font-semibold text-forest">Specifications</h2>
            <dl className="mt-3 divide-y divide-divider overflow-hidden rounded-xl border border-line text-sm">
              {p.specifications.map((s) => (
                <div key={s.label} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5 odd:bg-canvas">
                  <dt className="text-ink-muted">{s.label}</dt>
                  <dd className="font-medium text-ink">{s.value}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5 odd:bg-canvas">
                <dt className="text-ink-muted">Listed</dt>
                <dd className="font-medium text-ink">{formatDate(p.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <aside className="self-start rounded-xl bg-canvas p-5">
            <p className="text-xs text-ink-muted">{p.priceType === 'quote' ? 'Pricing' : 'Indicative price'}</p>
            <p className="mt-2 text-2xl font-semibold text-brand">{productPriceLabel(p)}</p>
            {suffix && <p className="mt-0.5 text-xs text-ink-faint">{suffix}</p>}
            <p className="mt-2 text-[11px] leading-4 text-ink-faint">{p.priceType === 'quote' ? 'Contact the supplier for a quotation.' : 'Prices are indicative. Confirm with the supplier before you travel.'}</p>

            <div className="mt-5 border-t border-line pt-5">
              <div className="flex items-start gap-3">
                <BizLogo business={biz} className="size-10 rounded-lg text-xs" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{biz.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                    <MapPin className="size-3" /> {locationLabel(idx, biz.regionId, biz.townId)}
                  </p>
                  {biz.verificationStatus === 'verified' && <div className="mt-1.5"><VerifiedBadge /></div>}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {canEnquire && (
                  <button type="button" onClick={() => setEnquire(true)} className={buttonVariants({ variant: 'brand', size: 'md' })}>
                    <MessageSquare /> Send an enquiry
                  </button>
                )}
                {biz.contactPreferences.showPhone && (
                  <a href={`tel:${biz.phone.replace(/[^\d+]/g, '')}`} className={buttonVariants({ variant: 'soft', size: 'md' })}>
                    <Phone /> {biz.phone}
                  </a>
                )}
                <Link href={`/businesses/${biz.slug}`} className="mt-1 inline-flex items-center justify-center text-xs font-semibold text-brand hover:text-forest">
                  View supplier <ArrowRight className="ml-1 size-3" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </Card>

      {sameSupplier.length > 0 && (
        <section className="mt-10" aria-label="More from this supplier">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-forest">More from {biz.name}</h2>
            <Link href={`/products?supplier=${biz.slug}`} className="text-xs font-semibold text-brand hover:text-forest">
              View catalogue <ArrowRight className="ml-1 inline size-3" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sameSupplier.map((o) => (
              <ProductCard key={o.id} product={o} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10" aria-label="Related products">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-forest">Related products</h2>
            {category && (
              <Link href={`/products?category=${category.slug}`} className="text-xs font-semibold text-brand hover:text-forest">
                More in {category.name} <ArrowRight className="ml-1 inline size-3" />
              </Link>
            )}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((o) => (
              <ProductCard key={o.id} product={o} />
            ))}
          </div>
        </section>
      )}

      {enquire && <EnquiryDialog open onOpenChange={(o) => !o && setEnquire(false)} business={biz} target={{ type: 'product', id: p.id, name: p.name }} />}
    </div>
  )
}
