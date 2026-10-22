'use client'

import { useState } from 'react'
import { ProductFormModal, ServiceFormModal } from '@/components/shared/catalog-forms'
import { AvailabilityBadge, PublicationBadge, ServiceAvailabilityBadge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/components/ui/toast'
import { formatDate, productPriceLabel, servicePriceLabel } from '@/lib/format'
import { deleteProduct, deleteService, setProductPublication, setServicePublication, type Actor } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import type { Business, Product, Service } from '@/lib/types'

const action = 'font-semibold text-brand hover:text-forest focus-visible:underline'

function Actions({ onEdit, onToggle, toggleLabel, onDelete, name }: { onEdit: () => void; onToggle: () => void; toggleLabel: string; onDelete: () => void; name: string }) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap">
      <button type="button" className={action} onClick={onEdit} aria-label={`Edit ${name}`}>
        Edit
      </button>
      <button type="button" className={action} onClick={onToggle} aria-label={`${toggleLabel} ${name}`}>
        {toggleLabel}
      </button>
      <button type="button" className="font-semibold text-danger hover:underline" onClick={onDelete} aria-label={`Delete ${name}`}>
        Delete
      </button>
    </div>
  )
}

export function ProductTable({ rows, actor, showBusiness, resetKey, empty, businesses }: { rows: Product[]; actor: Actor; showBusiness?: boolean; resetKey?: string; empty?: React.ReactNode; businesses?: Business[] }) {
  const idx = useIndex()
  const toast = useToast()
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const columns: Column<Product>[] = [
    {
      id: 'name',
      header: 'Product',
      sort: (p) => p.name,
      cell: (p) => (
        <div>
          <p className="font-semibold text-ink">{p.name}</p>
          <p className="mt-0.5 text-[10px] text-ink-faint">{p.sku}</p>
        </div>
      ),
    },
    ...(showBusiness
      ? [{ id: 'business', header: 'Business', sort: (p: Product) => idx.businessById.get(p.businessId)?.name ?? '', hideBelow: 'md' as const, cell: (p: Product) => <span className="text-ink-muted">{idx.businessById.get(p.businessId)?.name}</span> }]
      : [{ id: 'category', header: 'Category', sort: (p: Product) => idx.categoryById.get(p.categoryId)?.name ?? '', hideBelow: 'lg' as const, cell: (p: Product) => <span className="text-ink-muted">{idx.categoryById.get(p.categoryId)?.name}</span> }]),
    { id: 'price', header: 'Price', sort: (p) => p.price ?? null, cell: (p) => <span className="font-semibold text-brand">{productPriceLabel(p)}</span> },
    { id: 'availability', header: 'Availability', hideBelow: 'md', cell: (p) => <AvailabilityBadge value={p.availability} unit={p.unit} /> },
    { id: 'visibility', header: 'Visibility', sort: (p) => p.publicationStatus, cell: (p) => <PublicationBadge status={p.publicationStatus} /> },
    { id: 'updated', header: 'Updated', sort: (p) => p.updatedAt, hideBelow: 'lg', cell: (p) => <span className="text-ink-muted">{formatDate(p.updatedAt)}</span> },
    {
      id: 'actions',
      header: 'Actions',
      cell: (p) => (
        <Actions
          name={p.name}
          onEdit={() => setEditing(p)}
          toggleLabel={p.publicationStatus === 'published' ? 'Unpublish' : 'Publish'}
          onToggle={() => {
            const next = p.publicationStatus === 'published' ? 'unpublished' : 'published'
            const r = setProductPublication(p.id, next, actor)
            if (r.ok) toast.success(`${p.name} ${next === 'published' ? 'published' : 'unpublished'}`)
            else toast.error(r.error)
          }}
          onDelete={() => setDeleting(p)}
        />
      ),
    },
  ]

  return (
    <>
      <DataTable rows={rows} columns={columns} rowKey={(p) => p.id} caption="Products" defaultSort={{ id: 'updated', dir: 'desc' }} pageSize={10} resetKey={resetKey} empty={empty} />
      {editing && <ProductFormModal open onOpenChange={(o) => !o && setEditing(null)} business={idx.businessById.get(editing.businessId)} businesses={businesses} product={editing} actor={actor} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this product?"
        description={deleting ? `“${deleting.name}” will be removed from the catalogue and the public directory. This cannot be undone.` : undefined}
        confirmLabel="Delete product"
        destructive
        onConfirm={() => {
          if (!deleting) return
          const r = deleteProduct(deleting.id, actor)
          if (!r.ok) return r.error
          toast.success(`${deleting.name} was deleted`)
        }}
      />
    </>
  )
}

export function ServiceTable({ rows, actor, showBusiness, resetKey, empty, businesses }: { rows: Service[]; actor: Actor; showBusiness?: boolean; resetKey?: string; empty?: React.ReactNode; businesses?: Business[] }) {
  const idx = useIndex()
  const toast = useToast()
  const [editing, setEditing] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)

  const columns: Column<Service>[] = [
    {
      id: 'name',
      header: 'Service',
      sort: (s) => s.name,
      cell: (s) => (
        <div>
          <p className="font-semibold text-ink">{s.name}</p>
          <p className="mt-0.5 max-w-[240px] truncate text-[10px] text-ink-faint">{s.serviceAreaNote}</p>
        </div>
      ),
    },
    ...(showBusiness
      ? [{ id: 'business', header: 'Business', sort: (s: Service) => idx.businessById.get(s.businessId)?.name ?? '', hideBelow: 'md' as const, cell: (s: Service) => <span className="text-ink-muted">{idx.businessById.get(s.businessId)?.name}</span> }]
      : [{ id: 'category', header: 'Category', sort: (s: Service) => idx.categoryById.get(s.categoryId)?.name ?? '', hideBelow: 'lg' as const, cell: (s: Service) => <span className="text-ink-muted">{idx.categoryById.get(s.categoryId)?.name}</span> }]),
    { id: 'price', header: 'Price', sort: (s) => s.price ?? null, cell: (s) => <span className="font-semibold text-brand">{servicePriceLabel(s)}</span> },
    { id: 'availability', header: 'Availability', hideBelow: 'md', cell: (s) => <ServiceAvailabilityBadge value={s.availability} /> },
    { id: 'visibility', header: 'Visibility', sort: (s) => s.publicationStatus, cell: (s) => <PublicationBadge status={s.publicationStatus} /> },
    { id: 'updated', header: 'Updated', sort: (s) => s.updatedAt, hideBelow: 'lg', cell: (s) => <span className="text-ink-muted">{formatDate(s.updatedAt)}</span> },
    {
      id: 'actions',
      header: 'Actions',
      cell: (s) => (
        <Actions
          name={s.name}
          onEdit={() => setEditing(s)}
          toggleLabel={s.publicationStatus === 'published' ? 'Unpublish' : 'Publish'}
          onToggle={() => {
            const next = s.publicationStatus === 'published' ? 'unpublished' : 'published'
            const r = setServicePublication(s.id, next, actor)
            if (r.ok) toast.success(`${s.name} ${next === 'published' ? 'published' : 'unpublished'}`)
            else toast.error(r.error)
          }}
          onDelete={() => setDeleting(s)}
        />
      ),
    },
  ]

  return (
    <>
      <DataTable rows={rows} columns={columns} rowKey={(s) => s.id} caption="Services" defaultSort={{ id: 'updated', dir: 'desc' }} pageSize={10} resetKey={resetKey} empty={empty} />
      {editing && <ServiceFormModal open onOpenChange={(o) => !o && setEditing(null)} business={idx.businessById.get(editing.businessId)} businesses={businesses} service={editing} actor={actor} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this service?"
        description={deleting ? `“${deleting.name}” will be removed from the directory. This cannot be undone.` : undefined}
        confirmLabel="Delete service"
        destructive
        onConfirm={() => {
          if (!deleting) return
          const r = deleteService(deleting.id, actor)
          if (!r.ok) return r.error
          toast.success(`${deleting.name} was deleted`)
        }}
      />
    </>
  )
}
