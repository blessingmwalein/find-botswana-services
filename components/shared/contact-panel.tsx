'use client'

import { Clock, Globe, Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DAYS, formatHoursRange, openStatus } from '@/lib/format'
import { useSettings } from '@/lib/store/hooks'
import type { Business } from '@/lib/types'
import { CopyButton } from './copy-button'

function Row({ icon: Icon, label, children, copy }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode; copy?: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 grid grid-cols-1 size-8 shrink-0 place-items-center rounded-lg bg-mint text-brand">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</p>
        <div className="mt-0.5 break-words text-sm text-ink">{children}</div>
      </div>
      {copy && <CopyButton text={copy} label={label} />}
    </div>
  )
}

const link = 'font-medium text-brand underline-offset-2 hover:underline'

/** Contact details respecting the business's contact preferences. */
export function ContactPanel({ business: b, onEnquire, className }: { business: Business; onEnquire?: () => void; className?: string }) {
  const { allowEnquiries } = useSettings()
  const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`
  const canEnquire = allowEnquiries && b.contactPreferences.acceptEnquiries && onEnquire
  const social = b.social ? Object.entries(b.social) : []
  return (
    <Card className={cn('p-5', className)}>
      <h2 className="font-semibold text-forest">Contact</h2>
      <div className="mt-2 divide-y divide-divider">
        {b.contactPreferences.showPhone && (
          <Row icon={Phone} label="Phone" copy={b.phone}>
            <a href={tel(b.phone)} className={link}>
              {b.phone}
            </a>
            {b.alternatePhone && (
              <>
                <span className="text-ink-faint"> · </span>
                <a href={tel(b.alternatePhone)} className={link}>
                  {b.alternatePhone}
                </a>
              </>
            )}
          </Row>
        )}
        {b.contactPreferences.showEmail && (
          <Row icon={Mail} label="Email" copy={b.email}>
            <a href={`mailto:${b.email}`} className={link}>
              {b.email}
            </a>
          </Row>
        )}
        {b.website && (
          <Row icon={Globe} label="Website">
            <a href={b.website} target="_blank" rel="noopener noreferrer" className={link}>
              {b.website.replace(/^https?:\/\//, '')}
            </a>
          </Row>
        )}
        <Row icon={MapPin} label="Address" copy={b.address}>
          {b.address}
        </Row>
        {social.length > 0 && (
          <Row icon={MessageSquare} label="Social">
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              {social.map(([k, v]) => (
                <span key={k}>
                  <span className="capitalize">{k}</span> <span className="font-medium text-ink">{v}</span>
                </span>
              ))}
            </span>
          </Row>
        )}
      </div>
      {!b.contactPreferences.showPhone && !b.contactPreferences.showEmail && <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">This business prefers to be contacted through enquiries.</p>}
      {canEnquire && (
        <button type="button" onClick={onEnquire} className="mt-4 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest">
          Send an enquiry
        </button>
      )}
      {!canEnquire && onEnquire && <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">Enquiries are currently switched off for this listing.</p>}
      <p className="mt-3 text-center text-[10px] text-ink-faint">Fictional demo contact details</p>
    </Card>
  )
}

export function OpeningHoursCard({ business: b, className }: { business: Business; className?: string }) {
  // Open/closed is computed after mount so server and client markup always agree.
  const [status, setStatus] = useState<ReturnType<typeof openStatus>>(null)
  useEffect(() => {
    setStatus(openStatus(b.openingHours))
  }, [b.openingHours])
  const today = (new Date().getUTCDay() + 6) % 7
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-forest">
          <Clock aria-hidden className="size-4 text-brand" /> Opening hours
        </h2>
        {status && <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', status.open ? 'bg-mint text-brand' : 'bg-neutral-bg text-neutral')}>{status.label}</span>}
      </div>
      {b.openingHours ? (
        <dl className="mt-3 divide-y divide-divider text-sm">
          {DAYS.map((d, i) => (
            <div key={d.key} className={cn('flex justify-between py-2', status && i === today && 'font-semibold text-forest')}>
              <dt className="text-ink-muted">{d.label}</dt>
              <dd>{formatHoursRange(b.openingHours![d.key])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Opening hours haven’t been provided. Contact the business to confirm.</p>
      )}
    </Card>
  )
}
