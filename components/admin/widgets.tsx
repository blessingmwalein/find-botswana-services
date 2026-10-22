'use client'

import { Check, Edit3, Eye, MessageSquare, Package, Plus, ShieldAlert, ShieldCheck, UserCog, X } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatNumber, timeAgo } from '@/lib/format'
import type { Activity } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, note, pill, href }: { label: string; value: string | number; note?: string; pill?: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-muted">{label}</span>
        {pill && <span className="rounded-full bg-mint px-2 py-1 text-[10px] font-semibold text-brand">{pill}</span>}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-forest">{typeof value === 'number' ? formatNumber(value) : value}</div>
      {note && <div className="mt-1 text-[11px] text-ink-faint">{note}</div>}
    </>
  )
  const cls = 'block rounded-xl border border-line-strong bg-white p-5'
  return href ? (
    <Link href={href} className={cn(cls, 'transition hover:border-[#b9d1be] hover:shadow-[0_8px_20px_rgba(18,55,42,0.06)]')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function Panel({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('border-line-strong p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-forest">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-ink-faint">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  )
}

/** Vertical bars in the original dashboard style, with value labels and an accessible text summary. */
export function ColumnChart({ data, ariaLabel, height = 190 }: { data: { label: string; value: number }[]; ariaLabel: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      <div role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`} className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5" style={{ height: '100%' }}>
            <span className="text-[10px] font-semibold text-ink-muted">{d.value}</span>
            <div className="w-full rounded-t-md bg-[#a9cbaa] transition hover:bg-brand" style={{ height: `${Math.max(2, (d.value / max) * (height - 44))}px` }} title={`${d.label}: ${d.value}`} />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-ink-faint">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function BarList({ data, hrefFor }: { data: { label: string; value: number; id?: string }[]; hrefFor?: (d: { label: string; id?: string }) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="grid grid-cols-1 gap-3">
      {data.map((d) => {
        const label = hrefFor ? (
          <Link href={hrefFor(d)} className="truncate hover:text-brand hover:underline">
            {d.label}
          </Link>
        ) : (
          <span className="truncate">{d.label}</span>
        )
        return (
          <li key={d.id ?? d.label}>
            <div className="flex items-center justify-between gap-3 text-xs text-ink">
              {label}
              <span className="font-semibold text-ink-muted">{formatNumber(d.value)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-bg">
              <div className="h-full rounded-full bg-[#7fb48f]" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div>
      <div role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')} className="flex h-3 overflow-hidden rounded-full bg-neutral-bg">
        {segments.map((s) => (s.value ? <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} /> : null))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-ink-muted">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
            </span>
            <span className="font-semibold text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ACTION_STYLE: { match: RegExp; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { match: /approved|published|reactivated|enabled|verified$/, icon: Check, tone: 'bg-mint text-brand' },
  { match: /rejected|suspended|deleted|disabled|unverified|unpublished/, icon: X, tone: 'bg-danger-bg text-danger' },
  { match: /changes_requested|submitted/, icon: ShieldAlert, tone: 'bg-warn-bg text-warn' },
  { match: /enquiry/, icon: MessageSquare, tone: 'bg-info-bg text-info' },
  { match: /product|service/, icon: Package, tone: 'bg-info-bg text-info' },
  { match: /user/, icon: UserCog, tone: 'bg-neutral-bg text-neutral' },
  { match: /created|added/, icon: Plus, tone: 'bg-mint text-brand' },
  { match: /featured/, icon: ShieldCheck, tone: 'bg-warn-bg text-warn' },
  { match: /updated|settings/, icon: Edit3, tone: 'bg-neutral-bg text-neutral' },
]

export function activityStyle(action: string) {
  return ACTION_STYLE.find((s) => s.match.test(action)) ?? { icon: Eye, tone: 'bg-neutral-bg text-neutral' }
}

function entityHref(a: Activity): string | null {
  switch (a.entityType) {
    case 'business':
      return `/admin/businesses/${a.entityId}`
    case 'product':
      return '/admin/products'
    case 'service':
      return '/admin/services'
    case 'category':
      return '/admin/categories'
    case 'region':
      return '/admin/regions'
    case 'town':
      return '/admin/towns'
    case 'user':
      return '/admin/users'
    case 'system':
      return '/admin/settings'
    default:
      return null
  }
}

export function ActivityTimeline({ items, emptyText = 'No activity yet.' }: { items: Activity[]; emptyText?: string }) {
  if (!items.length) return <p className="text-sm text-ink-muted">{emptyText}</p>
  return (
    <ol className="grid grid-cols-1 gap-4">
      {items.map((a) => {
        const { icon: Icon, tone } = activityStyle(a.action)
        const href = entityHref(a)
        return (
          <li key={a.id} className="flex items-start gap-3">
            <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', tone)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-5 text-ink">
                {href ? (
                  <Link href={href} className="hover:text-brand hover:underline">
                    {a.message}
                  </Link>
                ) : (
                  a.message
                )}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-faint">
                {a.actorName} · {a.actorRole} · <time dateTime={a.at}>{timeAgo(a.at)}</time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function LegendDot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="size-2.5 rounded-sm" style={{ background: color }} /> {children}
    </span>
  )
}
