'use client'

import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, TableCard, type Column } from '@/components/ui/data-table'
import { ConfirmDialog, Modal } from '@/components/ui/dialog'
import { CheckboxField, SelectField, TextAreaField, TextField, inputClass } from '@/components/ui/form'
import { RowMenu } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { formatNumber } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { categoryUsage, deleteCategory, deleteRegion, deleteTown, saveCategory, saveRegion, saveTown, toggleCategory, toggleRegion, toggleTown, townUsage } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import type { Category, LocalityType, Region, Town } from '@/lib/types'
import { firstError, maxLength, minLength, required } from '@/lib/validation'

type Errors = Partial<Record<string, string>>
const clean = (e: Errors) => Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Errors
const statusBadge = (enabled: boolean) => <Badge tone={enabled ? 'green' : 'gray'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>

function Footer({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <Button type="button" variant="soft" size="md" onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant="brand" size="md">{label}</Button>
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{message}</p> : null
}

// ───────────────────────── categories ─────────────────────────

export function AdminCategoriesPage() {
  const idx = useIndex()
  const toast = useToast()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = normalize(q)
    return idx.data.categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((c) => !needle || normalize(c.name).includes(needle))
  }, [idx, q])

  const columns: Column<Category>[] = [
    {
      id: 'name',
      header: 'Category',
      sort: (c) => c.name,
      cell: (c) => {
        const parent = c.parentId ? idx.categoryById.get(c.parentId) : undefined
        return (
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid grid-cols-1 size-8 place-items-center rounded-lg bg-mint text-base text-brand">{c.icon}</span>
            <div>
              <p className="font-semibold text-ink">{c.name}</p>
              <p className="mt-0.5 text-[10px] text-ink-faint">{parent ? `Sub-category of ${parent.name}` : 'Main category'}</p>
            </div>
          </div>
        )
      },
    },
    { id: 'slug', header: 'Slug', hideBelow: 'lg', cell: (c) => <span className="font-mono text-[11px] text-ink-muted">{c.slug}</span> },
    { id: 'businesses', header: 'Businesses', sort: (c) => categoryUsage(idx.data, c.id).businesses, hideBelow: 'sm', cell: (c) => <span className="text-ink-muted">{categoryUsage(idx.data, c.id).businesses}</span> },
    { id: 'products', header: 'Products', sort: (c) => categoryUsage(idx.data, c.id).products, hideBelow: 'md', cell: (c) => <span className="text-ink-muted">{formatNumber(categoryUsage(idx.data, c.id).products)}</span> },
    { id: 'services', header: 'Services', sort: (c) => categoryUsage(idx.data, c.id).services, hideBelow: 'md', cell: (c) => <span className="text-ink-muted">{categoryUsage(idx.data, c.id).services}</span> },
    { id: 'status', header: 'Status', sort: (c) => (c.enabled ? 0 : 1), cell: (c) => statusBadge(c.enabled) },
    {
      id: 'actions',
      header: '',
      cell: (c) => (
        <RowMenu
          label={`Actions for ${c.name}`}
          actions={[
            { label: 'Edit', onSelect: () => setEditing(c) },
            { label: c.enabled ? 'Disable' : 'Enable', onSelect: () => { const r = toggleCategory(c.id, !c.enabled); if (r.ok) toast.success(`${c.name} ${c.enabled ? 'disabled' : 'enabled'}`); else toast.error(r.error) } },
            'separator',
            { label: 'Delete…', danger: true, onSelect: () => setDeleting(c) },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <AdminPageHeader title="Categories" description="Organise the directory. Disabled categories are hidden from filters and registration but existing listings stay." actions={<Button variant="brand" size="md" onClick={() => setEditing('new')}><Plus /> Add category</Button>} />
      <TableCard className="mt-7" toolbar={<SearchField value={q} onChange={setQ} placeholder="Search categories…" />}>
        <DataTable rows={rows} columns={columns} rowKey={(c) => c.id} caption="Categories" pageSize={50} resetKey={q} defaultSort={undefined} empty={<EmptyState className="border-0" title="No categories match">Try a different search.</EmptyState>} />
      </TableCard>

      {editing && <CategoryModal category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this category?"
        description={deleting ? `“${deleting.name}” will be permanently removed. Categories that are still in use cannot be deleted.` : undefined}
        confirmLabel="Delete category"
        destructive
        onConfirm={() => {
          if (!deleting) return
          const r = deleteCategory(deleting.id)
          if (!r.ok) return r.error
          toast.success(`${deleting.name} was deleted`)
        }}
      />
    </>
  )
}

function CategoryModal({ category, onClose }: { category?: Category; onClose: () => void }) {
  const idx = useIndex()
  const toast = useToast()
  const [v, setV] = useState({ name: category?.name ?? '', icon: category?.icon ?? '◦', parentId: category?.parentId ?? '', description: category?.description ?? '', enabled: category?.enabled ?? true })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const hasKids = category ? idx.data.categories.some((c) => c.parentId === category.id) : false
  const parents = idx.data.categories.filter((c) => !c.parentId && c.id !== category?.id)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = clean({ name: firstError(required(v.name, 'Name'), minLength(v.name, 2, 'Name'), maxLength(v.name, 60, 'Name')), description: maxLength(v.description, 200, 'Description') })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const r = saveCategory({ id: category?.id, name: v.name, icon: v.icon, parentId: v.parentId || null, description: v.description, enabled: v.enabled })
    if (!r.ok) return setError(r.error)
    toast.success(category ? `${r.value.name} was updated` : `${r.value.name} was created`)
    onClose()
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={category ? 'Edit category' : 'Add a category'}>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
        <TextField label="Name" required value={v.name} onChange={(e) => { setV({ ...v, name: e.target.value }); setError(null) }} error={errors.name} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Icon (one character)" value={v.icon} maxLength={2} onChange={(e) => setV({ ...v, icon: e.target.value })} hint="Shown in the green tile, e.g. ⌂ ✳ ▦" />
          <SelectField label="Parent category" value={v.parentId} onChange={(e) => setV({ ...v, parentId: e.target.value })} disabled={hasKids} hint={hasKids ? 'This category has sub-categories, so it must stay a main category.' : 'Leave empty for a main category.'}>
            <option value="">None (main category)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SelectField>
        </div>
        <TextAreaField label="Description" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} error={errors.description} />
        <CheckboxField label="Enabled" description="Disabled categories are hidden from public filters and registration." checked={v.enabled} onChange={(enabled) => setV({ ...v, enabled })} />
        <FormError message={error} />
        <Footer onCancel={onClose} label={category ? 'Save changes' : 'Add category'} />
      </form>
    </Modal>
  )
}

// ───────────────────────── regions ─────────────────────────

export function AdminRegionsPage() {
  const idx = useIndex()
  const toast = useToast()
  const [editing, setEditing] = useState<Region | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Region | null>(null)

  const columns: Column<Region>[] = [
    { id: 'name', header: 'Region', sort: (r) => r.name, cell: (r) => (<div><p className="font-semibold text-ink">{r.name}</p><p className="mt-0.5 text-[10px] text-ink-faint">Seat: {r.seat}</p></div>) },
    { id: 'towns', header: 'Towns', sort: (r) => idx.townsByRegion.get(r.id)?.length ?? 0, cell: (r) => <span className="text-ink-muted">{idx.townsByRegion.get(r.id)?.length ?? 0}</span> },
    { id: 'businesses', header: 'Businesses', sort: (r) => idx.data.businesses.filter((b) => b.regionId === r.id).length, hideBelow: 'sm', cell: (r) => <span className="text-ink-muted">{idx.data.businesses.filter((b) => b.regionId === r.id).length}</span> },
    { id: 'centre', header: 'Centre', hideBelow: 'lg', cell: (r) => <span className="font-mono text-[11px] text-ink-muted">{r.lat.toFixed(2)}, {r.lng.toFixed(2)}</span> },
    { id: 'status', header: 'Status', sort: (r) => (r.enabled ? 0 : 1), cell: (r) => statusBadge(r.enabled) },
    {
      id: 'actions',
      header: '',
      cell: (r) => (
        <RowMenu
          label={`Actions for ${r.name}`}
          actions={[
            { label: 'Edit', onSelect: () => setEditing(r) },
            { label: r.enabled ? 'Disable' : 'Enable', onSelect: () => { const x = toggleRegion(r.id, !r.enabled); if (x.ok) toast.success(`${r.name} ${r.enabled ? 'disabled' : 'enabled'}`); else toast.error(x.error) } },
            'separator',
            { label: 'Delete…', danger: true, onSelect: () => setDeleting(r) },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <AdminPageHeader title="Regions" description="Botswana’s districts. A region that contains towns or businesses can be disabled but not deleted." actions={<Button variant="brand" size="md" onClick={() => setEditing('new')}><Plus /> Add region</Button>} />
      <TableCard className="mt-7">
        <DataTable rows={idx.data.regions} columns={columns} rowKey={(r) => r.id} caption="Regions" pageSize={20} defaultSort={{ id: 'name', dir: 'asc' }} />
      </TableCard>
      {editing && <RegionModal region={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this region?"
        description={deleting ? `“${deleting.name}” will be permanently removed. Regions that still contain towns or businesses cannot be deleted.` : undefined}
        confirmLabel="Delete region"
        destructive
        onConfirm={() => {
          if (!deleting) return
          const r = deleteRegion(deleting.id)
          if (!r.ok) return r.error
          toast.success(`${deleting.name} was deleted`)
        }}
      />
    </>
  )
}

function RegionModal({ region, onClose }: { region?: Region; onClose: () => void }) {
  const toast = useToast()
  const [v, setV] = useState({ name: region?.name ?? '', seat: region?.seat ?? '', description: region?.description ?? '', lat: region ? String(region.lat) : '', lng: region ? String(region.lng) : '', enabled: region?.enabled ?? true })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = Number(v.lat)
    const lng = Number(v.lng)
    const errs = clean({
      name: firstError(required(v.name, 'Name'), minLength(v.name, 2, 'Name')),
      seat: required(v.seat, 'District seat'),
      lat: v.lat.trim() === '' || !Number.isFinite(lat) ? 'Enter a latitude, e.g. -22.5' : undefined,
      lng: v.lng.trim() === '' || !Number.isFinite(lng) ? 'Enter a longitude, e.g. 25.8' : undefined,
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const r = saveRegion({ id: region?.id, name: v.name, seat: v.seat, description: v.description, lat, lng, enabled: v.enabled })
    if (!r.ok) return setError(r.error)
    toast.success(region ? `${r.value.name} was updated` : `${r.value.name} was created`)
    onClose()
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={region ? 'Edit region' : 'Add a region'}>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Name" required value={v.name} onChange={(e) => { setV({ ...v, name: e.target.value }); setError(null) }} error={errors.name} />
          <TextField label="District seat" required value={v.seat} onChange={(e) => setV({ ...v, seat: e.target.value })} error={errors.seat} />
          <TextField label="Centre latitude" required inputMode="decimal" value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} error={errors.lat} />
          <TextField label="Centre longitude" required inputMode="decimal" value={v.lng} onChange={(e) => setV({ ...v, lng: e.target.value })} error={errors.lng} />
        </div>
        <TextAreaField label="Description" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        <CheckboxField label="Enabled" description="Disabled regions are hidden from public filters and registration." checked={v.enabled} onChange={(enabled) => setV({ ...v, enabled })} />
        <FormError message={error} />
        <Footer onCancel={onClose} label={region ? 'Save changes' : 'Add region'} />
      </form>
    </Modal>
  )
}

// ───────────────────────── towns ─────────────────────────

const TYPES: LocalityType[] = ['city', 'town', 'village', 'settlement']

export function AdminTownsPage() {
  const idx = useIndex()
  const toast = useToast()
  const [editing, setEditing] = useState<Town | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Town | null>(null)
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(() => {
    const needle = normalize(q)
    return idx.data.towns.filter((t) => (!needle || normalize(t.name).includes(needle)) && (!region || t.regionId === region) && (!status || (status === 'enabled' ? t.enabled : !t.enabled)))
  }, [idx, q, region, status])

  const columns: Column<Town>[] = [
    { id: 'name', header: 'Town', sort: (t) => t.name, cell: (t) => (<div><p className="font-semibold text-ink">{t.name}</p><p className="mt-0.5 text-[10px] capitalize text-ink-faint">{t.localityType}</p></div>) },
    { id: 'region', header: 'Region', sort: (t) => idx.regionById.get(t.regionId)?.name ?? '', hideBelow: 'sm', cell: (t) => <span className="text-ink-muted">{idx.regionById.get(t.regionId)?.name}</span> },
    { id: 'businesses', header: 'Businesses', sort: (t) => townUsage(idx.data, t.id).businesses, cell: (t) => <span className="text-ink-muted">{townUsage(idx.data, t.id).businesses}</span> },
    { id: 'coords', header: 'Coordinates', hideBelow: 'lg', cell: (t) => <span className="font-mono text-[11px] text-ink-muted">{t.lat.toFixed(4)}, {t.lng.toFixed(4)}</span> },
    { id: 'status', header: 'Status', sort: (t) => (t.enabled ? 0 : 1), cell: (t) => statusBadge(t.enabled) },
    {
      id: 'actions',
      header: '',
      cell: (t) => (
        <RowMenu
          label={`Actions for ${t.name}`}
          actions={[
            { label: 'Edit', onSelect: () => setEditing(t) },
            { label: t.enabled ? 'Disable' : 'Enable', onSelect: () => { const x = toggleTown(t.id, !t.enabled); if (x.ok) toast.success(`${t.name} ${t.enabled ? 'disabled' : 'enabled'}`); else toast.error(x.error) } },
            'separator',
            { label: 'Delete…', danger: true, onSelect: () => setDeleting(t) },
          ]}
        />
      ),
    },
  ]
  const sel = `${inputClass} py-2 text-xs sm:w-auto`

  return (
    <>
      <AdminPageHeader title="Towns" description="Towns, villages and settlements used for addresses, filters and map positions." actions={<Button variant="brand" size="md" onClick={() => setEditing('new')}><Plus /> Add town</Button>} />
      <TableCard
        className="mt-7"
        toolbar={
          <>
            <SearchField value={q} onChange={setQ} placeholder="Search towns…" />
            <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} className={sel}>
              <option value="">All regions</option>
              {idx.data.regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
              <option value="">Any status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </>
        }
      >
        <DataTable rows={rows} columns={columns} rowKey={(t) => t.id} caption="Towns" pageSize={15} defaultSort={{ id: 'name', dir: 'asc' }} resetKey={`${q}|${region}|${status}`} empty={<EmptyState className="border-0" title="No towns match">Try a different search or filter.</EmptyState>} />
      </TableCard>
      {editing && <TownModal town={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this town?"
        description={deleting ? `“${deleting.name}” will be permanently removed. Towns that businesses, services or users still reference cannot be deleted.` : undefined}
        confirmLabel="Delete town"
        destructive
        onConfirm={() => {
          if (!deleting) return
          const r = deleteTown(deleting.id)
          if (!r.ok) return r.error
          toast.success(`${deleting.name} was deleted`)
        }}
      />
    </>
  )
}

function TownModal({ town, onClose }: { town?: Town; onClose: () => void }) {
  const idx = useIndex()
  const toast = useToast()
  const [v, setV] = useState({ name: town?.name ?? '', regionId: town?.regionId ?? '', localityType: (town?.localityType ?? 'village') as LocalityType, lat: town ? String(town.lat) : '', lng: town ? String(town.lng) : '', description: town?.description ?? '', enabled: town?.enabled ?? true })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = Number(v.lat)
    const lng = Number(v.lng)
    const errs = clean({
      name: firstError(required(v.name, 'Name'), minLength(v.name, 2, 'Name')),
      regionId: v.regionId ? undefined : 'Choose a region',
      lat: v.lat.trim() === '' || !Number.isFinite(lat) ? 'Enter a latitude, e.g. -24.65' : undefined,
      lng: v.lng.trim() === '' || !Number.isFinite(lng) ? 'Enter a longitude, e.g. 25.91' : undefined,
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const r = saveTown({ id: town?.id, name: v.name, regionId: v.regionId, localityType: v.localityType, lat, lng, description: v.description, enabled: v.enabled })
    if (!r.ok) return setError(r.error)
    toast.success(town ? `${r.value.name} was updated` : `${r.value.name} was created`)
    onClose()
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={town ? 'Edit town' : 'Add a town'}>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Name" required value={v.name} onChange={(e) => { setV({ ...v, name: e.target.value }); setError(null) }} error={errors.name} />
          <SelectField label="Region" required value={v.regionId} onChange={(e) => setV({ ...v, regionId: e.target.value })} error={errors.regionId}>
            <option value="">Choose…</option>
            {idx.data.regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </SelectField>
          <SelectField label="Type" value={v.localityType} onChange={(e) => setV({ ...v, localityType: e.target.value as LocalityType })}>
            {TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </SelectField>
          <span />
          <TextField label="Latitude" required inputMode="decimal" value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} error={errors.lat} />
          <TextField label="Longitude" required inputMode="decimal" value={v.lng} onChange={(e) => setV({ ...v, lng: e.target.value })} error={errors.lng} />
        </div>
        <TextAreaField label="Description (optional)" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        <CheckboxField label="Enabled" description="Disabled towns are hidden from public filters and registration." checked={v.enabled} onChange={(enabled) => setV({ ...v, enabled })} />
        {town && town.regionId !== v.regionId && v.regionId && <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">Moving this town also moves its businesses to the new region.</p>}
        <FormError message={error} />
        <Footer onCancel={onClose} label={town ? 'Save changes' : 'Add town'} />
      </form>
    </Modal>
  )
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line-strong px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <Search className="size-4 text-ink-faint" aria-hidden />
      <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm outline-none" />
    </div>
  )
}
