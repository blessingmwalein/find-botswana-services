import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminBusinessDetail } from '@/components/admin/business-detail-page'
import { PageSkeleton } from '@/components/ui/states'
import { getSeed } from '@/lib/seed'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const b = getSeed().businesses.find((x) => x.id === id)
  return { title: b ? b.name : 'Business' }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminBusinessDetail id={id} />
    </Suspense>
  )
}
