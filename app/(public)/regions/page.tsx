import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RegionsIndexPage } from '@/components/pages/place-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Regions', description: 'Browse businesses by Botswana district.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegionsIndexPage />
    </Suspense>
  )
}
