import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MapPage } from '@/components/pages/map-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Explore map', description: 'See every Find Botswana business plotted on an interactive map of Botswana.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MapPage />
    </Suspense>
  )
}
