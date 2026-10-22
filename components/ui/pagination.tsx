'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'

function pageWindow(page: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const pages = new Set([1, 2, count - 1, count, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function Pagination({ page, pageCount, onPage, className }: { page: number; pageCount: number; onPage: (page: number) => void; className?: string }) {
  if (pageCount <= 1) return null
  const btn = 'grid h-9 min-w-9 place-items-center rounded-lg border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      <button type="button" className={cn(btn, 'border-line-strong bg-white text-ink-muted hover:bg-mint hover:text-brand')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-xs text-ink-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, p === page ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-ink-muted hover:bg-mint hover:text-brand')}
          >
            {formatNumber(p)}
          </button>
        ),
      )}
      <button type="button" className={cn(btn, 'border-line-strong bg-white text-ink-muted hover:bg-mint hover:text-brand')} disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
