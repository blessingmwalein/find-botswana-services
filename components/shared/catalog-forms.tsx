'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { availabilityLabel, serviceAvailabilityLabel } from '@/lib/format'
import { saveProduct, saveService, type Actor } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import { childCategories, parentCategories } from '@/lib/store/indexes'
import type { Business, PriceType, PricingModel, Product, ProductAvailability, PublicationStatus, Service, ServiceAvailability, ServiceCoverage } from '@/lib/types'
import { firstError, maxLength, minLength, positiveNumber, required } from '@/lib/validation'

type Errors = Partial<Record<string, string>>
const clean = (e: Errors) => Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Errors

function CategoryOptions() {
  const idx = useIndex()
  return (
    <>
      <option value="">Choose a category…</option>
      {parentCategories(idx)
        .filter((c) => c.enabled)
        .map((p) => {
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
    </>
  )
}

function BusinessSelect({ businesses, value, onChange, error }: { businesses: Business[]; value: string; onChange: (id: string) => void; error?: string }) {
  const idx = useIndex()
  return (
    <SelectField label="Business" required value={value} onChange={(e) => onChange(e.target.value)} error={error}>
      <option value="">Choose a business…</option>
      {businesses
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} — {idx.townById.get(b.townId)?.name}
          </option>
        ))}
    </SelectField>
  )
}

// ───────────────────────── product ─────────────────────────

export function ProductFormModal({ open, onOpenChange, business, businesses, product, actor, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; business?: Business; businesses?: Business[]; product?: Product; actor: Actor; onSaved?: (p: Product) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={product ? 'Edit product' : 'Add a product'} description={business ? `Listed under ${business.name}.` : 'Products appear in the public catalogue once published.'} size="lg">
      <ProductForm business={business} businesses={businesses} product={product} actor={actor} onCancel={() => onOpenChange(false)} onSaved={(p) => { onSaved?.(p); onOpenChange(false) }} />
    </Modal>
  )
}

