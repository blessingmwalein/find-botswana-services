import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProductsPage } from '@/components/pages/products-page'
import { PageSkeleton } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Products', description: 'Compare products, prices and availability from local suppliers across Botswana.' }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductsPage />
    </Suspense>
  )
}
