import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminUsersPage } from '@/components/admin/users-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Users' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminUsersPage />
    </Suspense>
  )
}
