import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProductDetailPage } from '@/components/pages/product-detail-page'
import { PageSkeleton } from '@/components/ui/states'
import { getSeed } from '@/lib/seed'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getSeed().products.find((x) => x.slug === slug)
  return item ? { title: item.name, description: item.description } : { title: 'Product' }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductDetailPage slug={slug} />
    </Suspense>
  )
}
