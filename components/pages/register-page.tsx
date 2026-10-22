'use client'

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapView } from '@/components/map/map-loader'
import { HoursEditor, defaultHours, hoursValid } from '@/components/shared/hours-editor'
import { BackLink, pageContainer } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, Eyebrow } from '@/components/ui/card'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { formatPula } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { createBusiness, illustrativeCoords, prefs } from '@/lib/store/actions'
import { useIndex, usePrefs, useSettings } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import type { Business, BusinessType, OpeningHours, PreferredContact } from '@/lib/types'
import { firstError, maxLength, minLength, normaliseUrl, positiveNumber, required, validEmail, validPhone, validUrl } from '@/lib/validation'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'findbw:register-draft'
const STEPS = ['Business identity', 'Category', 'Location', 'Contact', 'Products & services', 'Review & submit'] as const
const TYPES: BusinessType[] = ['Retailer', 'Wholesaler', 'Manufacturer', 'Distributor', 'Contractor', 'Service provider', 'Importer', 'Cooperative']

interface DraftItem {
  kind: 'product' | 'service'
  name: string
  description: string
  priceType: 'fixed' | 'quote'
  price: string
  unit: string
}

interface Draft {
  step: number
  name: string
  businessType: BusinessType | ''
  yearEstablished: string
  registrationRef: string
  shortDescription: string
  description: string
  primaryCategory: string
  extraCategories: string[]
  regionId: string
  townId: string
  address: string
  phone: string
  alternatePhone: string
  email: string
  website: string
  facebook: string
  instagram: string
  whatsapp: string
  showPhone: boolean
  showEmail: boolean
  acceptEnquiries: boolean
  preferredContact: PreferredContact
  hours: OpeningHours | null
  items: DraftItem[]
  confirm: boolean
}

const EMPTY: Draft = {
  step: 0,
  name: '',
  businessType: '',
  yearEstablished: '',
  registrationRef: '',
  shortDescription: '',
  description: '',
  primaryCategory: '',
  extraCategories: [],
  regionId: '',
  townId: '',
  address: '',
  phone: '',
  alternatePhone: '',
  email: '',
  website: '',
  facebook: '',
  instagram: '',
  whatsapp: '',
  showPhone: true,
  showEmail: true,
  acceptEnquiries: true,
  preferredContact: 'phone',
  hours: defaultHours(),
  items: [],
  confirm: false,
}

type Errors = Partial<Record<string, string>>

