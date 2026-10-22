import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DiscoverPage } from '@/components/pages/discover-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Discover', description: 'Search businesses, products and services across Botswana in one place.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DiscoverPage />
    </Suspense>
  )
}
