'use client'

import { Grid2X2, List, MapPin, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { SelectField, TextField } from '@/components/ui/form'
import { formatNumber } from '@/lib/format'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import { cn } from '@/lib/utils'

/** Sidebar filter card. Collapsible on small screens, always open from `lg` up. */
export function FilterPanel({ activeCount, onClear, children, className }: { activeCount: number; onClear: () => void; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className={cn('self-start p-4 lg:sticky lg:top-24', className)}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 text-sm font-semibold lg:pointer-events-none" aria-controls="filter-panel-body">
          <SlidersHorizontal aria-hidden className="size-4 text-brand" /> Filters
          {activeCount > 0 && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs font-semibold text-brand hover:text-forest">
            Clear all
          </button>
        )}
      </div>
      <div id="filter-panel-body" className={cn('mt-4 flex-col gap-4', open ? 'flex' : 'hidden lg:flex')}>
        {children}
      </div>
    </Card>
  )
}

export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value)} className="py-2.5 text-xs">
      {children}
    </SelectField>
  )
}

export function CategoryFilter({ value, onChange, label = 'Category' }: { value: string; onChange: (slug: string) => void; label?: string }) {
  const idx = useIndex()
  return (
    <FilterSelect label={label} value={value} onChange={onChange}>
      <option value="">All categories</option>
      {parentCategories(idx)
        .filter((c) => c.enabled || c.slug === value)
        .map((parent) => {
          const kids = childCategories(idx, parent.id).filter((c) => c.enabled || c.slug === value)
          return kids.length ? (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.slug}>All {parent.name}</option>
              {kids.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={parent.id} value={parent.slug}>
              {parent.name}
            </option>
          )
        })}
    </FilterSelect>
  )
}

/** Region → town cascade. Changing the region drops a town that no longer belongs to it. */
export function LocationFilter({ region, town, onChange }: { region: string; town: string; onChange: (patch: { region: string; town: string }) => void }) {
  const idx = useIndex()
  const regionRec = region ? idx.regionBySlug.get(region) : undefined
  const towns = idx.data.towns
    .filter((t) => (t.enabled || t.slug === town) && (!regionRec || t.regionId === regionRec.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <>
      <FilterSelect
        label="Region"
        value={region}
        onChange={(r) => {
          const keep = town && r ? idx.townBySlug.get(town)?.regionId === idx.regionBySlug.get(r)?.id : false
          onChange({ region: r, town: keep ? town : '' })
        }}
      >
        <option value="">All regions</option>
        {idx.data.regions
          .filter((r) => r.enabled || r.slug === region)
          .map((r) => (
            <option key={r.id} value={r.slug}>
              {r.name}
            </option>
          ))}
      </FilterSelect>
      <FilterSelect
        label="Town"
        value={town}
        onChange={(t) => {
          const rec = idx.townBySlug.get(t)
          onChange({ region: rec ? idx.regionById.get(rec.regionId)?.slug ?? region : region, town: t })
        }}
      >
        <option value="">{regionRec ? `All towns in ${regionRec.name}` : 'All towns'}</option>
        {towns.map((t) => (
          <option key={t.id} value={t.slug}>
            {t.name}
          </option>
        ))}
      </FilterSelect>
    </>
  )
}

export function PriceRangeFilter({ min, max, onChange }: { min: string; max: string; onChange: (patch: { min: string; max: string }) => void }) {
  const [draft, setDraft] = useState({ min, max })
  const [prev, setPrev] = useState({ min, max })
  if (prev.min !== min || prev.max !== max) {
    setPrev({ min, max })
    setDraft({ min, max })
  }
  const commit = () => onChange({ min: draft.min.trim(), max: draft.max.trim() })
  const invalid = draft.min !== '' && draft.max !== '' && Number(draft.min) > Number(draft.max)
  return (
    <fieldset>
      <legend className="text-xs font-medium text-ink">Price (BWP)</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <TextField label="Minimum price" hideLabel inputMode="numeric" placeholder="Min" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/[^\d]/g, '') })} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} className="py-2 text-xs" />
        <TextField label="Maximum price" hideLabel inputMode="numeric" placeholder="Max" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value.replace(/[^\d]/g, '') })} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} className="py-2 text-xs" />
      </div>
      {invalid && <p role="alert" className="mt-1.5 text-[11px] font-medium text-danger">Minimum is higher than maximum.</p>}
    </fieldset>
  )
}

export interface Chip {
  key: string
  label: string
  onRemove: () => void
}

export function ActiveFilters({ chips, onClear }: { chips: Chip[]; onClear: () => void }) {
  if (!chips.length) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full border border-line-green bg-mint py-1 pl-3 pr-1.5 text-xs font-medium text-brand">
          {c.label}
          <button type="button" onClick={c.onRemove} aria-label={`Remove filter: ${c.label}`} className="grid grid-cols-1 size-5 place-items-center rounded-full hover:bg-sage">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClear} className="px-1 text-xs font-semibold text-brand hover:text-forest">
        Clear all
      </button>
    </div>
  )
}

export interface SortOption {
  value: string
  label: string
  disabled?: boolean
}

export function ResultsBar({
  from,
  to,
  total,
  noun,
  sort,
  sortOptions,
  onSort,
  view,
  onView,
  mapHref,
}: {
  from: number
  to: number
  total: number
  noun: string
  sort: string
  sortOptions: SortOption[]
  onSort: (v: string) => void
  view?: 'grid' | 'list'
  onView?: (v: 'grid' | 'list') => void
  mapHref?: string
}) {
  const seg = 'grid size-9 place-items-center rounded-lg border transition'
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <p aria-live="polite" role="status">
        {total === 0 ? <>No {noun}s</> : <>Showing <span className="font-semibold text-ink">{formatNumber(from)}–{formatNumber(to)}</span> of <span className="font-semibold text-ink">{formatNumber(total)}</span> {noun}{total === 1 ? '' : 's'}</>}
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="sr-only sm:not-sr-only">Sort by</span>
          <select value={sort} onChange={(e) => onSort(e.target.value)} className="rounded-lg border border-line-strong bg-white px-2.5 py-2 text-xs font-medium text-ink outline-none focus:border-brand">
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {view && onView && (
          <div role="group" aria-label="Layout" className="flex gap-1.5">
            <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => onView('grid')} className={cn(seg, view === 'grid' ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-brand hover:bg-mint')}>
              <Grid2X2 className="size-4" />
            </button>
            <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => onView('list')} className={cn(seg, view === 'list' ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-brand hover:bg-mint')}>
              <List className="size-4" />
            </button>
            {mapHref && (
              <Link href={mapHref} aria-label="Show on map" className={cn(seg, 'border-line-strong bg-white text-brand hover:bg-mint')}>
                <MapPin className="size-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
