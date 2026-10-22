import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="font-medium transition-colors hover:text-brand">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {item.label}
              </span>
            )}
            {i < items.length - 1 && <ChevronRight aria-hidden className="size-3 text-ink-faint" />}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-xs font-semibold text-brand hover:text-forest">
      <ArrowLeft className="size-3" /> {children}
    </Link>
  )
}

/** Page title block used by every directory page (eyebrow, h1, description, actions). */
export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col justify-between gap-5 md:flex-row md:items-end', className)}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-forest md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export const pageContainer = 'mx-auto max-w-[1240px] px-5 py-10 lg:px-8'
