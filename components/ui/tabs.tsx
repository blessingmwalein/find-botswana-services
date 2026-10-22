'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  count?: number
}

/** Accessible tab list (arrow-key navigation). The caller renders the active panel with `role="tabpanel"`. */
export function Tabs({ items, value, onChange, label, className, idPrefix = 'tab' }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string; className?: string; idPrefix?: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return
    e.preventDefault()
    const id = items[next].id
    onChange(id)
    refs.current[id]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((item, i) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el
            }}
            id={`${idPrefix}-${item.id}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition',
              active ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && <span className={cn('ml-2 rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-mint text-brand' : 'bg-neutral-bg text-ink-muted')}>{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
