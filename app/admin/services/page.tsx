import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminServicesPage } from '@/components/admin/catalog-admin-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Services' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminServicesPage />
    </Suspense>
  )
}
