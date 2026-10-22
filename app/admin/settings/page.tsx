import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminSettingsPage } from '@/components/admin/settings-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Settings' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminSettingsPage />
    </Suspense>
  )
}