export function RegisterPage() {
  const idx = useIndex()
  const toast = useToast()
  const settings = useSettings()
  const { ownerUserId } = usePrefs()
  const owner = idx.userById.get(ownerUserId)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [ready, setReady] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [created, setCreated] = useState<Business | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Restore a saved draft after mount (never during SSR) so a refresh doesn't lose the user's work.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>
        setDraft({ ...EMPTY, ...saved, step: Math.min(Math.max(0, Number(saved.step) || 0), STEPS.length - 1), items: Array.isArray(saved.items) ? saved.items : [] })
      }
    } catch {
      /* corrupt draft — start fresh */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || created) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* storage unavailable */
    }
  }, [draft, ready, created])

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }))
    const cleared = Object.keys(p).filter((k) => errors[k])
    if (cleared.length) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !cleared.includes(k))))
  }

  const validate = (step: number, d: Draft = draft): Errors => {
    const e: Errors = {}
    if (step === 0) {
      e.name = firstError(required(d.name, 'Business name'), minLength(d.name, 3, 'Business name'), maxLength(d.name, 80, 'Business name'))
      e.businessType = d.businessType ? undefined : 'Choose a business type'
      if (d.yearEstablished) {
        const y = Number(d.yearEstablished)
        e.yearEstablished = Number.isInteger(y) && y >= 1900 && y <= new Date().getFullYear() ? undefined : `Enter a year between 1900 and ${new Date().getFullYear()}`
      }
      e.shortDescription = firstError(required(d.shortDescription, 'Short description'), maxLength(d.shortDescription, 140, 'Short description'))
      e.description = firstError(required(d.description, 'Description'), minLength(d.description, 40, 'Description'), maxLength(d.description, 1200, 'Description'))
    }
    if (step === 1) {
      e.primaryCategory = d.primaryCategory ? undefined : 'Choose a primary category'
    }
    if (step === 2) {
      e.regionId = d.regionId ? undefined : 'Choose a region'
      e.townId = d.townId ? undefined : 'Choose a town or village'
      e.address = firstError(required(d.address, 'Street address'), minLength(d.address, 5, 'Street address'))
      if (d.townId && d.name && idx.data.businesses.some((b) => b.townId === d.townId && normalize(b.name) === normalize(d.name))) {
        e.name = `A business called “${d.name.trim()}” is already listed in ${idx.townById.get(d.townId)?.name}. Change the name on step 1 or choose another town.`
      }
    }
    if (step === 3) {
      e.phone = firstError(required(d.phone, 'Phone number'), validPhone(d.phone))
      e.alternatePhone = validPhone(d.alternatePhone)
      e.email = firstError(required(d.email, 'Email'), validEmail(d.email))
      e.website = validUrl(d.website)
      e.hours = hoursValid(d.hours) ? undefined : 'Each open day needs a closing time after its opening time.'
    }
    if (step === 5) {
      e.confirm = d.confirm ? undefined : 'Please confirm to submit'
    }
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
  }

  const go = (step: number) => {
    setDraft((d) => ({ ...d, step }))
    setErrors({})
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const next = () => {
    const e = validate(draft.step)
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    go(draft.step + 1)
  }

  const jump = (target: number) => {
    // Going forward by clicking the stepper requires every earlier step to be valid.
    if (target <= draft.step) return go(target)
    for (let s = 0; s < target; s++) {
      const e = validate(s)
      if (Object.keys(e).length) {
        go(s)
        setErrors(e)
        return
      }
    }
    go(target)
  }

  const submit = () => {
    for (let s = 0; s < STEPS.length; s++) {
      const e = validate(s)
      if (Object.keys(e).length) {
        if (s !== draft.step) go(s)
        setErrors(e)
        return
      }
    }
    const social = { ...(draft.facebook && { facebook: draft.facebook.trim() }), ...(draft.instagram && { instagram: draft.instagram.trim() }), ...(draft.whatsapp && { whatsapp: draft.whatsapp.trim() }) }
    const products = draft.items.filter((i) => i.kind === 'product').map((i) => ({
      name: i.name,
      categoryId: draft.primaryCategory,
      description: i.description,
      unit: i.unit || 'each',
      priceType: i.priceType,
      price: i.priceType === 'quote' ? undefined : Number(i.price),
      availability: 'in_stock' as const,
    }))
    const services = draft.items.filter((i) => i.kind === 'service').map((i) => ({
      name: i.name,
      categoryId: draft.primaryCategory,
      description: i.description,
      coverage: 'local' as const,
      townIds: [draft.townId],
      pricingModel: i.priceType === 'quote' ? ('quote' as const) : ('fixed' as const),
      price: i.priceType === 'quote' ? undefined : Number(i.price),
      availability: 'available' as const,
    }))
    const result = createBusiness(
      {
        name: draft.name,
        categoryIds: [draft.primaryCategory, ...draft.extraCategories.filter((c) => c !== draft.primaryCategory)],
        businessType: draft.businessType as BusinessType,
        shortDescription: draft.shortDescription,
        description: draft.description,
        phone: draft.phone,
        alternatePhone: draft.alternatePhone,
        email: draft.email,
        website: normaliseUrl(draft.website),
        townId: draft.townId,
        address: draft.address,
        openingHours: draft.hours,
        registrationRef: draft.registrationRef,
        yearEstablished: draft.yearEstablished ? Number(draft.yearEstablished) : undefined,
        social: Object.keys(social).length ? social : undefined,
        contactPreferences: { showPhone: draft.showPhone, showEmail: draft.showEmail, acceptEnquiries: draft.acceptEnquiries, preferredContact: draft.preferredContact },
        ownerUserId: owner?.role === 'business_owner' ? owner.id : undefined,
        products,
        services,
      },
      { name: owner?.name ?? 'Visitor', role: owner ? 'Business owner' : 'Visitor' },
    )
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
    if (owner?.role === 'business_owner') prefs.setOwnerBusiness(result.value.id)
    setCreated(result.value)
    setSubmitError(null)
    toast.success(result.value.approvalStatus === 'approved' ? `${result.value.name} was published` : `${result.value.name} was submitted for approval`)
    window.scrollTo({ top: 0 })
  }

  const restart = () => {
    setDraft({ ...EMPTY, hours: defaultHours() })
    setCreated(null)
    setErrors({})
  }

  if (created) return <Confirmation business={created} onRestart={restart} />
  if (!ready) return <div className={pageContainer} aria-busy="true" />

  const step = draft.step

  return (
    <div className="mx-auto max-w-[860px] px-5 py-10 lg:px-8">
      <BackLink href="/">Back to home</BackLink>
      <Eyebrow className="mt-7">Business registration</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-forest md:text-4xl">List your business</h1>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        {settings.requireApproval ? 'Submit a demo listing for administrator review. New records stay pending until they are approved.' : 'Approval is switched off in the demo settings, so new listings are published immediately.'}
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        {owner ? (
          <>
            Submitting as <span className="font-semibold text-ink">{owner.name}</span> (demo identity — not real sign-in). Switch accounts in the <Link href="/business/dashboard" className="font-semibold text-brand hover:underline">owner dashboard</Link>.
          </>
        ) : (
          'Submitting as a visitor.'
        )}
      </p>

      <nav aria-label="Registration progress" className="mt-8">
        <ol className="flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'current' : 'todo'
            return (
              <li key={label} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cn('flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition', state === 'current' ? 'border-brand bg-mint font-semibold text-brand' : state === 'done' ? 'border-line-green bg-white text-brand hover:bg-mint' : 'border-line bg-white text-ink-faint hover:text-ink-muted')}
                >
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', state === 'todo' ? 'bg-neutral-bg text-ink-muted' : 'bg-brand text-white')}>{state === 'done' ? <Check className="size-3.5" /> : i + 1}</span>
                  <span className="hidden truncate md:inline">{label}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-xs text-ink-muted md:hidden">
          Step {step + 1} of {STEPS.length}: <span className="font-semibold text-ink">{STEPS[step]}</span>
        </p>
      </nav>

      <Card className="mt-6 p-6 md:p-8">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-[-0.02em] text-forest outline-none">
          {STEPS[step]}
        </h2>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-4 py-3 text-xs font-medium text-danger">
            Please fix the highlighted {Object.keys(errors).length === 1 ? 'field' : 'fields'} to continue.
          </p>
        )}

        <div className="mt-6">
          {step === 0 && <StepIdentity d={draft} patch={patch} errors={errors} />}
          {step === 1 && <StepCategory d={draft} patch={patch} errors={errors} />}
          {step === 2 && <StepLocation d={draft} patch={patch} errors={errors} />}
          {step === 3 && <StepContact d={draft} patch={patch} errors={errors} />}
          {step === 4 && <StepItems d={draft} patch={patch} />}
          {step === 5 && <StepReview d={draft} patch={patch} errors={errors} onEdit={go} submitError={submitError} />}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-divider pt-6">
          <Button variant="soft" size="md" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="brand" size="md" onClick={next}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button variant="brand" size="md" onClick={submit}>
              {settings.requireApproval ? 'Submit for review' : 'Publish listing'}
            </Button>
          )}
        </div>
      </Card>
      <p className="mt-4 text-center text-[11px] text-ink-faint">Your progress is saved in this browser until you submit.</p>
    </div>
  )
}

