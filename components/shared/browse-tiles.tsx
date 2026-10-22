import { ArrowRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import { formatNumber } from '@/lib/format'
import type { Category, Region, Town } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Category tile from the original "Browse the directory" grid — now a real link with a derived count. */
export function CategoryTile({ category, count, className }: { category: Category; count: number; className?: string }) {
  return (
    <Link href={`/categories/${category.slug}`} className={cn('group rounded-xl border border-line bg-white p-4 text-left transition hover:border-[#a9c7af] hover:bg-[#f4f9f4]', className)}>
      <span aria-hidden className="grid grid-cols-1 size-9 place-items-center rounded-lg bg-mint text-lg text-brand">
        {category.icon}
      </span>
      <span className="mt-5 block text-sm font-semibold leading-5 text-ink">{category.name}</span>
      <span className="mt-1 block text-xs text-ink-faint">
        {formatNumber(count)} {count === 1 ? 'listing' : 'listings'} <ArrowRight aria-hidden className="ml-1 inline size-3 opacity-0 transition group-hover:opacity-100" />
      </span>
    </Link>
  )
}

export function RegionTile({ region, count, towns }: { region: Region; count: number; towns: number }) {
  return (
    <Link href={`/regions/${region.slug}`} className="group rounded-xl border border-line bg-white p-4 transition hover:border-[#a9c7af] hover:bg-[#f4f9f4]">
      <div className="flex items-start justify-between">
        <span aria-hidden className="grid grid-cols-1 size-9 place-items-center rounded-lg bg-mint text-brand">
          <MapPin className="size-4" />
        </span>
        <ArrowRight aria-hidden className="size-4 text-ink-faint opacity-0 transition group-hover:opacity-100" />
      </div>
      <span className="mt-4 block text-sm font-semibold text-ink">{region.name}</span>
      <span className="mt-1 block text-xs text-ink-faint">
        {formatNumber(count)} {count === 1 ? 'business' : 'businesses'} · {towns} {towns === 1 ? 'town' : 'towns'}
      </span>
    </Link>
  )
}

export function TownChip({ town, count }: { town: Town; count: number }) {
  return (
    <Link href={`/towns/${town.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[#d7dfd7] bg-white px-3.5 py-2 text-xs transition hover:border-brand hover:text-brand">
      <span className="font-medium">{town.name}</span>
      <span className="text-ink-faint">{formatNumber(count)}</span>
    </Link>
  )
}
