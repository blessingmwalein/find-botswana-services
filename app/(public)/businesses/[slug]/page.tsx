import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BusinessDetailPage } from '@/components/pages/business-detail-page'
import { PageSkeleton } from '@/components/ui/states'
import { getSeed } from '@/lib/seed'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getSeed().businesses.find((x) => x.slug === slug)
  return item ? { title: item.name, description: item.shortDescription } : { title: 'Business' }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BusinessDetailPage slug={slug} />
    </Suspense>
  )
}
