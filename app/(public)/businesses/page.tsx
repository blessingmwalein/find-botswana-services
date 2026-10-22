import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BusinessesPage } from '@/components/pages/businesses-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Businesses', description: 'Browse every business in the Find Botswana directory by category, region and town.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BusinessesPage />
    </Suspense>
  )
}
