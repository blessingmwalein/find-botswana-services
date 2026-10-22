import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RegionPage } from '@/components/pages/place-pages'
import { PageSkeleton } from '@/components/ui/states'
import { getSeed } from '@/lib/seed'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getSeed().regions.find((x) => x.slug === slug)
  return item ? { title: item.name, description: item.description } : { title: 'Region' }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegionPage slug={slug} />
    </Suspense>
  )
}
