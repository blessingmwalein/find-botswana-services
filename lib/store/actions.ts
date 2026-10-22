import { slugify } from '../format'
import { inBotswana, offsetPoint } from '../geo'
import { Rng, hashString } from '../seed/prng'
import type {
  Activity,
  ActivityEntity,
  ArtRef,
  Business,
  BusinessType,
  Category,
  ContactPreferences,
  Dataset,
  Enquiry,
  EnquiryStatus,
  EnquiryTarget,
  ListingStatus,
  OpeningHours,
  PriceType,
  PricingModel,
  Product,
  ProductAvailability,
  PublicationStatus,
  Region,
  Service,
  ServiceAvailability,
  ServiceCoverage,
  Settings,
  SocialLinks,
  Town,
  ToneKey,
  User,
  UserRole,
  UserStatus,
} from '../types'
import { validEmail } from '../validation'
import { getIndex } from './indexes'
import { getState, resetToSeed, updateData, updatePrefs, type Prefs } from './store'

// ───────────────────────── shared helpers ─────────────────────────

export interface Actor {
  name: string
  role: string
}
export const ADMIN_ACTOR: Actor = { name: 'Admin User', role: 'Administrator' }
export const SYSTEM_ACTOR: Actor = { name: 'System', role: 'System' }

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string }
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

const nowIso = () => new Date().toISOString()

