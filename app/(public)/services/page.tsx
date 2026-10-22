import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ServicesPage } from '@/components/pages/services-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Services', description: 'Find service providers by the areas they actually serve.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServicesPage />
    </Suspense>
  )
}
