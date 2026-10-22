import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CategoriesIndexPage } from '@/components/pages/category-pages'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Categories', description: 'Browse every category in the Find Botswana directory.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CategoriesIndexPage />
    </Suspense>
  )
}
