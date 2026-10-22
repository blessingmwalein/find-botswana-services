'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { ADMIN_ACTOR, createBusiness, setListingStatus } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import type { BusinessType } from '@/lib/types'
import { firstError, maxLength, minLength, required, validEmail, validPhone } from '@/lib/validation'

const TYPES: BusinessType[] = ['Retailer', 'Wholesaler', 'Manufacturer', 'Distributor', 'Contractor', 'Service provider', 'Importer', 'Cooperative']
type Errors = Partial<Record<string, string>>

/** Administrator-created listing: approved immediately (optionally unpublished). */
export function BusinessCreateModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add a business" description="Administrator-created listings are approved straight away. Add products and services from the business page afterwards." size="lg">
      <Form onClose={() => onOpenChange(false)} />
    </Modal>
  )
}

function Form({ onClose }: { onClose: () => void }) {
  const idx = useIndex()
  const toast = useToast()
  const router = useRouter()
  const [v, setV] = useState({ name: '', businessType: '' as BusinessType | '', categoryId: '', regionId: '', townId: '', address: '', phone: '', email: '', shortDescription: '', description: '', publish: true })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((x) => ({ ...x, [k]: val }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const towns = idx.data.towns.filter((t) => t.enabled && t.regionId === v.regionId).sort((a, b) => a.name.localeCompare(b.name))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Errors = {
      name: firstError(required(v.name, 'Business name'), minLength(v.name, 3, 'Business name'), maxLength(v.name, 80, 'Business name')),
      businessType: v.businessType ? undefined : 'Choose a type',
      categoryId: v.categoryId ? undefined : 'Choose a category',
      townId: v.townId ? undefined : 'Choose a town',
      address: firstError(required(v.address, 'Address'), minLength(v.address, 5, 'Address')),
      phone: firstError(required(v.phone, 'Phone'), validPhone(v.phone)),
      email: firstError(required(v.email, 'Email'), validEmail(v.email)),
      shortDescription: firstError(required(v.shortDescription, 'Short description'), maxLength(v.shortDescription, 140, 'Short description')),
      description: firstError(required(v.description, 'Description'), minLength(v.description, 40, 'Description')),
    }
    const clean = Object.fromEntries(Object.entries(errs).filter(([, x]) => x))
    setErrors(clean)
    if (Object.keys(clean).length) return
    const r = createBusiness(
      {
        name: v.name,
        categoryIds: [v.categoryId],
        businessType: v.businessType as BusinessType,
        shortDescription: v.shortDescription,
        description: v.description,
        phone: v.phone,
        email: v.email,
        townId: v.townId,
        address: v.address,
        byAdmin: true,
      },
      ADMIN_ACTOR,
    )
    if (!r.ok) {
      setError(r.error)
      return
    }
    if (!v.publish) setListingStatus(r.value.id, 'unpublished', ADMIN_ACTOR)
    toast.success(`${r.value.name} was added${v.publish ? ' and published' : ' (unpublished)'}`)
    onClose()
    router.push(`/admin/businesses/${r.value.id}`)
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
      <TextField label="Business name" required value={v.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Type" required value={v.businessType} onChange={(e) => set('businessType', e.target.value as BusinessType)} error={errors.businessType}>
          <option value="">Choose…</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <SelectField label="Primary category" required value={v.categoryId} onChange={(e) => set('categoryId', e.target.value)} error={errors.categoryId}>
          <option value="">Choose…</option>
          {parentCategories(idx).filter((c) => c.enabled).map((p) => {
            const kids = childCategories(idx, p.id).filter((c) => c.enabled)
            return kids.length ? (
              <optgroup key={p.id} label={p.name}>
                <option value={p.id}>{p.name} (general)</option>
                {kids.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ) : (
              <option key={p.id} value={p.id}>{p.name}</option>
            )
          })}
        </SelectField>
        <SelectField label="Region" required value={v.regionId} onChange={(e) => { set('regionId', e.target.value); set('townId', '') }}>
          <option value="">Choose…</option>
          {idx.data.regions.filter((r) => r.enabled).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </SelectField>
        <SelectField label="Town" required value={v.townId} onChange={(e) => set('townId', e.target.value)} error={errors.townId} disabled={!v.regionId}>
          <option value="">{v.regionId ? 'Choose…' : 'Choose a region first'}</option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </SelectField>
      </div>
      <TextField label="Street address" required value={v.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Phone" required type="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
        <TextField label="Email" required type="email" value={v.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
      </div>
      <TextField label="Short description" required value={v.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} error={errors.shortDescription} hint={`${v.shortDescription.length}/140`} maxLength={140} />
      <TextAreaField label="Description" required rows={4} value={v.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />
      <CheckboxField label="Publish immediately" checked={v.publish} onChange={(x) => set('publish', x)} />
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" size="md" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="brand" size="md">Add business</Button>
      </div>
    </form>
  )
}