interface StepProps {
  d: Draft
  patch: (p: Partial<Draft>) => void
  errors: Errors
}

function StepIdentity({ d, patch, errors }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <TextField label="Business name" required value={d.name} onChange={(e) => patch({ name: e.target.value })} error={errors.name} placeholder="e.g. Kalahari Building Supplies" maxLength={80} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField label="Business type" required value={d.businessType} onChange={(e) => patch({ businessType: e.target.value as BusinessType })} error={errors.businessType}>
          <option value="">Choose a type…</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <TextField label="Year established (optional)" inputMode="numeric" value={d.yearEstablished} onChange={(e) => patch({ yearEstablished: e.target.value.replace(/\D/g, '').slice(0, 4) })} error={errors.yearEstablished} placeholder="e.g. 2014" />
      </div>
      <TextField label="Registration reference (optional)" value={d.registrationRef} onChange={(e) => patch({ registrationRef: e.target.value })} hint="Demo only — enter any reference. It is not checked against a real registry." />
      <TextField label="Short description" required value={d.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })} error={errors.shortDescription} hint={`${d.shortDescription.length}/140 — shown on cards and in search results.`} maxLength={140} />
      <TextAreaField label="Full description" required rows={5} value={d.description} onChange={(e) => patch({ description: e.target.value })} error={errors.description} hint={`${d.description.length} characters — tell customers what you offer, who you serve and what makes you different (at least 40).`} maxLength={1200} />
    </div>
  )
}

