import type { Metadata } from 'next'
import { Suspense } from 'react'
import { OwnerDashboard } from '@/components/owner/owner-dashboard'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Owner dashboard', description: 'Manage your Find Botswana business profile, catalogue and enquiries.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OwnerDashboard />
    </Suspense>
  )
}
