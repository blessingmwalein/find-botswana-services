'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckboxField, TextAreaField } from '@/components/ui/form'
import { ConfirmDialog } from '@/components/ui/dialog'
import type { MenuAction } from '@/components/ui/menu'
import { useToast } from '@/components/ui/toast'
import { businessLifecycle, isBusinessPublic } from '@/lib/rules'
import { approveBusiness, deleteBusiness, rejectBusiness, reactivateBusiness, requestBusinessChanges, setFeatured, setListingStatus, setVerification, suspendBusiness, ADMIN_ACTOR } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import type { Business } from '@/lib/types'

type DialogKind = 'approve' | 'reject' | 'changes' | 'suspend' | 'delete'

const REJECT_PRESETS = ['The submitted contact details could not be confirmed.', 'This listing duplicates an existing business.', 'The business does not fit the directory’s supported categories.']
const CHANGE_PRESETS = ['Please add at least three products or services.', 'Please provide a full street address.', 'Please add clearer contact details and opening hours.']

export interface BusinessActionOptions {
  /** Called after a business is deleted (e.g. to leave its detail page). */
  onDeleted?: (b: Business) => void
  /** Called after an approval/rejection/changes decision (e.g. to advance the queue). */
  onDecided?: (b: Business, decision: 'approved' | 'rejected' | 'changes') => void
}

