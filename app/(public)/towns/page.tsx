import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TownsIndexPage } from '@/components/pages/place-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Towns & villages', description: 'Browse businesses by town and village across Botswana.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TownsIndexPage />
    </Suspense>
  )
}
