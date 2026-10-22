import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminProductsPage } from '@/components/admin/catalog-admin-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Products' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminProductsPage />
    </Suspense>
  )
}