function nextId(prefix: string, ids: Iterable<string>, width: number): string {
  let max = 0
  for (const id of ids) {
    const m = id.match(/(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${String(max + 1).padStart(width, '0')}`
}

function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing)
  const root = base || 'item'
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${n}`)) n++
  return `${root}-${n}`
}

const TONES: ToneKey[] = ['sage', 'sand', 'clay', 'sky', 'mist', 'stone']

function artFor(key: string, label?: string): ArtRef {
  const h = hashString(key)
  return { tone: TONES[h % TONES.length], pattern: (Math.floor(h / 7) % 5) as ArtRef['pattern'], label }
}

function logActivity(
  data: Dataset,
  actor: Actor,
  action: string,
  entityType: ActivityEntity,
  entityId: string,
  entityName: string,
  message: string,
): Dataset {
  const entry: Activity = {
    id: nextId('act', data.activities.map((a) => a.id), 3),
    at: nowIso(),
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    entityName,
    message,
  }
  return { ...data, activities: [entry, ...data.activities] }
}

/** Illustrative position near a town centre — deterministic for a given business name. */
export function illustrativeCoords(town: Town, key: string): [number, number] {
  const rng = new Rng(hashString(`${town.id}:${key}`))
  const maxKm = town.localityType === 'city' ? 6 : town.localityType === 'town' ? 3 : town.localityType === 'village' ? 1.4 : 0.7
  const [lat, lng] = offsetPoint(town.lat, town.lng, Math.sqrt(rng.next()) * maxKm, rng.float(0, Math.PI * 2))
  return [Math.round(lat * 100000) / 100000, Math.round(lng * 100000) / 100000]
}

// ───────────────────────── businesses ─────────────────────────

export interface ProductInput {
  id?: string
  businessId: string
  name: string
  categoryId: string
  description: string
  unit: string
  priceType: PriceType
  price?: number
  availability: ProductAvailability
  specifications?: { label: string; value: string }[]
  publicationStatus?: PublicationStatus
}

export interface ServiceInput {
  id?: string
  businessId: string
  name: string
  categoryId: string
  description: string
  coverage: ServiceCoverage
  townIds: string[]
  serviceAreaNote?: string
  pricingModel: PricingModel
  price?: number
  priceMax?: number
  availability: ServiceAvailability
  publicationStatus?: PublicationStatus
}

export interface NewBusinessInput {
  name: string
  categoryIds: string[]
  businessType: BusinessType
  shortDescription?: string
  description: string
  phone: string
  alternatePhone?: string
  email: string
  website?: string
  townId: string
  address: string
  lat?: number
  lng?: number
  openingHours?: OpeningHours | null
  registrationRef?: string
  yearEstablished?: number
  social?: SocialLinks
  contactPreferences?: Partial<ContactPreferences>
  ownerUserId?: string
  products?: Omit<ProductInput, 'businessId'>[]
  services?: Omit<ServiceInput, 'businessId'>[]
  /** Created directly by an administrator — approved and published immediately. */
  byAdmin?: boolean
}

export function createBusiness(input: NewBusinessInput, actor: Actor): Result<Business> {
  const data = getState().data
  const idx = getIndex(data)
  const town = idx.townById.get(input.townId)
  if (!town) return fail('Choose a valid town.')
  if (!input.name.trim()) return fail('Business name is required.')
  if (!input.categoryIds.length) return fail('Choose at least one category.')

  const now = nowIso()
  const id = nextId('biz', data.businesses.map((b) => b.id), 3)
  const slug = uniqueSlug(slugify(input.name), data.businesses.map((b) => b.slug))
  const [lat, lng] = input.lat !== undefined && input.lng !== undefined && inBotswana(input.lat, input.lng) ? [input.lat, input.lng] : illustrativeCoords(town, input.name)
  const autoApprove = input.byAdmin || !data.settings.requireApproval
  const tone = TONES[hashString(input.name) % TONES.length]
  const initialsOf = input.name.split(/\s+/).filter((w) => w && !/^(&|and|the|of)$/i.test(w)).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'FB'

  const business: Business = {
    id,
    slug,
    name: input.name.trim(),
    logo: { initials: initialsOf, tone },
    cover: artFor(input.name),
    categoryIds: input.categoryIds,
    businessType: input.businessType,
    shortDescription: input.shortDescription?.trim() || input.description.trim().slice(0, 140),
    description: input.description.trim(),
    phone: input.phone.trim(),
    alternatePhone: input.alternatePhone?.trim() || undefined,
    email: input.email.trim(),
    website: input.website?.trim() || undefined,
    regionId: town.regionId,
    townId: town.id,
    address: input.address.trim(),
    lat,
    lng,
    openingHours: input.openingHours ?? null,
    approvalStatus: autoApprove ? 'approved' : 'pending',
    listingStatus: autoApprove ? 'published' : 'draft',
    verificationStatus: 'unverified',
    featured: false,
    isFictional: true,
    yearEstablished: input.yearEstablished,
    registrationRef: input.registrationRef?.trim() || undefined,
    social: input.social,
    contactPreferences: { showPhone: true, showEmail: true, acceptEnquiries: true, preferredContact: 'phone', ...input.contactPreferences },
    ownerUserId: input.ownerUserId,
    createdAt: now,
    updatedAt: now,
    submittedAt: autoApprove ? undefined : now,
  }

  const products: Product[] = []
  const services: Service[] = []
  let productIds = data.products.map((p) => p.id)
  let serviceIds = data.services.map((s) => s.id)
  let productSlugs = data.products.map((p) => p.slug)
  let serviceSlugs = data.services.map((s) => s.slug)
  for (const p of input.products ?? []) {
    const product = buildProduct({ ...p, businessId: id }, business, nextId('prd', productIds, 4), productSlugs, now)
    productIds = [...productIds, product.id]
    productSlugs = [...productSlugs, product.slug]
    products.push(product)
  }
  for (const s of input.services ?? []) {
    const service = buildService({ ...s, businessId: id }, business, idx.townById, nextId('svc', serviceIds, 4), serviceSlugs, now)
    serviceIds = [...serviceIds, service.id]
    serviceSlugs = [...serviceSlugs, service.slug]
    services.push(service)
  }

  updateData((d) => {
    let next: Dataset = {
      ...d,
      businesses: [business, ...d.businesses],
      products: [...d.products, ...products],
      services: [...d.services, ...services],
      users: input.ownerUserId ? d.users.map((u) => (u.id === input.ownerUserId ? { ...u, businessIds: [...u.businessIds, id] } : u)) : d.users,
    }
    next = logActivity(
      next,
      actor,
      autoApprove ? 'business.created' : 'business.submitted',
      'business',
      id,
      business.name,
      autoApprove ? `${business.name} was added and published.` : `${business.name} was submitted for approval.`,
    )
    return next
  })
  return ok(business)
}

export function updateBusiness(id: string, patch: Partial<Business>, actor: Actor, message?: string): Result<Business> {
  const data = getState().data
  const idx = getIndex(data)
  const current = idx.businessById.get(id)
  if (!current) return fail('Business not found.')
  const merged: Business = { ...current, ...patch, id: current.id, slug: current.slug, updatedAt: nowIso() }
  if (patch.townId && patch.townId !== current.townId) {
    const town = idx.townById.get(patch.townId)
    if (!town) return fail('Choose a valid town.')
    merged.regionId = town.regionId
    if (patch.lat === undefined || patch.lng === undefined) [merged.lat, merged.lng] = illustrativeCoords(town, merged.name)
  }
  if (!merged.name.trim()) return fail('Business name is required.')
  if (!merged.categoryIds.length) return fail('Choose at least one category.')
  updateData((d) =>
    logActivity({ ...d, businesses: d.businesses.map((b) => (b.id === id ? merged : b)) }, actor, 'business.updated', 'business', id, merged.name, message ?? `${merged.name} listing details were updated.`),
  )
  return ok(merged)
}

function transition(id: string, actor: Actor, action: string, message: (b: Business) => string, change: (b: Business) => Partial<Business> | string): Result<Business> {
  const data = getState().data
  const current = getIndex(data).businessById.get(id)
  if (!current) return fail('Business not found.')
  const patch = change(current)
  if (typeof patch === 'string') return fail(patch)
  const next: Business = { ...current, ...patch, updatedAt: nowIso() }
  updateData((d) => logActivity({ ...d, businesses: d.businesses.map((b) => (b.id === id ? next : b)) }, actor, action, 'business', id, next.name, message(next)))
  return ok(next)
}

export function approveBusiness(id: string, opts: { publish?: boolean; verify?: boolean }, actor: Actor = ADMIN_ACTOR) {
  const publish = opts.publish ?? true
  const r = transition(
    id,
    actor,
    'business.approved',
    (b) => `${b.name} was approved${publish ? ' and published' : ' (not yet published)'}${opts.verify ? ' and verified' : ''}.`,
    (b) => ({
      approvalStatus: 'approved',
      listingStatus: publish ? 'published' : b.listingStatus === 'published' ? 'published' : 'unpublished',
      verificationStatus: opts.verify ? 'verified' : b.verificationStatus,
      rejectionReason: undefined,
      changeRequest: undefined,
    }),
  )
  return r
}

export function rejectBusiness(id: string, reason: string, actor: Actor = ADMIN_ACTOR) {
  if (!reason.trim()) return fail('A rejection reason is required.')
  return transition(id, actor, 'business.rejected', (b) => `${b.name} was rejected: ${reason.trim()}`, () => ({
    approvalStatus: 'rejected',
    listingStatus: 'draft',
    rejectionReason: reason.trim(),
    changeRequest: undefined,
  }))
}

export function requestBusinessChanges(id: string, note: string, actor: Actor = ADMIN_ACTOR) {
  if (!note.trim()) return fail('Describe the changes you are requesting.')
  return transition(id, actor, 'business.changes_requested', (b) => `Changes were requested for ${b.name}.`, () => ({
    approvalStatus: 'changes_requested',
    listingStatus: 'draft',
    changeRequest: note.trim(),
    rejectionReason: undefined,
  }))
}

export function suspendBusiness(id: string, actor: Actor = ADMIN_ACTOR) {
  return transition(id, actor, 'business.suspended', (b) => `${b.name} was suspended from the public directory.`, (b) =>
    b.approvalStatus !== 'approved' ? 'Only approved businesses can be suspended.' : { listingStatus: 'suspended' },
  )
}

export function reactivateBusiness(id: string, actor: Actor = ADMIN_ACTOR) {
  return transition(id, actor, 'business.reactivated', (b) => `${b.name} was reactivated and is public again.`, (b) =>
    b.listingStatus !== 'suspended' ? 'This business is not suspended.' : { listingStatus: 'published' },
  )
}

export function setListingStatus(id: string, status: Extract<ListingStatus, 'published' | 'unpublished'>, actor: Actor = ADMIN_ACTOR) {
  return transition(id, actor, status === 'published' ? 'business.published' : 'business.unpublished', (b) => `${b.name} was ${status === 'published' ? 'published' : 'unpublished'}.`, (b) => {
    if (b.approvalStatus !== 'approved') return 'Only approved businesses can be published.'
    if (b.listingStatus === 'suspended') return 'A suspended business must be reactivated first.'
    return { listingStatus: status }
  })
}

export function setVerification(id: string, verified: boolean, actor: Actor = ADMIN_ACTOR) {
  return transition(id, actor, verified ? 'business.verified' : 'business.unverified', (b) => `${b.name} was ${verified ? 'marked as verified' : 'unverified'}.`, () => ({
    verificationStatus: verified ? 'verified' : 'unverified',
  }))
}

export function setFeatured(id: string, featured: boolean, actor: Actor = ADMIN_ACTOR) {
  return transition(id, actor, featured ? 'business.featured' : 'business.unfeatured', (b) => `${b.name} was ${featured ? 'featured' : 'removed from featured listings'}.`, () => ({ featured }))
}

/** Owner re-submits a draft, rejected or change-requested business for approval. */
export function submitForApproval(id: string, actor: Actor) {
  const requireApproval = getState().data.settings.requireApproval
  return transition(id, actor, 'business.submitted', (b) => (requireApproval ? `${b.name} was submitted for approval.` : `${b.name} was published.`), (b) => {
    if (b.approvalStatus === 'approved') return 'This business is already approved.'
    return requireApproval
      ? { approvalStatus: 'pending', listingStatus: 'draft', submittedAt: nowIso(), rejectionReason: undefined, changeRequest: undefined }
      : { approvalStatus: 'approved', listingStatus: 'published', submittedAt: nowIso(), rejectionReason: undefined, changeRequest: undefined }
  })
}

/** Deletes a business together with its catalogue and enquiries so no orphans remain. */
export function deleteBusiness(id: string, actor: Actor = ADMIN_ACTOR): Result<{ products: number; services: number; enquiries: number }> {
  const data = getState().data
  const biz = getIndex(data).businessById.get(id)
  if (!biz) return fail('Business not found.')
  const counts = {
    products: data.products.filter((p) => p.businessId === id).length,
    services: data.services.filter((s) => s.businessId === id).length,
    enquiries: data.enquiries.filter((e) => e.businessId === id).length,
  }
  updateData((d) => {
    const next: Dataset = {
      ...d,
      businesses: d.businesses.filter((b) => b.id !== id),
      products: d.products.filter((p) => p.businessId !== id),
      services: d.services.filter((s) => s.businessId !== id),
      enquiries: d.enquiries.filter((e) => e.businessId !== id),
      users: d.users.map((u) => (u.businessIds.includes(id) ? { ...u, businessIds: u.businessIds.filter((b) => b !== id) } : u)),
    }
    return logActivity(next, actor, 'business.deleted', 'business', id, biz.name, `${biz.name} was deleted together with ${counts.products} products, ${counts.services} services and ${counts.enquiries} enquiries.`)
  })
  return ok(counts)
}

// ───────────────────────── products ─────────────────────────

function buildProduct(input: ProductInput, business: Business, id: string, existingSlugs: string[], now: string, previous?: Product): Product {
  const slug = previous?.slug ?? uniqueSlug(`${slugify(input.name)}-${business.slug}`, existingSlugs)
  return {
    id,
    slug,
    businessId: input.businessId,
    name: input.name.trim(),
    categoryId: input.categoryId,
    description: input.description.trim(),
    image: previous?.image ?? { ...artFor(input.name), label: input.name.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') },
    gallery: previous?.gallery ?? [],
    unit: input.unit.trim() || 'each',
    price: input.priceType === 'quote' ? undefined : input.price,
    currency: 'BWP',
    priceType: input.priceType,
    availability: input.availability,
    specifications: input.specifications ?? previous?.specifications ?? [],
    sku: previous?.sku ?? `${business.logo.initials}-${String(hashString(input.name) % 10000).padStart(4, '0')}`,
    publicationStatus: input.publicationStatus ?? previous?.publicationStatus ?? 'published',
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
}

export function validateProductInput(input: ProductInput): string | null {
  if (!input.name.trim()) return 'Product name is required.'
  if (!input.categoryId) return 'Choose a category.'
  if (input.priceType !== 'quote' && !(typeof input.price === 'number' && input.price > 0)) return 'Enter a price greater than 0, or choose “Request a quote”.'
  if (!input.description.trim()) return 'Add a short description.'
  return null
}

export function saveProduct(input: ProductInput, actor: Actor): Result<Product> {
  const problem = validateProductInput(input)
  if (problem) return fail(problem)
  const data = getState().data
  const idx = getIndex(data)
  const business = idx.businessById.get(input.businessId)
  if (!business) return fail('The supplier business no longer exists.')
  if (!idx.categoryById.has(input.categoryId)) return fail('Choose a valid category.')
  const now = nowIso()
  const previous = input.id ? idx.productById.get(input.id) : undefined
  if (input.id && !previous) return fail('Product not found.')
  const product = buildProduct(input, business, previous?.id ?? nextId('prd', data.products.map((p) => p.id), 4), data.products.map((p) => p.slug), now, previous)
  updateData((d) => {
    const products = previous ? d.products.map((p) => (p.id === product.id ? product : p)) : [...d.products, product]
    return logActivity({ ...d, products }, actor, previous ? 'product.updated' : 'product.created', 'product', product.id, product.name, previous ? `${product.name} was updated.` : `${product.name} was added to ${business.name}.`)
  })
  return ok(product)
}

export function setProductPublication(id: string, status: PublicationStatus, actor: Actor) {
  const p = getIndex(getState().data).productById.get(id)
  if (!p) return fail('Product not found.')
  const next = { ...p, publicationStatus: status, updatedAt: nowIso() }
  updateData((d) => logActivity({ ...d, products: d.products.map((x) => (x.id === id ? next : x)) }, actor, `product.${status}`, 'product', id, p.name, `${p.name} was ${status === 'published' ? 'published' : status === 'draft' ? 'moved to draft' : 'unpublished'}.`))
  return ok(next)
}

export function deleteProduct(id: string, actor: Actor) {
  const data = getState().data
  const p = getIndex(data).productById.get(id)
  if (!p) return fail('Product not found.')
  updateData((d) => {
    // Enquiries about the product stay, but now point at the supplier so they are never orphaned.
    const enquiries = d.enquiries.map((e) => (e.targetType === 'product' && e.targetId === id ? { ...e, targetType: 'business' as EnquiryTarget, targetId: e.businessId } : e))
    return logActivity({ ...d, products: d.products.filter((x) => x.id !== id), enquiries }, actor, 'product.deleted', 'product', id, p.name, `${p.name} was deleted.`)
  })
  return ok(undefined)
}

// ───────────────────────── services ─────────────────────────

function buildService(input: ServiceInput, business: Business, towns: Map<string, Town>, id: string, existingSlugs: string[], now: string, previous?: Service): Service {
  const slug = previous?.slug ?? uniqueSlug(`${slugify(input.name)}-${business.slug}`, existingSlugs)
  const townIds = input.coverage === 'nationwide' ? [business.townId] : Array.from(new Set([business.townId, ...input.townIds]))
  const regionIds =
    input.coverage === 'nationwide'
      ? Array.from(new Set(Array.from(towns.values()).map((t) => t.regionId)))
      : Array.from(new Set(townIds.map((t) => towns.get(t)?.regionId).filter((r): r is string => !!r)))
  const note =
    input.serviceAreaNote?.trim() ||
    (input.coverage === 'nationwide' ? 'Nationwide, by arrangement' : townIds.map((t) => towns.get(t)?.name).filter(Boolean).join(', '))
  return {
    id,
    slug,
    businessId: input.businessId,
    name: input.name.trim(),
    categoryId: input.categoryId,
    description: input.description.trim(),
    image: previous?.image ?? { ...artFor(input.name), label: input.name.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') },
    coverage: input.coverage,
    townIds,
    regionIds,
    serviceAreaNote: note,
    price: input.pricingModel === 'quote' ? undefined : input.price,
    priceMax: input.pricingModel === 'quote' ? undefined : input.priceMax,
    currency: 'BWP',
    pricingModel: input.pricingModel,
    availability: input.availability,
    publicationStatus: input.publicationStatus ?? previous?.publicationStatus ?? 'published',
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
}

export function validateServiceInput(input: ServiceInput): string | null {
  if (!input.name.trim()) return 'Service name is required.'
  if (!input.categoryId) return 'Choose a category.'
  if (input.pricingModel !== 'quote' && !(typeof input.price === 'number' && input.price > 0)) return 'Enter a price greater than 0, or choose “Request a quote”.'
  if (input.priceMax !== undefined && input.price !== undefined && input.priceMax < input.price) return 'The maximum price cannot be lower than the starting price.'
  if (!input.description.trim()) return 'Add a short description.'
  return null
}

export function saveService(input: ServiceInput, actor: Actor): Result<Service> {
  const problem = validateServiceInput(input)
  if (problem) return fail(problem)
  const data = getState().data
  const idx = getIndex(data)
  const business = idx.businessById.get(input.businessId)
  if (!business) return fail('The provider business no longer exists.')
  if (!idx.categoryById.has(input.categoryId)) return fail('Choose a valid category.')
  const previous = input.id ? idx.serviceById.get(input.id) : undefined
  if (input.id && !previous) return fail('Service not found.')
  const service = buildService(input, business, idx.townById, previous?.id ?? nextId('svc', data.services.map((s) => s.id), 4), data.services.map((s) => s.slug), nowIso(), previous)
  updateData((d) => {
    const services = previous ? d.services.map((s) => (s.id === service.id ? service : s)) : [...d.services, service]
    return logActivity({ ...d, services }, actor, previous ? 'service.updated' : 'service.created', 'service', service.id, service.name, previous ? `${service.name} was updated.` : `${service.name} was added to ${business.name}.`)
  })
  return ok(service)
}

export function setServicePublication(id: string, status: PublicationStatus, actor: Actor) {
  const s = getIndex(getState().data).serviceById.get(id)
  if (!s) return fail('Service not found.')
  const next = { ...s, publicationStatus: status, updatedAt: nowIso() }
  updateData((d) => logActivity({ ...d, services: d.services.map((x) => (x.id === id ? next : x)) }, actor, `service.${status}`, 'service', id, s.name, `${s.name} was ${status === 'published' ? 'published' : status === 'draft' ? 'moved to draft' : 'unpublished'}.`))
  return ok(next)
}

export function deleteService(id: string, actor: Actor) {
  const s = getIndex(getState().data).serviceById.get(id)
  if (!s) return fail('Service not found.')
  updateData((d) => {
    const enquiries = d.enquiries.map((e) => (e.targetType === 'service' && e.targetId === id ? { ...e, targetType: 'business' as EnquiryTarget, targetId: e.businessId } : e))
    return logActivity({ ...d, services: d.services.filter((x) => x.id !== id), enquiries }, actor, 'service.deleted', 'service', id, s.name, `${s.name} was deleted.`)
  })
  return ok(undefined)
}

// ───────────────────────── categories ─────────────────────────

export interface CategoryInput {
  id?: string
  name: string
  icon: string
  parentId: string | null
  description: string
  enabled: boolean
}

export function saveCategory(input: CategoryInput, actor: Actor = ADMIN_ACTOR): Result<Category> {
  const data = getState().data
  const idx = getIndex(data)
  const name = input.name.trim()
  if (!name) return fail('Category name is required.')
  if (data.categories.some((c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase())) return fail(`A category named “${name}” already exists.`)
  if (input.parentId) {
    if (!idx.categoryById.has(input.parentId)) return fail('Choose a valid parent category.')
    if (input.id && idx.categoryTree.get(input.id)?.has(input.parentId)) return fail('A category cannot be moved inside itself.')
    if (idx.categoryById.get(input.parentId)?.parentId) return fail('Categories support one level of sub-categories.')
  }
  const previous = input.id ? idx.categoryById.get(input.id) : undefined
  if (input.id && !previous) return fail('Category not found.')
  const slug = previous?.slug ?? uniqueSlug(slugify(name), data.categories.map((c) => c.slug))
  const category: Category = {
    id: previous?.id ?? uniqueSlug(`cat-${slug}`, data.categories.map((c) => c.id)),
    slug,
    name,
    icon: input.icon.trim().slice(0, 2) || '◦',
    parentId: input.parentId,
    description: input.description.trim(),
    sortOrder: previous?.sortOrder ?? Math.max(0, ...data.categories.map((c) => c.sortOrder)) + 1,
    enabled: input.enabled,
  }
  updateData((d) => {
    const categories = previous ? d.categories.map((c) => (c.id === category.id ? category : c)) : [...d.categories, category]
    return logActivity({ ...d, categories }, actor, previous ? 'category.updated' : 'category.created', 'category', category.id, category.name, previous ? `Category “${category.name}” was updated.` : `Category “${category.name}” was created.`)
  })
  return ok(category)
}

export function toggleCategory(id: string, enabled: boolean, actor: Actor = ADMIN_ACTOR): Result<Category> {
  const c = getIndex(getState().data).categoryById.get(id)
  if (!c) return fail('Category not found.')
  const next = { ...c, enabled }
  updateData((d) => logActivity({ ...d, categories: d.categories.map((x) => (x.id === id ? next : x)) }, actor, enabled ? 'category.enabled' : 'category.disabled', 'category', id, c.name, `Category “${c.name}” was ${enabled ? 'enabled' : 'disabled'}.`))
  return ok(next)
}

export function categoryUsage(data: Dataset, id: string) {
  return {
    businesses: data.businesses.filter((b) => b.categoryIds.includes(id)).length,
    products: data.products.filter((p) => p.categoryId === id).length,
    services: data.services.filter((s) => s.categoryId === id).length,
    children: data.categories.filter((c) => c.parentId === id).length,
  }
}

export function deleteCategory(id: string, actor: Actor = ADMIN_ACTOR): Result {
  const data = getState().data
  const c = getIndex(data).categoryById.get(id)
  if (!c) return fail('Category not found.')
  const u = categoryUsage(data, id)
  if (u.businesses || u.products || u.services || u.children) {
    const parts = [u.businesses && `${u.businesses} business${u.businesses === 1 ? '' : 'es'}`, u.products && `${u.products} product${u.products === 1 ? '' : 's'}`, u.services && `${u.services} service${u.services === 1 ? '' : 's'}`, u.children && `${u.children} sub-categor${u.children === 1 ? 'y' : 'ies'}`].filter(Boolean)
    return fail(`“${c.name}” is still used by ${parts.join(', ')}. Disable it instead, or move those records first.`)
  }
  updateData((d) => logActivity({ ...d, categories: d.categories.filter((x) => x.id !== id) }, actor, 'category.deleted', 'category', id, c.name, `Category “${c.name}” was deleted.`))
  return ok(undefined)
}

// ───────────────────────── regions and towns ─────────────────────────

export interface RegionInput {
  id?: string
  name: string
  seat: string
  description: string
  lat: number
  lng: number
  enabled: boolean
}

export function saveRegion(input: RegionInput, actor: Actor = ADMIN_ACTOR): Result<Region> {
  const data = getState().data
  const idx = getIndex(data)
  const name = input.name.trim()
  if (!name) return fail('Region name is required.')
  if (data.regions.some((r) => r.id !== input.id && r.name.toLowerCase() === name.toLowerCase())) return fail(`A region named “${name}” already exists.`)
  if (!inBotswana(input.lat, input.lng)) return fail('Coordinates must be inside Botswana.')
  const previous = input.id ? idx.regionById.get(input.id) : undefined
  if (input.id && !previous) return fail('Region not found.')
  const slug = previous?.slug ?? uniqueSlug(slugify(name), data.regions.map((r) => r.slug))
  const region: Region = { id: previous?.id ?? `reg-${slug}`, slug, name, seat: input.seat.trim(), description: input.description.trim(), lat: input.lat, lng: input.lng, enabled: input.enabled }
  updateData((d) => {
    const regions = previous ? d.regions.map((r) => (r.id === region.id ? region : r)) : [...d.regions, region]
    return logActivity({ ...d, regions }, actor, previous ? 'region.updated' : 'region.created', 'region', region.id, region.name, previous ? `Region “${region.name}” was updated.` : `Region “${region.name}” was created.`)
  })
  return ok(region)
}

export function toggleRegion(id: string, enabled: boolean, actor: Actor = ADMIN_ACTOR): Result<Region> {
  const r = getIndex(getState().data).regionById.get(id)
  if (!r) return fail('Region not found.')
  const next = { ...r, enabled }
  updateData((d) => logActivity({ ...d, regions: d.regions.map((x) => (x.id === id ? next : x)) }, actor, enabled ? 'region.enabled' : 'region.disabled', 'region', id, r.name, `Region “${r.name}” was ${enabled ? 'enabled' : 'disabled'}.`))
  return ok(next)
}

export function deleteRegion(id: string, actor: Actor = ADMIN_ACTOR): Result {
  const data = getState().data
  const r = getIndex(data).regionById.get(id)
  if (!r) return fail('Region not found.')
  const towns = data.towns.filter((t) => t.regionId === id).length
  const businesses = data.businesses.filter((b) => b.regionId === id).length
  if (towns || businesses) return fail(`“${r.name}” still contains ${towns} town${towns === 1 ? '' : 's'} and ${businesses} business${businesses === 1 ? '' : 'es'}. Disable it instead.`)
  updateData((d) => logActivity({ ...d, regions: d.regions.filter((x) => x.id !== id) }, actor, 'region.deleted', 'region', id, r.name, `Region “${r.name}” was deleted.`))
  return ok(undefined)
}

export interface TownInput {
  id?: string
  name: string
  regionId: string
  lat: number
  lng: number
  localityType: Town['localityType']
  description?: string
  enabled: boolean
}

export function saveTown(input: TownInput, actor: Actor = ADMIN_ACTOR): Result<Town> {
  const data = getState().data
  const idx = getIndex(data)
  const name = input.name.trim()
  if (!name) return fail('Town name is required.')
  if (!idx.regionById.has(input.regionId)) return fail('Choose a valid region.')
  if (data.towns.some((t) => t.id !== input.id && t.name.toLowerCase() === name.toLowerCase())) return fail(`A town named “${name}” already exists.`)
  if (!inBotswana(input.lat, input.lng)) return fail('Coordinates must be inside Botswana.')
  const previous = input.id ? idx.townById.get(input.id) : undefined
  if (input.id && !previous) return fail('Town not found.')
  const slug = previous?.slug ?? uniqueSlug(slugify(name), data.towns.map((t) => t.slug))
  const town: Town = {
    id: previous?.id ?? `twn-${slug}`,
    slug,
    name,
    regionId: input.regionId,
    lat: input.lat,
    lng: input.lng,
    localityType: input.localityType,
    description: input.description?.trim() || undefined,
    areas: previous?.areas ?? ['Main Road'],
    enabled: input.enabled,
  }
  updateData((d) => {
    const towns = previous ? d.towns.map((t) => (t.id === town.id ? town : t)) : [...d.towns, town]
    // A town moving to another region keeps every business and user record consistent.
    const businesses = previous && previous.regionId !== town.regionId ? d.businesses.map((b) => (b.townId === town.id ? { ...b, regionId: town.regionId } : b)) : d.businesses
    return logActivity({ ...d, towns, businesses }, actor, previous ? 'town.updated' : 'town.created', 'town', town.id, town.name, previous ? `Town “${town.name}” was updated.` : `Town “${town.name}” was created.`)
  })
  return ok(town)
}

export function toggleTown(id: string, enabled: boolean, actor: Actor = ADMIN_ACTOR): Result<Town> {
  const t = getIndex(getState().data).townById.get(id)
  if (!t) return fail('Town not found.')
  const next = { ...t, enabled }
  updateData((d) => logActivity({ ...d, towns: d.towns.map((x) => (x.id === id ? next : x)) }, actor, enabled ? 'town.enabled' : 'town.disabled', 'town', id, t.name, `Town “${t.name}” was ${enabled ? 'enabled' : 'disabled'}.`))
  return ok(next)
}

export function townUsage(data: Dataset, id: string) {
  return {
    businesses: data.businesses.filter((b) => b.townId === id).length,
    services: data.services.filter((s) => s.townIds.includes(id)).length,
    users: data.users.filter((u) => u.townId === id).length,
  }
}

export function deleteTown(id: string, actor: Actor = ADMIN_ACTOR): Result {
  const data = getState().data
  const t = getIndex(data).townById.get(id)
  if (!t) return fail('Town not found.')
  const u = townUsage(data, id)
  if (u.businesses || u.services || u.users) {
    const parts = [u.businesses && `${u.businesses} business${u.businesses === 1 ? '' : 'es'}`, u.services && `${u.services} service area${u.services === 1 ? '' : 's'}`, u.users && `${u.users} user${u.users === 1 ? '' : 's'}`].filter(Boolean)
    return fail(`“${t.name}” is still referenced by ${parts.join(', ')}. Disable it instead.`)
  }
  updateData((d) => logActivity({ ...d, towns: d.towns.filter((x) => x.id !== id) }, actor, 'town.deleted', 'town', id, t.name, `Town “${t.name}” was deleted.`))
  return ok(undefined)
}

// ───────────────────────── users ─────────────────────────

export function createUser(input: { name: string; email: string; role: UserRole; townId: string }, actor: Actor = ADMIN_ACTOR): Result<User> {
  const data = getState().data
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name) return fail('Name is required.')
  if (!email) return fail('Email is required.')
  const emailError = validEmail(email)
  if (emailError) return fail(emailError)
  if (data.users.some((u) => u.email.toLowerCase() === email)) return fail('A user with this email already exists.')
  const user: User = {
    id: nextId('usr', data.users.map((u) => u.id), 2),
    name,
    email,
    role: input.role,
    status: 'invited',
    townId: input.townId,
    businessIds: [],
    createdAt: nowIso(),
    lastActiveAt: nowIso(),
  }
  updateData((d) => logActivity({ ...d, users: [...d.users, user] }, actor, 'user.created', 'user', user.id, user.name, `${user.name} was invited as ${roleLabel(user.role)}.`))
  return ok(user)
}

export const roleLabel = (r: UserRole) => ({ administrator: 'Administrator', moderator: 'Moderator', business_owner: 'Business owner', consumer: 'Consumer' }[r])

export function updateUser(id: string, patch: { role?: UserRole; status?: UserStatus; name?: string; email?: string }, actor: Actor = ADMIN_ACTOR): Result<User> {
  const data = getState().data
  const u = getIndex(data).userById.get(id)
  if (!u) return fail('User not found.')
  if (patch.email !== undefined) {
    const e = patch.email.trim().toLowerCase()
    const err = validEmail(e) ?? (!e ? 'Email is required.' : undefined)
    if (err) return fail(err)
    if (data.users.some((x) => x.id !== id && x.email.toLowerCase() === e)) return fail('A user with this email already exists.')
  }
  if (patch.role && patch.role !== 'business_owner' && u.businessIds.length) return fail(`${u.name} owns ${u.businessIds.length} business${u.businessIds.length === 1 ? '' : 'es'} and must stay a business owner.`)
  const admins = data.users.filter((x) => x.role === 'administrator' && x.status === 'active')
  if (u.role === 'administrator' && admins.length <= 1 && ((patch.role && patch.role !== 'administrator') || patch.status === 'inactive')) return fail('At least one active administrator is required.')
  const next: User = { ...u, ...patch, email: patch.email ? patch.email.trim().toLowerCase() : u.email }
  const roleChanged = patch.role && patch.role !== u.role
  const statusChanged = patch.status && patch.status !== u.status
  updateData((d) => {
    const base = { ...d, users: d.users.map((x) => (x.id === id ? next : x)) }
    if (roleChanged) return logActivity(base, actor, 'user.role_changed', 'user', id, u.name, `${u.name}'s role changed from ${roleLabel(u.role)} to ${roleLabel(next.role)}.`)
    if (statusChanged) return logActivity(base, actor, 'user.status_changed', 'user', id, u.name, `${u.name}'s account was ${next.status === 'active' ? 'activated' : next.status === 'inactive' ? 'deactivated' : 'set to invited'}.`)
    return logActivity(base, actor, 'user.updated', 'user', id, u.name, `${u.name}'s details were updated.`)
  })
  return ok(next)
}

// ───────────────────────── enquiries ─────────────────────────

export interface EnquiryInput {
  businessId: string
  targetType: EnquiryTarget
  targetId: string
  name: string
  email: string
  phone?: string
  message: string
  preferredDate?: string
}

export function createEnquiry(input: EnquiryInput): Result<Enquiry> {
  const data = getState().data
  const idx = getIndex(data)
  const biz = idx.businessById.get(input.businessId)
  if (!biz) return fail('This business is no longer available.')
  if (!data.settings.allowEnquiries || !biz.contactPreferences.acceptEnquiries) return fail('This business is not accepting enquiries right now.')
  const enquiry: Enquiry = {
    id: nextId('enq', data.enquiries.map((e) => e.id), 3),
    businessId: input.businessId,
    targetType: input.targetType,
    targetId: input.targetId,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || undefined,
    message: input.message.trim(),
    preferredDate: input.preferredDate || undefined,
    status: 'new',
    createdAt: nowIso(),
  }
  updateData((d) => logActivity({ ...d, enquiries: [enquiry, ...d.enquiries] }, { name: enquiry.name, role: 'Consumer' }, 'enquiry.received', 'enquiry', enquiry.id, biz.name, `New enquiry for ${biz.name} from ${enquiry.name}.`))
  return ok(enquiry)
}

export function setEnquiryStatus(id: string, status: EnquiryStatus, actor: Actor): Result<Enquiry> {
  const data = getState().data
  const e = data.enquiries.find((x) => x.id === id)
  if (!e) return fail('Enquiry not found.')
  const next = { ...e, status }
  const biz = getIndex(data).businessById.get(e.businessId)
  updateData((d) =>
    logActivity({ ...d, enquiries: d.enquiries.map((x) => (x.id === id ? next : x)) }, actor, 'enquiry.status_changed', 'enquiry', id, biz?.name ?? 'Enquiry', `Enquiry from ${e.name} was marked as ${status}.`),
  )
  return ok(next)
}

// ───────────────────────── settings, prefs, system ─────────────────────────

export function updateSettings(patch: Partial<Settings>, actor: Actor = ADMIN_ACTOR): Result<Settings> {
  const current = getState().data.settings
  const next = { ...current, ...patch }
  if (!next.siteName.trim()) return fail('Site name is required.')
  if (!Number.isInteger(next.pageSize) || next.pageSize < 6 || next.pageSize > 48) return fail('Page size must be a whole number between 6 and 48.')
  if (!Number.isInteger(next.featuredLimit) || next.featuredLimit < 1 || next.featuredLimit > 24) return fail('Featured limit must be a whole number between 1 and 24.')
  const emailError = validEmail(next.contactEmail)
  if (emailError || !next.contactEmail.trim()) return fail(emailError ?? 'Contact email is required.')
  updateData((d) => logActivity({ ...d, settings: next }, actor, 'settings.updated', 'system', 'settings', 'Platform settings', 'Platform settings were updated.'))
  return ok(next)
}

export function restoreSeedData(): void {
  resetToSeed()
}

export const prefs = {
  setOwnerUser(userId: string) {
    const data = getState().data
    const user = data.users.find((u) => u.id === userId)
    updatePrefs({ ownerUserId: userId, ownerBusinessId: user?.businessIds[0] ?? null })
  },
  setOwnerBusiness(id: string | null) {
    updatePrefs({ ownerBusinessId: id })
  },
  recordSearch(q: string) {
    const term = q.trim()
    if (term.length < 2) return
    const rest = getState().prefs.recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase())
    updatePrefs({ recentSearches: [term, ...rest].slice(0, 6) })
  },
  clearRecentSearches() {
    updatePrefs({ recentSearches: [] })
  },
  setViewMode(viewMode: Prefs['viewMode']) {
    updatePrefs({ viewMode })
  },
}
