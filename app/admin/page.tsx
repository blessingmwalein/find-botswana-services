import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminOverview } from '@/components/admin/overview-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Overview' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminOverview />
    </Suspense>
  )
}