function ProductForm({ business, businesses, product, actor, onCancel, onSaved }: { business?: Business; businesses?: Business[]; product?: Product; actor: Actor; onCancel: () => void; onSaved: (p: Product) => void }) {
  const idx = useIndex()
  const toast = useToast()
  const [businessId, setBusinessId] = useState(product?.businessId ?? business?.id ?? '')
  const biz = idx.businessById.get(businessId)
  const [name, setName] = useState(product?.name ?? '')
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? business?.categoryIds[0] ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [unit, setUnit] = useState(product?.unit ?? 'each')
  const [priceType, setPriceType] = useState<PriceType>(product?.priceType ?? 'fixed')
  const [price, setPrice] = useState(product?.price !== undefined ? String(product.price) : '')
  const [availability, setAvailability] = useState<ProductAvailability>(product?.availability ?? 'in_stock')
  const [publication, setPublication] = useState<PublicationStatus>(product?.publicationStatus ?? 'published')
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>(product?.specifications.filter((s) => s.label !== 'Unit of sale') ?? [])
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = clean({
      businessId: businessId ? undefined : 'Choose a business',
      name: firstError(required(name, 'Product name'), minLength(name, 3, 'Product name'), maxLength(name, 100, 'Product name')),
      categoryId: categoryId ? undefined : 'Choose a category',
      description: firstError(required(description, 'Description'), minLength(description, 10, 'Description')),
      price: priceType === 'quote' ? undefined : positiveNumber(price, 'Price'),
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const result = saveProduct(
      {
        id: product?.id,
        businessId,
        name,
        categoryId,
        description,
        unit,
        priceType,
        price: priceType === 'quote' ? undefined : Number(price),
        availability,
        publicationStatus: publication,
        specifications: [...specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })), { label: 'Unit of sale', value: unit || 'each' }],
      },
      actor,
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(product ? `${result.value.name} was updated` : `${result.value.name} was added${publication === 'published' ? '' : ' as a draft'}`)
    onSaved(result.value)
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
      {!business && !product && businesses && <BusinessSelect businesses={businesses} value={businessId} onChange={(id) => { setBusinessId(id); const b = idx.businessById.get(id); if (b && !categoryId) setCategoryId(b.categoryIds[0]) }} error={errors.businessId} />}
      <TextField label="Product name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <SelectField label="Category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
        <CategoryOptions />
      </SelectField>
      <TextAreaField label="Description" required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField label="Pricing" value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)}>
          <option value="fixed">Fixed price</option>
          <option value="from">Price from…</option>
          <option value="quote">Request a quote</option>
        </SelectField>
        {priceType !== 'quote' && <TextField label="Price (BWP)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} error={errors.price} />}
        <TextField label="Unit of sale" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="each, per bag, per night…" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value as ProductAvailability)}>
          {(['in_stock', 'low_stock', 'made_to_order', 'seasonal', 'out_of_stock'] as const).map((a) => (
            <option key={a} value={a}>
              {availabilityLabel(a)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Visibility" value={publication} onChange={(e) => setPublication(e.target.value as PublicationStatus)} hint={biz && !(biz.approvalStatus === 'approved' && biz.listingStatus === 'published') ? 'The business is not public yet, so this product stays hidden until it is.' : undefined}>
          <option value="published">Published</option>
          <option value="draft">Draft (hidden)</option>
          <option value="unpublished">Unpublished (hidden)</option>
        </SelectField>
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-ink">Specifications (optional)</legend>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {specs.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
              <TextField label={`Specification ${i + 1} name`} hideLabel placeholder="e.g. Weight" value={s.label} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <TextField label={`Specification ${i + 1} value`} hideLabel placeholder="e.g. 50 kg" value={s.value} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <button type="button" aria-label={`Remove specification ${i + 1}`} onClick={() => setSpecs(specs.filter((_, j) => j !== i))} className="rounded-lg p-2.5 text-ink-muted hover:bg-danger-bg hover:text-danger">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {specs.length < 6 && (
            <div>
              <Button type="button" variant="quiet" size="md-sm" onClick={() => setSpecs([...specs, { label: '', value: '' }])}>
                <Plus /> Add specification
              </Button>
            </div>
          )}
        </div>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="soft" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" size="md">
          {product ? 'Save changes' : 'Add product'}
        </Button>
      </div>
    </form>
  )
}

// ───────────────────────── service ─────────────────────────

export function ServiceFormModal({ open, onOpenChange, business, businesses, service, actor, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; business?: Business; businesses?: Business[]; service?: Service; actor: Actor; onSaved?: (s: Service) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={service ? 'Edit service' : 'Add a service'} description={business ? `Provided by ${business.name}.` : 'Services appear in the public directory once published.'} size="lg">
      <ServiceForm business={business} businesses={businesses} service={service} actor={actor} onCancel={() => onOpenChange(false)} onSaved={(s) => { onSaved?.(s); onOpenChange(false) }} />
    </Modal>
  )
}

const PRICING: { id: PricingModel; label: string }[] = [
  { id: 'fixed', label: 'Fixed price' },
  { id: 'hourly', label: 'Per hour' },
  { id: 'daily', label: 'Per day' },
  { id: 'project', label: 'Per project' },
  { id: 'monthly', label: 'Per month' },
  { id: 'quote', label: 'Request a quote' },
]

function ServiceForm({ business, businesses, service, actor, onCancel, onSaved }: { business?: Business; businesses?: Business[]; service?: Service; actor: Actor; onCancel: () => void; onSaved: (s: Service) => void }) {
  const idx = useIndex()
  const toast = useToast()
  const [businessId, setBusinessId] = useState(service?.businessId ?? business?.id ?? '')
  const [name, setName] = useState(service?.name ?? '')
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? business?.categoryIds[0] ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [coverage, setCoverage] = useState<ServiceCoverage>(service?.coverage ?? 'local')
  const [townIds, setTownIds] = useState<string[]>(service?.townIds ?? [])
  const [note, setNote] = useState(service?.serviceAreaNote ?? '')
  const [pricingModel, setPricingModel] = useState<PricingModel>(service?.pricingModel ?? 'fixed')
  const [price, setPrice] = useState(service?.price !== undefined ? String(service.price) : '')
  const [priceMax, setPriceMax] = useState(service?.priceMax !== undefined ? String(service.priceMax) : '')
  const [availability, setAvailability] = useState<ServiceAvailability>(service?.availability ?? 'available')
  const [publication, setPublication] = useState<PublicationStatus>(service?.publicationStatus ?? 'published')
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const ownTown = idx.businessById.get(businessId)?.townId

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = clean({
      businessId: businessId ? undefined : 'Choose a business',
      name: firstError(required(name, 'Service name'), minLength(name, 3, 'Service name'), maxLength(name, 100, 'Service name')),
      categoryId: categoryId ? undefined : 'Choose a category',
      description: firstError(required(description, 'Description'), minLength(description, 10, 'Description')),
      price: pricingModel === 'quote' ? undefined : positiveNumber(price, 'Price'),
      priceMax: pricingModel !== 'quote' && priceMax && Number(priceMax) < Number(price) ? 'Maximum must be at least the starting price' : undefined,
      towns: coverage === 'regional' && townIds.filter((t) => t !== ownTown).length === 0 ? 'Choose at least one other town this service covers' : undefined,
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const result = saveService(
      {
        id: service?.id,
        businessId,
        name,
        categoryId,
        description,
        coverage,
        townIds: coverage === 'regional' ? townIds : [],
        serviceAreaNote: note,
        pricingModel,
        price: pricingModel === 'quote' ? undefined : Number(price),
        priceMax: pricingModel === 'quote' || !priceMax ? undefined : Number(priceMax),
        availability,
        publicationStatus: publication,
      },
      actor,
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(service ? `${result.value.name} was updated` : `${result.value.name} was added${publication === 'published' ? '' : ' as a draft'}`)
    onSaved(result.value)
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
      {!business && !service && businesses && <BusinessSelect businesses={businesses} value={businessId} onChange={(id) => { setBusinessId(id); const b = idx.businessById.get(id); if (b && !categoryId) setCategoryId(b.categoryIds[0]) }} error={errors.businessId} />}
      <TextField label="Service name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <SelectField label="Category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
        <CategoryOptions />
      </SelectField>
      <TextAreaField label="Description" required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField label="Pricing" value={pricingModel} onChange={(e) => setPricingModel(e.target.value as PricingModel)}>
          {PRICING.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
        {pricingModel !== 'quote' && <TextField label="Price from (BWP)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} error={errors.price} />}
        {pricingModel !== 'quote' && <TextField label="Up to (optional)" inputMode="decimal" value={priceMax} onChange={(e) => setPriceMax(e.target.value.replace(/[^\d.]/g, ''))} error={errors.priceMax} />}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Service area" value={coverage} onChange={(e) => setCoverage(e.target.value as ServiceCoverage)}>
          <option value="local">Local — my own town</option>
          <option value="regional">Regional — several towns</option>
          <option value="nationwide">Nationwide</option>
        </SelectField>
        <SelectField label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value as ServiceAvailability)}>
          {(['available', 'limited', 'waitlist', 'unavailable'] as const).map((a) => (
            <option key={a} value={a}>
              {serviceAvailabilityLabel(a)}
            </option>
          ))}
        </SelectField>
      </div>
      {coverage === 'regional' && (
        <fieldset>
          <legend className="text-xs font-medium text-ink">Towns covered</legend>
          <div className="mt-2 grid grid-cols-1 max-h-44 gap-2 overflow-y-auto rounded-xl border border-line p-3 sm:grid-cols-3">
            {idx.data.towns
              .filter((t) => t.enabled && t.id !== ownTown)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <CheckboxField key={t.id} label={t.name} checked={townIds.includes(t.id)} onChange={(on) => setTownIds(on ? [...townIds, t.id] : townIds.filter((x) => x !== t.id))} />
              ))}
          </div>
          {errors.towns && <p role="alert" className="mt-1.5 text-[11px] font-medium text-danger">{errors.towns}</p>}
        </fieldset>
      )}
      <TextField label="Service area note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Within 50 km of Palapye" />
      <SelectField label="Visibility" value={publication} onChange={(e) => setPublication(e.target.value as PublicationStatus)}>
        <option value="published">Published</option>
        <option value="draft">Draft (hidden)</option>
        <option value="unpublished">Unpublished (hidden)</option>
      </SelectField>
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="soft" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" size="md">
          {service ? 'Save changes' : 'Add service'}
        </Button>
      </div>
    </form>
  )
}
