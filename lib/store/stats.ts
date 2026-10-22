import { SEED_ANCHOR } from '../seed'
import type { Dataset } from '../types'

const DAY = 86_400_000

/**
 * "Now" for dashboard windows. Seed timestamps are fixed, so windows are measured from the most recent
 * activity in the dataset (which advances as soon as an admin does something) rather than the wall clock.
 */
export function referenceTime(data: Dataset): number {
  let max = 0
  for (const a of data.activities) max = Math.max(max, Date.parse(a.at))
  for (const b of data.businesses) max = Math.max(max, Date.parse(b.createdAt))
  // Seed records are dated up to the seed anchor; start the clock a few hours later so the newest isn't "just now".
  return Math.max(max, Date.parse(SEED_ANCHOR)) + 6 * 3_600_000
}

export function countSince(dates: string[], days: number, ref: number): number {
  const from = ref - days * DAY
  return dates.filter((d) => Date.parse(d) >= from).length
}

export function groupCount<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = key(it)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

export interface Bucket {
  label: string
  start: number
  count: number
}

/** Counts per consecutive week ending at `ref` (oldest first). */
export function weeklyBuckets(dates: string[], weeks: number, ref: number): Bucket[] {
  const buckets: Bucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const end = ref - i * 7 * DAY
    const start = end - 7 * DAY
    const d = new Date(end)
    buckets.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), start, count: dates.filter((x) => Date.parse(x) > start && Date.parse(x) <= end).length })
  }
  return buckets
}

/** Counts per calendar month (UTC), oldest first, for the most recent `months`. */
export function monthlyBuckets(dates: string[], months: number, ref: number): Bucket[] {
  const base = new Date(ref)
  const out: Bucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1))
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
    out.push({
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      start: d.getTime(),
      count: dates.filter((x) => Date.parse(x) >= d.getTime() && Date.parse(x) < next).length,
    })
  }
  return out
}
