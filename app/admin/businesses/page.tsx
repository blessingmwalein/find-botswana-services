import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminBusinessesPage } from '@/components/admin/businesses-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Businesses' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminBusinessesPage />
    </Suspense>
  )
}
