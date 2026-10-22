'use client'

import { useState } from 'react'
import { HoursEditor, hoursValid } from '@/components/shared/hours-editor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { updateBusiness, type Actor } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import type { Business, BusinessType, PreferredContact } from '@/lib/types'
import { firstError, maxLength, minLength, normaliseUrl, required, validEmail, validPhone, validUrl } from '@/lib/validation'

const TYPES: BusinessType[] = ['Retailer', 'Wholesaler', 'Manufacturer', 'Distributor', 'Contractor', 'Service provider', 'Importer', 'Cooperative']
type Errors = Partial<Record<string, string>>

/** Edit the full business profile. Used by the owner workspace and the admin business screen. */
export function ProfileForm({ business: b, actor, onSaved }: { business: Business; actor: Actor; onSaved?: (b: Business) => void }) {
  const idx = useIndex()
  const toast = useToast()
  const [v, setV] = useState(() => initialOf(b))
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((x) => ({ ...x, [k]: val }))
    setSaved(false)
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const towns = idx.data.towns.filter((t) => (t.enabled || t.id === b.townId) && t.regionId === v.regionId).sort((a, c) => a.name.localeCompare(c.name))
  const dirty = JSON.stringify(v) !== JSON.stringify(initialOf(b))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Errors = {
      name: firstError(required(v.name, 'Business name'), minLength(v.name, 3, 'Business name'), maxLength(v.name, 80, 'Business name')),
      shortDescription: firstError(required(v.shortDescription, 'Short description'), maxLength(v.shortDescription, 140, 'Short description')),
      description: firstError(required(v.description, 'Description'), minLength(v.description, 40, 'Description'), maxLength(v.description, 1200, 'Description')),
      primaryCategory: v.primaryCategory ? undefined : 'Choose a primary category',
      townId: v.townId ? undefined : 'Choose a town',
      address: firstError(required(v.address, 'Street address'), minLength(v.address, 5, 'Street address')),
      phone: firstError(required(v.phone, 'Phone number'), validPhone(v.phone)),
      alternatePhone: validPhone(v.alternatePhone),
      email: firstError(required(v.email, 'Email'), validEmail(v.email)),
      website: validUrl(v.website),
      yearEstablished: v.yearEstablished && !(Number(v.yearEstablished) >= 1900 && Number(v.yearEstablished) <= new Date().getFullYear()) ? 'Enter a valid year' : undefined,
      hours: hoursValid(v.hours) ? undefined : 'Each open day needs a closing time after its opening time.',
    }
    const clean = Object.fromEntries(Object.entries(errs).filter(([, x]) => x))
    setErrors(clean)
    if (Object.keys(clean).length) {
      setFormError('Please fix the highlighted fields.')
      return
    }
    setFormError(null)
    const social = { ...(v.facebook.trim() && { facebook: v.facebook.trim() }), ...(v.instagram.trim() && { instagram: v.instagram.trim() }), ...(v.whatsapp.trim() && { whatsapp: v.whatsapp.trim() }), ...(b.social?.linkedin && { linkedin: b.social.linkedin }) }
    const result = updateBusiness(
      b.id,
      {
        name: v.name.trim(),
        businessType: v.businessType,
        yearEstablished: v.yearEstablished ? Number(v.yearEstablished) : undefined,
        registrationRef: v.registrationRef.trim() || undefined,
        shortDescription: v.shortDescription.trim(),
        description: v.description.trim(),
        categoryIds: [v.primaryCategory, ...v.extraCategories.filter((c) => c !== v.primaryCategory)],
        townId: v.townId,
        address: v.address.trim(),
        phone: v.phone.trim(),
        alternatePhone: v.alternatePhone.trim() || undefined,
        email: v.email.trim(),
        website: normaliseUrl(v.website),
        social: Object.keys(social).length ? social : undefined,
        contactPreferences: { showPhone: v.showPhone, showEmail: v.showEmail, acceptEnquiries: v.acceptEnquiries, preferredContact: v.preferredContact },
        openingHours: v.hours,
      },
      actor,
    )
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setSaved(true)
    toast.success('Profile saved')
    onSaved?.(result.value)
  }

  const parents = parentCategories(idx).filter((c) => c.enabled)

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6">
      {b.approvalStatus === 'approved' && <p className="rounded-lg bg-mint px-4 py-3 text-xs text-brand">This listing is approved, so saved changes appear on the public profile straight away in this demo.</p>}
      {formError && <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-xs font-medium text-danger">{formError}</p>}

      <Card className="grid grid-cols-1 gap-5 p-5 md:p-6">
        <h3 className="font-semibold text-forest">Business details</h3>
        <TextField label="Business name" required value={v.name} onChange={(e) => set('name', e.target.value)} error={errors.name} maxLength={80} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <SelectField label="Business type" value={v.businessType} onChange={(e) => set('businessType', e.target.value as BusinessType)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </SelectField>
          <TextField label="Year established" inputMode="numeric" value={v.yearEstablished} onChange={(e) => set('yearEstablished', e.target.value.replace(/\D/g, '').slice(0, 4))} error={errors.yearEstablished} />
          <TextField label="Registration reference" value={v.registrationRef} onChange={(e) => set('registrationRef', e.target.value)} />
        </div>
        <TextField label="Short description" required value={v.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} error={errors.shortDescription} hint={`${v.shortDescription.length}/140`} maxLength={140} />
        <TextAreaField label="Full description" required rows={5} value={v.description} onChange={(e) => set('description', e.target.value)} error={errors.description} hint={`${v.description.length} characters`} maxLength={1200} />
      </Card>

      <Card className="grid grid-cols-1 gap-5 p-5 md:p-6">
        <h3 className="font-semibold text-forest">Categories</h3>
        <SelectField label="Primary category" required value={v.primaryCategory} onChange={(e) => { set('primaryCategory', e.target.value); set('extraCategories', v.extraCategories.filter((c) => c !== e.target.value)) }} error={errors.primaryCategory}>
          <option value="">Choose a category…</option>
          {parents.map((p) => {
            const kids = childCategories(idx, p.id).filter((c) => c.enabled || c.id === v.primaryCategory)
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
        <fieldset>
          <legend className="text-xs font-medium text-ink">Additional categories (up to 3)</legend>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {idx.data.categories
              .filter((c) => (c.enabled || v.extraCategories.includes(c.id)) && c.id !== v.primaryCategory)
              .map((c) => {
                const checked = v.extraCategories.includes(c.id)
                return <CheckboxField key={c.id} label={c.name} checked={checked} disabled={!checked && v.extraCategories.length >= 3} onChange={(on) => set('extraCategories', on ? [...v.extraCategories, c.id] : v.extraCategories.filter((x) => x !== c.id))} />
              })}
          </div>
        </fieldset>
      </Card>

      <Card className="grid grid-cols-1 gap-5 p-5 md:p-6">
        <h3 className="font-semibold text-forest">Location</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField label="Region" value={v.regionId} onChange={(e) => { set('regionId', e.target.value); set('townId', '') }}>
            {idx.data.regions.filter((r) => r.enabled || r.id === b.regionId).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </SelectField>
          <SelectField label="Town or village" required value={v.townId} onChange={(e) => set('townId', e.target.value)} error={errors.townId}>
            <option value="">Choose a town…</option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </SelectField>
        </div>
        <TextField label="Street address" required value={v.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
        {v.townId !== b.townId && <p className="text-[11px] text-ink-faint">Changing the town moves your illustrative map pin to the new town.</p>}
      </Card>

      <Card className="grid grid-cols-1 gap-5 p-5 md:p-6">
        <h3 className="font-semibold text-forest">Contact</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField label="Phone" required type="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          <TextField label="Alternative phone" type="tel" value={v.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value)} error={errors.alternatePhone} />
          <TextField label="Email" required type="email" value={v.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
          <TextField label="Website" value={v.website} onChange={(e) => set('website', e.target.value)} error={errors.website} />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <TextField label="Facebook" value={v.facebook} onChange={(e) => set('facebook', e.target.value)} />
          <TextField label="Instagram" value={v.instagram} onChange={(e) => set('instagram', e.target.value)} />
          <TextField label="WhatsApp" value={v.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
        </div>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-xs font-medium text-ink">Contact preferences</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CheckboxField label="Show my phone number publicly" checked={v.showPhone} onChange={(x) => set('showPhone', x)} />
            <CheckboxField label="Show my email address publicly" checked={v.showEmail} onChange={(x) => set('showEmail', x)} />
            <CheckboxField label="Accept enquiries through the listing" checked={v.acceptEnquiries} onChange={(x) => set('acceptEnquiries', x)} />
          </div>
          <SelectField wrapperClassName="mt-4 sm:w-1/2" label="Preferred way to be contacted" value={v.preferredContact} onChange={(e) => set('preferredContact', e.target.value as PreferredContact)}>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </SelectField>
        </fieldset>
      </Card>

      <Card className="p-5 md:p-6">
        <HoursEditor value={v.hours} onChange={(h) => set('hours', h)} />
        {errors.hours && <p role="alert" className="mt-2 text-[11px] font-medium text-danger">{errors.hours}</p>}
      </Card>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-xl border border-line bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-xs text-ink-muted" role="status">{saved ? 'All changes saved.' : dirty ? 'You have unsaved changes.' : 'No changes yet.'}</p>
        <div className="flex gap-2">
          <Button type="button" variant="soft" size="md" disabled={!dirty} onClick={() => { setV(initialOf(b)); setErrors({}); setFormError(null) }}>
            Discard
          </Button>
          <Button type="submit" variant="brand" size="md" disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </form>
  )
}

function initialOf(b: Business) {
  return {
    name: b.name,
    businessType: b.businessType,
    yearEstablished: b.yearEstablished ? String(b.yearEstablished) : '',
    registrationRef: b.registrationRef ?? '',
    shortDescription: b.shortDescription,
    description: b.description,
    primaryCategory: b.categoryIds[0] ?? '',
    extraCategories: b.categoryIds.slice(1),
    regionId: b.regionId,
    townId: b.townId,
    address: b.address,
    phone: b.phone,
    alternatePhone: b.alternatePhone ?? '',
    email: b.email,
    website: b.website ?? '',
    facebook: b.social?.facebook ?? '',
    instagram: b.social?.instagram ?? '',
    whatsapp: b.social?.whatsapp ?? '',
    showPhone: b.contactPreferences.showPhone,
    showEmail: b.contactPreferences.showEmail,
    acceptEnquiries: b.contactPreferences.acceptEnquiries,
    preferredContact: b.contactPreferences.preferredContact,
    hours: b.openingHours,
  }
}
