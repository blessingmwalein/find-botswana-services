import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminReportsPage } from '@/components/admin/reports-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Reports' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminReportsPage />
    </Suspense>
  )
}