function StepCategory({ d, patch, errors }: StepProps) {
  const idx = useIndex()
  const parents = parentCategories(idx).filter((c) => c.enabled)
  return (
    <div className="grid grid-cols-1 gap-6">
      <SelectField label="Primary category" required value={d.primaryCategory} onChange={(e) => patch({ primaryCategory: e.target.value, extraCategories: d.extraCategories.filter((c) => c !== e.target.value) })} error={errors.primaryCategory} hint="Customers browsing this category will find you first.">
        <option value="">Choose a category…</option>
        {parents.map((p) => {
          const kids = childCategories(idx, p.id).filter((c) => c.enabled)
          return kids.length ? (
            <optgroup key={p.id} label={p.name}>
              <option value={p.id}>{p.name} (general)</option>
              {kids.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          )
        })}
      </SelectField>
      <fieldset>
        <legend className="text-xs font-medium text-ink">Additional categories (optional, up to 3)</legend>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {idx.data.categories
            .filter((c) => c.enabled && c.id !== d.primaryCategory)
            .map((c) => {
              const checked = d.extraCategories.includes(c.id)
              return (
                <CheckboxField
                  key={c.id}
                  label={c.name}
                  checked={checked}
                  disabled={!checked && d.extraCategories.length >= 3}
                  onChange={(on) => patch({ extraCategories: on ? [...d.extraCategories, c.id] : d.extraCategories.filter((x) => x !== c.id) })}
                />
              )
            })}
        </div>
      </fieldset>
    </div>
  )
}

function StepLocation({ d, patch, errors }: StepProps) {
  const idx = useIndex()
  const towns = idx.data.towns.filter((t) => t.enabled && t.regionId === d.regionId).sort((a, b) => a.name.localeCompare(b.name))
  const town = idx.townById.get(d.townId)
  const pin = useMemo(() => {
    if (!town) return []
    const [lat, lng] = illustrativeCoords(town, d.name || 'new business')
    return [{ id: 'preview', lat, lng, name: d.name || 'Your business' }]
  }, [town, d.name])
  return (
    <div className="grid grid-cols-1 gap-5">
      {errors.name && (
        <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-xs font-medium text-danger">
          {errors.name}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField label="Region" required value={d.regionId} onChange={(e) => patch({ regionId: e.target.value, townId: '' })} error={errors.regionId}>
          <option value="">Choose a region…</option>
          {idx.data.regions
            .filter((r) => r.enabled)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </SelectField>
        <SelectField label="Town or village" required value={d.townId} onChange={(e) => patch({ townId: e.target.value })} error={errors.townId} disabled={!d.regionId}>
          <option value="">{d.regionId ? 'Choose a town…' : 'Choose a region first'}</option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
      </div>
      <TextField label="Street address" required value={d.address} onChange={(e) => patch({ address: e.target.value })} error={errors.address} placeholder="e.g. Plot 1234, Broadhurst Industrial, Gaborone" />
      {town && (
        <div>
          <p className="text-xs font-medium text-ink">Map position</p>
          <p className="mt-1 text-[11px] text-ink-faint">Your pin is placed near the centre of {town.name} for this demo. It does not identify real premises.</p>
          <MapView businesses={pin} interactive={false} maxFitZoom={13} tag="Illustrative position" className="mt-3 h-56 w-full" />
        </div>
      )}
    </div>
  )
}

function StepContact({ d, patch, errors }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="Phone" required type="tel" value={d.phone} onChange={(e) => patch({ phone: e.target.value })} error={errors.phone} placeholder="+267 71 234 567" />
        <TextField label="Alternative phone (optional)" type="tel" value={d.alternatePhone} onChange={(e) => patch({ alternatePhone: e.target.value })} error={errors.alternatePhone} />
        <TextField label="Email" required type="email" value={d.email} onChange={(e) => patch({ email: e.target.value })} error={errors.email} placeholder="info@yourbusiness.example" />
        <TextField label="Website (optional)" value={d.website} onChange={(e) => patch({ website: e.target.value })} error={errors.website} placeholder="www.yourbusiness.example" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <TextField label="Facebook (optional)" value={d.facebook} onChange={(e) => patch({ facebook: e.target.value })} placeholder="@yourpage" />
        <TextField label="Instagram (optional)" value={d.instagram} onChange={(e) => patch({ instagram: e.target.value })} placeholder="@yourhandle" />
        <TextField label="WhatsApp (optional)" value={d.whatsapp} onChange={(e) => patch({ whatsapp: e.target.value })} placeholder="+267 …" />
      </div>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-xs font-medium text-ink">Contact preferences</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxField label="Show my phone number publicly" checked={d.showPhone} onChange={(showPhone) => patch({ showPhone })} />
          <CheckboxField label="Show my email address publicly" checked={d.showEmail} onChange={(showEmail) => patch({ showEmail })} />
          <CheckboxField label="Accept enquiries through the listing" checked={d.acceptEnquiries} onChange={(acceptEnquiries) => patch({ acceptEnquiries })} />
        </div>
        <SelectField wrapperClassName="mt-4 sm:w-1/2" label="Preferred way to be contacted" value={d.preferredContact} onChange={(e) => patch({ preferredContact: e.target.value as PreferredContact })}>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </SelectField>
      </fieldset>
      <div>
        <HoursEditor value={d.hours} onChange={(hours) => patch({ hours })} />
        {errors.hours && (
          <p role="alert" className="mt-2 text-[11px] font-medium text-danger">
            {errors.hours}
          </p>
        )}
      </div>
    </div>
  )
}

function StepItems({ d, patch }: Pick<StepProps, 'd' | 'patch'>) {
  const blank: DraftItem = { kind: 'product', name: '', description: '', priceType: 'fixed', price: '', unit: 'each' }
  const [item, setItem] = useState<DraftItem>(blank)
  const [errs, setErrs] = useState<Errors>({})
  const MAX = 10

  const add = () => {
    const e: Errors = {
      name: firstError(required(item.name, 'Name'), minLength(item.name, 3, 'Name')),
      description: firstError(required(item.description, 'Description'), minLength(item.description, 10, 'Description')),
      price: item.priceType === 'fixed' ? positiveNumber(item.price, 'Price') : undefined,
    }
    const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v))
    setErrs(clean)
    if (Object.keys(clean).length) return
    patch({ items: [...d.items, { ...item, name: item.name.trim(), description: item.description.trim() }] })
    setItem({ ...blank, kind: item.kind })
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="text-sm leading-6 text-ink-muted">Add a few products or services so customers can see what you offer. This step is optional — you can manage your catalogue any time from the owner dashboard.</p>

      {d.items.length > 0 && (
        <ul className="divide-y divide-divider rounded-xl border border-line" aria-label="Added items">
          {d.items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {it.name} <Badge tone={it.kind === 'product' ? 'green' : 'blue'}>{it.kind === 'product' ? 'Product' : 'Service'}</Badge>
                </p>
                <p className="mt-1 text-xs text-ink-muted">{it.priceType === 'quote' ? 'Request a quote' : `${formatPula(Number(it.price))}${it.kind === 'product' ? ` · ${it.unit}` : ''}`}</p>
              </div>
              <button type="button" aria-label={`Remove ${it.name}`} onClick={() => patch({ items: d.items.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-ink-muted hover:bg-danger-bg hover:text-danger">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {d.items.length < MAX ? (
        <fieldset className="rounded-xl border border-dashed border-[#b9cdbb] p-4">
          <legend className="px-1 text-xs font-medium text-ink">Add an item ({d.items.length}/{MAX})</legend>
          <div className="grid grid-cols-1 gap-4">
            <div role="radiogroup" aria-label="Item type" className="flex gap-2">
              {(['product', 'service'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={item.kind === k} onClick={() => setItem({ ...item, kind: k })} className={cn('rounded-lg border px-4 py-2 text-xs font-semibold transition', item.kind === k ? 'border-brand bg-brand text-white' : 'border-line-strong bg-white text-brand hover:bg-mint')}>
                  {k === 'product' ? 'Product' : 'Service'}
                </button>
              ))}
            </div>
            <TextField label={item.kind === 'product' ? 'Product name' : 'Service name'} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} error={errs.name} />
            <TextAreaField label="Short description" rows={2} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} error={errs.description} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SelectField label="Pricing" value={item.priceType} onChange={(e) => setItem({ ...item, priceType: e.target.value as 'fixed' | 'quote' })}>
                <option value="fixed">Fixed price</option>
                <option value="quote">Request a quote</option>
              </SelectField>
              {item.priceType === 'fixed' && <TextField label="Price (BWP)" inputMode="decimal" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value.replace(/[^\d.]/g, '') })} error={errs.price} placeholder="e.g. 450" />}
              {item.kind === 'product' && item.priceType === 'fixed' && <TextField label="Unit of sale" value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} placeholder="each, per bag…" />}
            </div>
            <div>
              <Button variant="soft" size="md" onClick={add}>
                <Plus /> Add to listing
              </Button>
            </div>
          </div>
        </fieldset>
      ) : (
        <p className="rounded-lg bg-canvas px-4 py-3 text-xs text-ink-muted">You’ve added the maximum of {MAX} items. Manage more from the owner dashboard after submitting.</p>
      )}
    </div>
  )
}

