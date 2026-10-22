'use client'

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import { Pagination } from './pagination'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => React.ReactNode
  /** Provide a sort key to make the column sortable. */
  sort?: (row: T) => string | number | null | undefined
  className?: string
  headerClassName?: string
  /** Hide the column below this breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg'
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' }
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  defaultSort,
  pageSize = 15,
  empty,
  resetKey,
  onRowClick,
  footerNote,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  caption: string
  defaultSort?: { id: string; dir: 'asc' | 'desc' }
  pageSize?: number
  empty?: React.ReactNode
  /** Changing this value sends the table back to page 1 (e.g. when filters change). */
  resetKey?: string
  onRowClick?: (row: T) => void
  footerNote?: React.ReactNode
}) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [resetKey])

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.id === sort.id)
    if (!col?.sort) return rows
    const get = col.sort
    const dir = sort.dir === 'asc' ? 1 : -1
    return rows.slice().sort((a, b) => {
      const x = get(a)
      const y = get(b)
      if (x === y) return 0
      if (x === null || x === undefined) return 1 // blanks always last
      if (y === null || y === undefined) return -1
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return collator.compare(String(x), String(y)) * dir
    })
  }, [rows, columns, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const visible = sorted.slice(start, start + pageSize)

  const toggle = (id: string) => setSort((s) => (s?.id === id ? (s.dir === 'asc' ? { id, dir: 'desc' } : null) : { id, dir: 'asc' }))

  if (rows.length === 0) return <>{empty}</>

  return (
    <div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${caption} (scrollable table)`}>
        <table className="w-full min-w-[640px] text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-table-head text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            <tr>
              {columns.map((c) => {
                const active = sort?.id === c.id
                return (
                  <th key={c.id} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : c.sort ? 'none' : undefined} className={cn('px-5 py-3 font-semibold', c.hideBelow && HIDE[c.hideBelow], c.headerClassName)}>
                    {c.sort ? (
                      <button type="button" onClick={() => toggle(c.id)} className={cn('inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-ink', active && 'text-ink')}>
                        {c.header}
                        {active ? sort!.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {visible.map((row) => (
              <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('hover:bg-hover-row', onRowClick && 'cursor-pointer')}>
                {columns.map((c) => (
                  <td key={c.id} className={cn('px-5 py-4 align-middle', c.hideBelow && HIDE[c.hideBelow], c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-divider px-5 py-3 text-xs text-ink-muted sm:flex-row">
        <p role="status">
          Showing <span className="font-semibold text-ink">{formatNumber(start + 1)}–{formatNumber(start + visible.length)}</span> of <span className="font-semibold text-ink">{formatNumber(sorted.length)}</span>
          {footerNote}
        </p>
        <Pagination page={current} pageCount={pageCount} onPage={setPage} />
      </div>
    </div>
  )
}

/** Wrapper that gives a table the standard admin card chrome. */
export function TableCard({ toolbar, children, className }: { toolbar?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-line-strong bg-white', className)}>
      {toolbar && <div className="flex flex-col gap-3 border-b border-divider p-4 sm:flex-row sm:flex-wrap sm:items-center">{toolbar}</div>}
      {children}
    </div>
  )
}
