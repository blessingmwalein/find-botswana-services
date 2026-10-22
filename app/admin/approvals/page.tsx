import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminApprovalsPage } from '@/components/admin/approvals-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Approvals' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminApprovalsPage />
    </Suspense>
  )
}
