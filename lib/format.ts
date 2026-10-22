import type { DayKey, OpeningHours, Product, ProductAvailability, Service, ServiceAvailability } from './types'

const nf = new Intl.NumberFormat('en-BW', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "P 1,250" — whole pula for round prices, two decimals when needed. */
export function formatPula(amount: number): string {
  return `P ${Number.isInteger(amount) ? nf.format(amount) : nf2.format(amount)}`
}

export function formatNumber(n: number): string {
  return nf.format(n)
}

export function productPriceLabel(p: Pick<Product, 'priceType' | 'price'>): string {
  if (p.priceType === 'quote' || p.price === undefined) return 'Request a quote'
  return p.priceType === 'from' ? `From ${formatPula(p.price)}` : formatPula(p.price)
}

export function productPriceSuffix(p: Pick<Product, 'priceType' | 'price' | 'unit'>): string {
  return p.priceType === 'quote' || p.price === undefined ? '' : p.unit
}

export function servicePriceLabel(s: Pick<Service, 'pricingModel' | 'price' | 'priceMax'>): string {
  if (s.pricingModel === 'quote' || s.price === undefined) return 'Request a quote'
  const range = s.priceMax !== undefined && s.priceMax > s.price ? `${formatPula(s.price)} – ${formatNumber(s.priceMax)}` : formatPula(s.price)
  switch (s.pricingModel) {
    case 'hourly':
      return `${range} / hour`
    case 'daily':
      return `${range} / day`
    case 'monthly':
      return `${range} / month`
    case 'project':
      return s.priceMax !== undefined ? `${range} per project` : `From ${range} per project`
    default:
      return range
  }
}

const HOSPITALITY_UNITS = /^per (night|day|person|pack|hamper|box)$/

export function availabilityLabel(a: ProductAvailability, unit?: string): string {
  const stay = unit ? HOSPITALITY_UNITS.test(unit) : false
  switch (a) {
    case 'in_stock':
      return stay ? 'Available' : 'In stock'
    case 'low_stock':
      return stay ? 'Limited availability' : 'Low stock'
    case 'made_to_order':
      return 'Made to order'
    case 'seasonal':
      return 'Seasonal'
    case 'out_of_stock':
      return stay ? 'Fully booked' : 'Out of stock'
  }
}

export function serviceAvailabilityLabel(a: ServiceAvailability): string {
  return { available: 'Available', limited: 'Limited availability', waitlist: 'Waitlist', unavailable: 'Unavailable' }[a]
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d)
}

/** Relative time for recent records; older records fall back to an absolute date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso)
  if (Number.isNaN(diff)) return '—'
  if (diff < 0) return formatDate(iso)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const days = Math.floor(hr / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(iso)
}

export const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
]

export function formatHoursRange(h: { open: string; close: string } | null): string {
  if (!h) return 'Closed'
  if (h.open === '00:00' && h.close === '23:59') return 'Open 24 hours'
  return `${h.open} – ${h.close}`
}

/** Open-now status relative to Botswana time (UTC+2, no daylight saving). */
export function openStatus(hours: OpeningHours | null, now = new Date()): { open: boolean; label: string } | null {
  if (!hours) return null
  const bw = new Date(now.getTime() + 2 * 3600_000)
  const dayIndex = (bw.getUTCDay() + 6) % 7 // Monday = 0
  const key = DAYS[dayIndex].key
  const today = hours[key]
  if (!today) return { open: false, label: 'Closed today' }
  const mins = bw.getUTCHours() * 60 + bw.getUTCMinutes()
  const [oh, om] = today.open.split(':').map(Number)
  const [ch, cm] = today.close.split(':').map(Number)
  const open = mins >= oh * 60 + om && mins <= ch * 60 + cm
  if (today.open === '00:00' && today.close === '23:59') return { open: true, label: 'Open 24 hours' }
  return open ? { open: true, label: `Open now · closes ${today.close}` } : { open: false, label: mins < oh * 60 + om ? `Closed · opens ${today.open}` : 'Closed now' }
}

export function pluralise(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(n)} ${n === 1 ? singular : plural}`
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !/^(&|and|the|of|\(.*\))$/i.test(w))
  return words.slice(0, 2).map((w) => w.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase()).join('') || 'FB'
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
