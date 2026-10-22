'use client'

import { DAYS } from '@/lib/format'
import type { DayHours, DayKey, OpeningHours } from '@/lib/types'
import { cn } from '@/lib/utils'
import { inputClass } from '@/components/ui/form'

const h = (open: string, close: string): DayHours => ({ open, close })

export const HOURS_PRESETS: { id: string; label: string; build: () => OpeningHours | null }[] = [
  { id: 'weekdays', label: 'Weekdays 08:00–17:00', build: () => ({ mon: h('08:00', '17:00'), tue: h('08:00', '17:00'), wed: h('08:00', '17:00'), thu: h('08:00', '17:00'), fri: h('08:00', '17:00'), sat: null, sun: null }) },
  { id: 'weekdays-sat', label: 'Weekdays + Saturday morning', build: () => ({ mon: h('08:00', '17:00'), tue: h('08:00', '17:00'), wed: h('08:00', '17:00'), thu: h('08:00', '17:00'), fri: h('08:00', '17:00'), sat: h('08:00', '13:00'), sun: null }) },
  { id: 'everyday', label: 'Every day 07:00–19:00', build: () => ({ mon: h('07:00', '19:00'), tue: h('07:00', '19:00'), wed: h('07:00', '19:00'), thu: h('07:00', '19:00'), fri: h('07:00', '19:00'), sat: h('07:00', '19:00'), sun: h('07:00', '19:00') }) },
  { id: '24h', label: 'Open 24 hours', build: () => ({ mon: h('00:00', '23:59'), tue: h('00:00', '23:59'), wed: h('00:00', '23:59'), thu: h('00:00', '23:59'), fri: h('00:00', '23:59'), sat: h('00:00', '23:59'), sun: h('00:00', '23:59') }) },
]

export function defaultHours(): OpeningHours {
  return HOURS_PRESETS[0].build()!
}

/** Per-day opening hours editor with one-click presets. `null` means "not supplied". */
export function HoursEditor({ value, onChange }: { value: OpeningHours | null; onChange: (v: OpeningHours | null) => void }) {
  const set = (day: DayKey, next: DayHours | null) => onChange({ ...(value ?? emptyWeek()), [day]: next })
  const invalid = (d: DayHours | null) => !!d && d.close <= d.open && !(d.open === '00:00' && d.close === '23:59')
  return (
    <fieldset>
      <legend className="text-xs font-medium text-ink">Opening hours</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {HOURS_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(p.build())} className="rounded-full border border-[#d7dfd7] bg-white px-3 py-1.5 text-xs transition hover:border-brand hover:text-brand">
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => onChange(null)} className={cn('rounded-full border px-3 py-1.5 text-xs transition', value === null ? 'border-brand bg-mint text-brand' : 'border-[#d7dfd7] bg-white hover:border-brand hover:text-brand')}>
          Don’t show hours
        </button>
      </div>
      {value && (
        <div className="mt-4 divide-y divide-divider rounded-xl border border-line">
          {DAYS.map((d) => {
            const day = value[d.key]
            return (
              <div key={d.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <label className="flex w-28 items-center gap-2 text-xs font-medium">
                  <input type="checkbox" checked={!!day} onChange={(e) => set(d.key, e.target.checked ? h('08:00', '17:00') : null)} className="size-4 accent-brand" />
                  {d.label}
                </label>
                {day ? (
                  <div className="flex items-center gap-2 text-xs">
                    <input aria-label={`${d.label} opening time`} type="time" value={day.open} onChange={(e) => set(d.key, { ...day, open: e.target.value })} aria-invalid={invalid(day)} className={cn(inputClass, 'w-28 py-1.5 text-xs')} />
                    <span className="text-ink-faint">to</span>
                    <input aria-label={`${d.label} closing time`} type="time" value={day.close} onChange={(e) => set(d.key, { ...day, close: e.target.value })} aria-invalid={invalid(day)} className={cn(inputClass, 'w-28 py-1.5 text-xs')} />
                    {invalid(day) && <span role="alert" className="text-[11px] font-medium text-danger">Closing must be after opening</span>}
                  </div>
                ) : (
                  <span className="text-xs text-ink-faint">Closed</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}

function emptyWeek(): OpeningHours {
  return { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }
}

export function hoursValid(v: OpeningHours | null): boolean {
  if (!v) return true
  return Object.values(v).every((d) => !d || d.close > d.open || (d.open === '00:00' && d.close === '23:59'))
}
