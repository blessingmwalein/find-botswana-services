import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminCategoriesPage } from '@/components/admin/taxonomy-admin-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Categories' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminCategoriesPage />
    </Suspense>
  )
}
