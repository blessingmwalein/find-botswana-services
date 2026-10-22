import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminRegionsPage } from '@/components/admin/taxonomy-admin-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Regions' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminRegionsPage />
    </Suspense>
  )
}
