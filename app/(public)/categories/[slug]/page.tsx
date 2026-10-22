import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CategoryPage } from '@/components/pages/category-pages'
import { PageSkeleton } from '@/components/ui/states'
import { getSeed } from '@/lib/seed'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getSeed().categories.find((x) => x.slug === slug)
  return item ? { title: item.name, description: item.description } : { title: 'Category' }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CategoryPage slug={slug} />
    </Suspense>
  )
}
