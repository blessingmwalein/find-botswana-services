import { Compass } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/** The original logo lock-up: compass tile + "find botswana" wordmark. */
export function Logo({ dark = false, href = '/', className }: { dark?: boolean; href?: string | null; className?: string }) {
  const mark = (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className={cn('grid size-9 place-items-center rounded-xl', dark ? 'bg-white/12 text-white' : 'bg-brand text-white')}>
        <Compass className="size-5" strokeWidth={2.2} />
      </span>
      <span className={cn('text-[17px] font-semibold tracking-[-0.03em]', dark ? 'text-white' : 'text-forest')}>
        find <span className="font-normal">botswana</span>
      </span>
    </span>
  )
  return href ? (
    <Link href={href} aria-label="Find Botswana — home" className="rounded-lg">
      {mark}
    </Link>
  ) : (
    mark
  )
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-line-green bg-mint px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand', className)}>
      <span className="size-1.5 rounded-full bg-moss" /> Demo mode
    </span>
  )
}
