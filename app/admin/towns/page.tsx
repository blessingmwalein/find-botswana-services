import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminTownsPage } from '@/components/admin/taxonomy-admin-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Towns' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminTownsPage />
    </Suspense>
  )
}
