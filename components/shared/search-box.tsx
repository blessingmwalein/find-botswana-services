'use client'

import { Building2, MapPin, Package, Search, Tag, Wrench, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { suggest, type Suggestion } from '@/lib/search/engine'
import { useIndex } from '@/lib/store/hooks'
import { prefs } from '@/lib/store/actions'
import { cn } from '@/lib/utils'

const ICONS: Record<Suggestion['type'], React.ComponentType<{ className?: string }>> = {
  business: Building2,
  product: Package,
  service: Wrench,
  category: Tag,
  town: MapPin,
}

interface SearchBoxProps {
  /** Committed value (e.g. from the URL). */
  value: string
  /** Called after a short debounce while typing, and immediately on Enter. */
  onCommit: (value: string) => void
  placeholder?: string
  label?: string
  /** Show a typeahead of matching businesses, products, services, categories and towns. */
  suggestions?: boolean
  autoFocus?: boolean
  className?: string
  inputClassName?: string
  /** Borderless variant used inside composite search panels. */
  bare?: boolean
  /** Debounce (ms) for committing while typing, or `false` to commit only on Enter / "See all results". */
  debounce?: number | false
  /** Fires on every keystroke (e.g. so a sibling "Search" button can submit the current text). */
  onDraftChange?: (value: string) => void
}

export function SearchBox({ value, onCommit, placeholder = 'Search businesses, products or services', label = 'Search directory', suggestions = true, autoFocus, className, inputClassName, bare, debounce = 300, onDraftChange }: SearchBoxProps) {
  const idx = useIndex()
  const router = useRouter()
  const listId = useId()
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const lastCommitted = useRef(value)

  // Keep the input in sync when the committed value changes elsewhere (clear-all, chips, back button).
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value
      setDraft(value)
    }
  }, [value])

  // Debounced commit while typing.
  useEffect(() => {
    if (debounce === false || draft === lastCommitted.current) return
    const t = setTimeout(() => {
      lastCommitted.current = draft
      onCommit(draft)
      setOpen(false)
    }, debounce)
    return () => clearTimeout(t)
  }, [draft, onCommit, debounce])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const items = useMemo(() => (suggestions && open && draft.trim().length >= 2 ? suggest(idx, draft) : []), [suggestions, open, draft, idx])

  const commitNow = (v: string) => {
    lastCommitted.current = v
    onCommit(v)
    prefs.recordSearch(v)
    setOpen(false)
  }

  const choose = (s: Suggestion) => {
    prefs.recordSearch(draft)
    setOpen(false)
    router.push(s.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault()
      setActive((a) => (a + 1) % items.length)
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault()
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && items[active]) choose(items[active])
      else commitNow(draft)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div
      ref={wrapRef}
      className={cn('relative', className)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <div className={cn('flex items-center gap-3 px-4 py-3', bare ? 'rounded-xl bg-canvas' : 'rounded-xl border border-line-strong bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20')}>
        <Search aria-hidden className="size-4 shrink-0 text-brand" />
        <input
          role="combobox"
          aria-label={label}
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            onDraftChange?.(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn('w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-faint', inputClassName)}
        />
        {draft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setDraft('')
              onDraftChange?.('')
              commitNow('')
            }}
            className="rounded-md p-1 text-ink-faint hover:bg-neutral-bg hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_14px_40px_rgba(18,55,42,0.12)]">
          {items.map((s, i) => {
            const Icon = ICONS[s.type]
            return (
              <li key={`${s.type}-${s.href}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(s)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left', i === active ? 'bg-mint' : 'hover:bg-canvas')}>
                  <span className="grid grid-cols-1 size-8 shrink-0 place-items-center rounded-lg bg-mint text-brand">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{s.label}</span>
                    <span className="block truncate text-[11px] text-ink-muted">{s.sub}</span>
                  </span>
                </button>
              </li>
            )
          })}
          <li role="presentation">
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => commitNow(draft)} className="mt-1 w-full rounded-lg border-t border-divider px-3 py-2.5 text-left text-xs font-semibold text-brand hover:bg-canvas">
              See all results for “{draft.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
