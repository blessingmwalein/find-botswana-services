'use client'

import { Mail, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, TableCard, type Column } from '@/components/ui/data-table'
import { Drawer } from '@/components/ui/dialog'
import { EnquiryStatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatDateTime } from '@/lib/format'
import { setEnquiryStatus, type Actor } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import type { Business, Enquiry, EnquiryStatus } from '@/lib/types'

export function EnquiriesPanel({ business, actor }: { business: Business; actor: Actor }) {
  const idx = useIndex()
  const toast = useToast()
  const [status, setStatus] = useState<'all' | EnquiryStatus>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const all = useMemo(() => (idx.enquiriesByBusiness.get(business.id) ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [idx, business.id])
  const rows = status === 'all' ? all : all.filter((e) => e.status === status)
  const open = openId ? all.find((e) => e.id === openId) : undefined
  const counts = (s: EnquiryStatus) => all.filter((e) => e.status === s).length

  const targetName = (e: Enquiry) => (e.targetType === 'product' ? idx.productById.get(e.targetId)?.name : e.targetType === 'service' ? idx.serviceById.get(e.targetId)?.name : undefined) ?? business.name
  const change = (e: Enquiry, next: EnquiryStatus) => {
    const r = setEnquiryStatus(e.id, next, actor)
    if (r.ok) toast.success(`Marked as ${next}`)
    else toast.error(r.error)
  }
  const openEnquiry = (e: Enquiry) => {
    setOpenId(e.id)
    if (e.status === 'new') setEnquiryStatus(e.id, 'read', actor)
  }

  const columns: Column<Enquiry>[] = [
    {
      id: 'from',
      header: 'From',
      sort: (e) => e.name,
      cell: (e) => (
        <div>
          <p className="font-semibold text-ink">{e.name}</p>
          <p className="mt-0.5 text-[10px] text-ink-faint">{e.email}</p>
        </div>
      ),
    },
    {
      id: 'about',
      header: 'About',
      hideBelow: 'md',
      cell: (e) => (
        <div className="max-w-[260px]">
          <p className="truncate text-ink">{targetName(e)}</p>
          <p className="mt-0.5 text-[10px] capitalize text-ink-faint">{e.targetType}</p>
        </div>
      ),
    },
    { id: 'message', header: 'Message', hideBelow: 'lg', cell: (e) => <p className="max-w-[260px] truncate text-ink-muted">{e.message}</p> },
    { id: 'received', header: 'Received', sort: (e) => e.createdAt, cell: (e) => <span className="whitespace-nowrap text-ink-muted">{formatDate(e.createdAt)}</span> },
    { id: 'status', header: 'Status', sort: (e) => e.status, cell: (e) => <EnquiryStatusBadge status={e.status} /> },
    {
      id: 'open',
      header: '',
      cell: (e) => (
        <button type="button" onClick={() => openEnquiry(e)} className="font-semibold text-brand hover:text-forest" aria-label={`Open enquiry from ${e.name}`}>
          Open
        </button>
      ),
    },
  ]

  return (
    <div>
      <div role="group" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {(['all', 'new', 'read', 'replied', 'closed'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition ${status === s ? 'border-brand bg-brand text-white' : 'border-[#d7dfd7] bg-white text-ink-muted hover:border-brand hover:text-brand'}`}>
            {s} <span className={status === s ? 'text-white/80' : 'text-ink-faint'}>{s === 'all' ? all.length : counts(s)}</span>
          </button>
        ))}
      </div>
      <TableCard>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.id}
          caption="Enquiries"
          defaultSort={{ id: 'received', dir: 'desc' }}
          pageSize={8}
          resetKey={status}
          onRowClick={openEnquiry}
          empty={<EmptyState className="border-0" title={all.length ? 'No enquiries with this status' : 'No enquiries yet'}>{all.length ? 'Choose another status filter.' : 'When customers contact this business through its public listing, their enquiries appear here.'}</EmptyState>}
        />
      </TableCard>

      <Drawer
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={open ? `Enquiry from ${open.name}` : 'Enquiry'}
        description={open ? `Received ${formatDateTime(open.createdAt)}` : undefined}
        footer={
          open && (
            <>
              {open.status !== 'replied' && (
                <Button variant="soft" size="md" onClick={() => change(open, 'replied')}>
                  Mark as replied
                </Button>
              )}
              {open.status !== 'closed' ? (
                <Button variant="soft" size="md" onClick={() => change(open, 'closed')}>
                  Close enquiry
                </Button>
              ) : (
                <Button variant="soft" size="md" onClick={() => change(open, 'read')}>
                  Reopen
                </Button>
              )}
              <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${targetName(open)}`)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-forest">
                <Mail className="size-3.5" /> Reply by email
              </a>
            </>
          )
        }
      >
        {open && (
          <div className="grid grid-cols-1 gap-5 text-sm">
            <div className="flex items-center gap-2">
              <EnquiryStatusBadge status={open.status} />
              <span className="text-xs capitalize text-ink-muted">{open.targetType} enquiry</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">About</p>
              <p className="mt-1 font-medium text-ink">{targetName(open)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Message</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-canvas p-4 leading-6 text-ink">{open.message}</p>
            </div>
            {open.preferredDate && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Preferred date</p>
                <p className="mt-1 text-ink">{formatDate(open.preferredDate)}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-line p-4">
              <p className="flex items-center gap-2 text-ink"><Mail className="size-4 text-brand" /> <a className="font-medium text-brand hover:underline" href={`mailto:${open.email}`}>{open.email}</a></p>
              {open.phone && <p className="flex items-center gap-2 text-ink"><Phone className="size-4 text-brand" /> <a className="font-medium text-brand hover:underline" href={`tel:${open.phone.replace(/[^\d+]/g, '')}`}>{open.phone}</a></p>}
            </div>
            <p className="text-[11px] text-ink-faint">Demo data: contact details are fictional. “Reply by email” opens your own mail app — nothing is sent from this demo.</p>
          </div>
        )}
      </Drawer>
    </div>
  )
}
