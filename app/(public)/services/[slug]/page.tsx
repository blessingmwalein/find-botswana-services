import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ServiceDetailPage } from '@/components/pages/service-detail-page'
import { PageSkeleton } from '@/components/ui/states'
import { getSeed } from '@/lib/seed'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getSeed().services.find((x) => x.slug === slug)
  return item ? { title: item.name, description: item.description } : { title: 'Service' }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServiceDetailPage slug={slug} />
    </Suspense>
  )
}