/** All administrator moderation actions for a business, with their confirmation dialogs. */
export function useBusinessActions(options: BusinessActionOptions = {}) {
  const idx = useIndex()
  const toast = useToast()
  const router = useRouter()
  const [dialog, setDialog] = useState<{ kind: DialogKind; business: Business } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [publish, setPublish] = useState(true)
  const [verify, setVerify] = useState(false)
  const [text, setText] = useState('')

  const open = (kind: DialogKind, business: Business) => {
    setDialog({ kind, business })
    setIsOpen(true)
    setPublish(true)
    setVerify(false)
    setText('')
  }
  const done = (r: { ok: boolean; error?: string }, message: string) => {
    if (r.ok) toast.success(message)
    else toast.error(r.error ?? 'That action could not be completed.')
    return r.ok
  }

  const direct = {
    reactivate: (b: Business) => done(reactivateBusiness(b.id), `${b.name} was reactivated`),
    verify: (b: Business) => done(setVerification(b.id, b.verificationStatus !== 'verified'), b.verificationStatus === 'verified' ? `${b.name} is no longer verified` : `${b.name} is now verified`),
    feature: (b: Business) => done(setFeatured(b.id, !b.featured), b.featured ? `${b.name} removed from featured` : `${b.name} is now featured`),
    togglePublish: (b: Business) => done(setListingStatus(b.id, b.listingStatus === 'published' ? 'unpublished' : 'published'), b.listingStatus === 'published' ? `${b.name} was unpublished` : `${b.name} was published`),
  }

  /** The actions that make sense for a business in its current state. */
  const menuFor = (b: Business, extra: { view?: string; edit?: string } = {}): (MenuAction | 'separator')[] => {
    const lc = businessLifecycle(b)
    const decidable = lc === 'pending' || lc === 'changes_requested' || lc === 'rejected' || lc === 'draft'
    return [
      { label: 'View details', onSelect: () => router.push(extra.view ?? `/admin/businesses/${b.id}`) },
      { label: 'Edit profile', onSelect: () => router.push(extra.edit ?? `/admin/businesses/${b.id}?tab=edit`) },
      { label: 'View public profile', hidden: !isBusinessPublic(b), onSelect: () => window.open(`/businesses/${b.slug}`, '_blank', 'noopener') },
      'separator',
      { label: lc === 'pending' ? 'Approve submission' : 'Approve', hidden: !decidable, onSelect: () => open('approve', b) },
      { label: 'Request changes', hidden: lc !== 'pending', onSelect: () => open('changes', b) },
      { label: 'Reject', hidden: lc !== 'pending' && lc !== 'changes_requested', onSelect: () => open('reject', b) },
      { label: b.listingStatus === 'published' ? 'Unpublish' : 'Publish', hidden: b.approvalStatus !== 'approved' || b.listingStatus === 'suspended', onSelect: () => direct.togglePublish(b) },
      { label: 'Suspend', hidden: b.approvalStatus !== 'approved' || b.listingStatus === 'suspended', onSelect: () => open('suspend', b) },
      { label: 'Reactivate', hidden: b.listingStatus !== 'suspended', onSelect: () => direct.reactivate(b) },
      { label: b.verificationStatus === 'verified' ? 'Remove verification' : 'Mark as verified', onSelect: () => direct.verify(b) },
      { label: b.featured ? 'Remove from featured' : 'Feature on home page', hidden: !isBusinessPublic(b), onSelect: () => direct.feature(b) },
      'separator',
      { label: 'Delete business…', danger: true, onSelect: () => open('delete', b) },
    ]
  }

  const b = dialog?.business
  const products = b ? (idx.productsByBusiness.get(b.id)?.length ?? 0) : 0
  const services = b ? (idx.servicesByBusiness.get(b.id)?.length ?? 0) : 0
  const enquiries = b ? (idx.enquiriesByBusiness.get(b.id)?.length ?? 0) : 0

  const element = (
    <>
      <ConfirmDialog
        open={isOpen && dialog?.kind === 'approve'}
        onOpenChange={(o) => !o && setIsOpen(false)}
        title={b ? `Approve ${b.name}?` : 'Approve'}
        description="Approval, publication and verification are separate decisions. Choose what happens now."
        confirmLabel="Approve"
        onConfirm={() => {
          if (!b) return
          const r = approveBusiness(b.id, { publish, verify }, ADMIN_ACTOR)
          if (!r.ok) return r.error
          toast.success(`${b.name} approved${publish ? ' and published' : ''}${verify ? ' · verified' : ''}`)
          options.onDecided?.(b, 'approved')
        }}
      >
        <div className="grid grid-cols-1 gap-3 rounded-xl bg-canvas p-4">
          <CheckboxField label="Publish immediately" description="Make the listing visible in search, directories and on the map." checked={publish} onChange={setPublish} />
          <CheckboxField label="Also mark as verified" description="Adds the Verified badge. You can change this later." checked={verify} onChange={setVerify} />
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Catalogue: {products} products · {services} services.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={isOpen && dialog?.kind === 'reject'}
        onOpenChange={(o) => !o && setIsOpen(false)}
        title={b ? `Reject ${b.name}?` : 'Reject'}
        description="The owner will see the reason and can correct and resubmit."
        confirmLabel="Reject submission"
        destructive
        onConfirm={() => {
          if (!b) return
          if (text.trim().length < 10) return 'Please give a reason of at least 10 characters.'
          const r = rejectBusiness(b.id, text, ADMIN_ACTOR)
          if (!r.ok) return r.error
          toast.success(`${b.name} was rejected`)
          options.onDecided?.(b, 'rejected')
        }}
      >
        <TextAreaField label="Reason for rejection" required rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <Presets items={REJECT_PRESETS} onPick={setText} />
      </ConfirmDialog>

      <ConfirmDialog
        open={isOpen && dialog?.kind === 'changes'}
        onOpenChange={(o) => !o && setIsOpen(false)}
        title={b ? `Request changes to ${b.name}` : 'Request changes'}
        description="The submission goes back to the owner with your note."
        confirmLabel="Request changes"
        onConfirm={() => {
          if (!b) return
          if (text.trim().length < 10) return 'Please describe the changes in at least 10 characters.'
          const r = requestBusinessChanges(b.id, text, ADMIN_ACTOR)
          if (!r.ok) return r.error
          toast.success(`Changes requested for ${b.name}`)
          options.onDecided?.(b, 'changes')
        }}
      >
        <TextAreaField label="What needs to change?" required rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <Presets items={CHANGE_PRESETS} onPick={setText} />
      </ConfirmDialog>

      <ConfirmDialog
        open={isOpen && dialog?.kind === 'suspend'}
        onOpenChange={(o) => !o && setIsOpen(false)}
        title={b ? `Suspend ${b.name}?` : 'Suspend'}
        description="The listing, its products and services disappear from public search, directories and the map until it is reactivated."
        confirmLabel="Suspend listing"
        destructive
        onConfirm={() => {
          if (!b) return
          const r = suspendBusiness(b.id, ADMIN_ACTOR)
          if (!r.ok) return r.error
          toast.success(`${b.name} was suspended`)
        }}
      />

      <ConfirmDialog
        open={isOpen && dialog?.kind === 'delete'}
        onOpenChange={(o) => !o && setIsOpen(false)}
        title={b ? `Delete ${b.name}?` : 'Delete'}
        description="This permanently removes the business from the demo dataset."
        confirmLabel="Delete business"
        destructive
        onConfirm={() => {
          if (!b) return
          const r = deleteBusiness(b.id, ADMIN_ACTOR)
          if (!r.ok) return r.error
          toast.success(`${b.name} was deleted`)
          options.onDeleted?.(b)
        }}
      >
        <p className="rounded-xl bg-danger-bg p-4 text-xs leading-5 text-danger">
          Also deleted: <strong>{products}</strong> products, <strong>{services}</strong> services and <strong>{enquiries}</strong> enquiries belonging to this business. Its owner’s account is kept.
        </p>
      </ConfirmDialog>
    </>
  )

  return { menuFor, open, direct, element }
}

function Presets({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((p) => (
        <button key={p} type="button" onClick={() => onPick(p)} className="rounded-full border border-[#d7dfd7] bg-white px-2.5 py-1 text-[11px] text-ink-muted transition hover:border-brand hover:text-brand">
          {p}
        </button>
      ))}
    </div>
  )
}