function ReviewSection({ title, step, onEdit, children }: { title: string; step: number; onEdit: (s: number) => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-forest">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="text-xs font-semibold text-brand hover:text-forest">
          Edit
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function R({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  if (children === undefined || children === '' || children === null) return null
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{children}</dd>
    </div>
  )
}

function StepReview({ d, patch, errors, onEdit, submitError }: StepProps & { onEdit: (s: number) => void; submitError: string | null }) {
  const idx = useIndex()
  const { requireApproval } = useSettings()
  const cat = (id: string) => idx.categoryById.get(id)?.name
  return (
    <div className="grid grid-cols-1 gap-4">
      <ReviewSection title="Business identity" step={0} onEdit={onEdit}>
        <R label="Name">{d.name}</R>
        <R label="Type">{d.businessType}</R>
        <R label="Established">{d.yearEstablished}</R>
        <R label="Registration reference">{d.registrationRef}</R>
        <R label="Short description" wide>{d.shortDescription}</R>
        <R label="Description" wide>{d.description}</R>
      </ReviewSection>
      <ReviewSection title="Category" step={1} onEdit={onEdit}>
        <R label="Primary">{cat(d.primaryCategory)}</R>
        <R label="Additional">{d.extraCategories.map(cat).join(', ')}</R>
      </ReviewSection>
      <ReviewSection title="Location" step={2} onEdit={onEdit}>
        <R label="Region">{idx.regionById.get(d.regionId)?.name}</R>
        <R label="Town">{idx.townById.get(d.townId)?.name}</R>
        <R label="Address" wide>{d.address}</R>
      </ReviewSection>
      <ReviewSection title="Contact" step={3} onEdit={onEdit}>
        <R label="Phone">{d.phone}</R>
        <R label="Alternative phone">{d.alternatePhone}</R>
        <R label="Email">{d.email}</R>
        <R label="Website">{d.website}</R>
        <R label="Opening hours" wide>{d.hours ? 'Provided' : 'Not shown'}</R>
        <R label="Enquiries">{d.acceptEnquiries ? 'Accepted' : 'Switched off'}</R>
      </ReviewSection>
      <ReviewSection title="Products & services" step={4} onEdit={onEdit}>
        <R label="Products">{d.items.filter((i) => i.kind === 'product').map((i) => i.name).join(', ') || 'None added'}</R>
        <R label="Services">{d.items.filter((i) => i.kind === 'service').map((i) => i.name).join(', ') || 'None added'}</R>
      </ReviewSection>
      <div className="rounded-xl bg-canvas p-4">
        <CheckboxField label="I confirm this is demonstration information." description={requireApproval ? 'Your listing will be created as “pending approval” and will not be public until an administrator approves it.' : 'Your listing will be published immediately.'} checked={d.confirm} onChange={(confirm) => patch({ confirm })} />
        {errors.confirm && (
          <p role="alert" className="mt-2 text-[11px] font-medium text-danger">
            {errors.confirm}
          </p>
        )}
      </div>
      {submitError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-xs font-medium text-danger">
          {submitError}
        </p>
      )}
    </div>
  )
}

function Confirmation({ business, onRestart }: { business: Business; onRestart: () => void }) {
  const idx = useIndex()
  const approved = business.approvalStatus === 'approved'
  const products = idx.productsByBusiness.get(business.id)?.length ?? 0
  const services = idx.servicesByBusiness.get(business.id)?.length ?? 0
  return (
    <div className="mx-auto max-w-[760px] px-5 py-12 lg:px-8">
      <Card className="p-8" role="status">
        <CheckCircle2 className="size-10 text-brand" />
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-forest">{approved ? 'Your listing is live' : 'Submission received'}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          {approved ? (
            <>
              <span className="font-semibold text-ink">{business.name}</span> has been published.
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">{business.name}</span> is pending review and is not publicly visible or verified yet.
            </>
          )}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-canvas p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Reference</dt>
            <dd className="mt-1 font-mono text-xs text-ink">{business.id}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Status</dt>
            <dd className="mt-1">
              <Badge tone={approved ? 'green' : 'amber'}>{approved ? 'Published' : 'Pending approval'}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Catalogue</dt>
            <dd className="mt-1 text-xs text-ink">
              {products} products · {services} services
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {approved ? (
            <Link href={`/businesses/${business.slug}`} className={buttonVariants({ variant: 'brand', size: 'md' })}>
              View your public profile <ArrowRight />
            </Link>
          ) : (
            <Link href="/admin/approvals" className={buttonVariants({ variant: 'brand', size: 'md' })}>
              Open the admin approval queue <ArrowRight />
            </Link>
          )}
          <Link href="/business/dashboard" className={buttonVariants({ variant: 'soft', size: 'md' })}>
            Go to owner dashboard
          </Link>
          <button type="button" onClick={onRestart} className={buttonVariants({ variant: 'quiet', size: 'md' })}>
            Register another business
          </button>
        </div>
        <p className="mt-5 text-[11px] text-ink-faint">Demo only: nothing was emailed. The “admin approval queue” link opens the demo administration area, where you can approve this submission.</p>
      </Card>
    </div>
  )
}
