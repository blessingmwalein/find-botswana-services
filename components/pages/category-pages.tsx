'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { CategoryTile } from '@/components/shared/browse-tiles'
import { MissingEntity } from '@/components/shared/entity-states'
import { Breadcrumbs, PageHeader, pageContainer } from '@/components/shared/page-header'
import { ScopedListing } from '@/components/shared/scoped-listing'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import { categoryBusinessCounts } from '@/lib/store/selectors'

export function CategoryPage({ slug }: { slug: string }) {
  const idx = useIndex()
  const category = idx.categoryBySlug.get(slug)
  const counts = useMemo(() => categoryBusinessCounts(idx), [idx])
  if (!category) return <MissingEntity kind="category" backHref="/categories" backLabel="All categories" />

  const parent = category.parentId ? idx.categoryById.get(category.parentId) : undefined
  const children = childCategories(idx, category.id).filter((c) => c.enabled)
  const ids = idx.categoryTree.get(category.id)!
  const productCount = idx.publicProducts.filter((p) => ids.has(p.categoryId)).length
  const serviceCount = idx.publicServices.filter((s) => ids.has(s.categoryId)).length

  return (
    <div className={pageContainer}>
      <Breadcrumbs items={[{ label: 'Categories', href: '/categories' }, ...(parent ? [{ label: parent.name, href: `/categories/${parent.slug}` }] : []), { label: category.name }]} />
      <PageHeader
        className="mt-6"
        eyebrow="Category"
        title={category.name}
        description={category.description}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge>{formatNumber(counts.get(category.id) ?? 0)} businesses</Badge>
            <Badge tone="blue">{formatNumber(productCount)} products</Badge>
            <Badge tone="gray">{formatNumber(serviceCount)} services</Badge>
          </div>
        }
      />
      {!category.enabled && <p role="status" className="mt-5 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">This category is currently disabled by the administrators. Existing listings are still shown.</p>}

      {children.length > 0 && (
        <section className="mt-8" aria-label="Sub-categories">
          <h2 className="text-sm font-semibold text-forest">Sub-categories</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {children.map((c) => (
              <CategoryTile key={c.id} category={c} count={counts.get(c.id) ?? 0} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <ScopedListing scope={{ category: category.slug }} label={category.name} />
      </div>
    </div>
  )
}

export function CategoriesIndexPage() {
  const idx = useIndex()
  const counts = useMemo(() => categoryBusinessCounts(idx), [idx])
  return (
    <div className={pageContainer}>
      <PageHeader eyebrow="Browse the directory" title="All categories" description="Twelve main categories, with sub-categories for more specific trades." />
      <div className="mt-10 flex flex-col gap-8">
        {parentCategories(idx)
          .filter((c) => c.enabled)
          .map((parent) => {
            const kids = childCategories(idx, parent.id).filter((c) => c.enabled)
            return (
              <Card key={parent.id} className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span aria-hidden className="grid grid-cols-1 size-11 place-items-center rounded-xl bg-mint text-xl text-brand">
                      {parent.icon}
                    </span>
                    <div>
                      <h2 className="font-semibold text-forest">
                        <Link href={`/categories/${parent.slug}`} className="hover:text-brand">
                          {parent.name}
                        </Link>
                      </h2>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-ink-muted">{parent.description}</p>
                    </div>
                  </div>
                  <Link href={`/categories/${parent.slug}`} className="text-xs font-semibold text-brand hover:text-forest">
                    {formatNumber(counts.get(parent.id) ?? 0)} listings <ArrowRight className="ml-1 inline size-3" />
                  </Link>
                </div>
                {kids.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-divider pt-4">
                    {kids.map((c) => (
                      <Link key={c.id} href={`/categories/${c.slug}`} className="rounded-full border border-[#d7dfd7] bg-white px-3.5 py-1.5 text-xs transition hover:border-brand hover:text-brand">
                        {c.name} <span className="ml-1 text-ink-faint">{formatNumber(counts.get(c.id) ?? 0)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
      </div>
    </div>
  )
}
