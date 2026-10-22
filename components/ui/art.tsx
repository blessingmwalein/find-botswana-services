import { cn } from '@/lib/utils'
import type { ArtRef, Business, ToneKey } from '@/lib/types'

// Static class names so Tailwind can see every tone.
export const TONE_BG: Record<ToneKey, string> = {
  sage: 'bg-tone-sage',
  sand: 'bg-tone-sand',
  clay: 'bg-tone-clay',
  sky: 'bg-tone-sky',
  mist: 'bg-tone-mist',
  stone: 'bg-tone-stone',
}

const INK = 'rgba(23,107,69,'
const PATTERNS: { image: string; size?: string }[] = [
  { image: `radial-gradient(${INK}0.16) 1.5px, transparent 1.6px)`, size: '14px 14px' },
  { image: `linear-gradient(${INK}0.10) 1px, transparent 1px), linear-gradient(90deg, ${INK}0.10) 1px, transparent 1px)`, size: '18px 18px' },
  { image: `repeating-linear-gradient(45deg, ${INK}0.10) 0 2px, transparent 2px 12px)` },
  { image: `radial-gradient(circle at 72% 28%, transparent 0 18px, ${INK}0.13) 19px 20px, transparent 21px 34px, ${INK}0.10) 35px 36px, transparent 37px)` },
  { image: `repeating-radial-gradient(circle at 0 100%, transparent 0 14px, ${INK}0.10) 15px 16px)` },
]

/** Deterministic placeholder artwork — pure CSS, so there are no image requests to fail or slow the page. */
export function Art({ art, className, labelClassName }: { art: ArtRef; className?: string; labelClassName?: string }) {
  const p = PATTERNS[art.pattern % PATTERNS.length]
  return (
    <div role="img" aria-label={art.label ? `${art.label} placeholder image` : 'Placeholder image'} className={cn('relative grid place-items-center overflow-hidden', TONE_BG[art.tone], className)}>
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: p.image, backgroundSize: p.size }} />
      {art.label && <span className={cn('relative font-bold text-brand', labelClassName)}>{art.label}</span>}
    </div>
  )
}

/** Initials tile used for business logos (same treatment as the original cards). */
export function BizLogo({ business, className }: { business: Pick<Business, 'logo' | 'name'>; className?: string }) {
  return (
    <div aria-hidden className={cn('grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-brand', TONE_BG[business.logo.tone], className)}>
      {business.logo.initials}
    </div>
  )
}
