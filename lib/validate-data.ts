import { haversineKm, inBotswana } from './geo'
import type { Dataset } from './types'

export interface DataIssue {
  level: 'error' | 'warning'
  area: string
  message: string
}

const APPROVAL = ['pending', 'approved', 'rejected', 'changes_requested']
const LISTING = ['draft', 'published', 'unpublished', 'suspended']
const VERIFICATION = ['unverified', 'verified']
const PUBLICATION = ['draft', 'published', 'unpublished']
const PRICE_TYPES = ['fixed', 'from', 'quote']
const AVAILABILITY = ['in_stock', 'low_stock', 'made_to_order', 'seasonal', 'out_of_stock']
const SVC_AVAIL = ['available', 'limited', 'waitlist', 'unavailable']
const PRICING = ['fixed', 'hourly', 'daily', 'project', 'monthly', 'quote']
const COVERAGE = ['local', 'regional', 'nationwide']

/** Referential-integrity validation shared by the CLI script and the admin settings screen. */
export function validateDataset(d: Dataset): DataIssue[] {
  const issues: DataIssue[] = []
  const err = (area: string, message: string) => issues.push({ level: 'error', area, message })
  const warn = (area: string, message: string) => issues.push({ level: 'warning', area, message })

  const uniq = (area: string, items: { id: string; slug?: string }[], checkSlug = true) => {
    const ids = new Set<string>()
    const slugs = new Set<string>()
    for (const it of items) {
      if (ids.has(it.id)) err(area, `Duplicate id "${it.id}"`)
      ids.add(it.id)
      if (checkSlug && it.slug !== undefined) {
        if (!it.slug) err(area, `Empty slug on "${it.id}"`)
        if (slugs.has(it.slug)) err(area, `Duplicate slug "${it.slug}"`)
        slugs.add(it.slug)
      }
    }
    return ids
  }

  const regionIds = uniq('regions', d.regions)
  const townIds = uniq('towns', d.towns)
  const categoryIds = uniq('categories', d.categories)
  const businessIds = uniq('businesses', d.businesses)
  const productIds = uniq('products', d.products)
  const serviceIds = uniq('services', d.services)
  const userIds = uniq('users', d.users, false)
  const enquiryIds = uniq('enquiries', d.enquiries, false)
  uniq('activities', d.activities, false)

  const townById = new Map(d.towns.map((t) => [t.id, t]))
  const catById = new Map(d.categories.map((c) => [c.id, c]))
  const bizById = new Map(d.businesses.map((b) => [b.id, b]))

  // categories
  for (const c of d.categories) {
    if (c.parentId && !categoryIds.has(c.parentId)) err('categories', `${c.name}: missing parent ${c.parentId}`)
    let cur = c
    const seen = new Set<string>()
    while (cur.parentId) {
      if (seen.has(cur.id)) {
        err('categories', `${c.name}: parent cycle`)
        break
      }
      seen.add(cur.id)
      const p = catById.get(cur.parentId)
      if (!p) break
      cur = p
    }
  }
  const catNames = new Set<string>()
  for (const c of d.categories) {
    const k = c.name.toLowerCase()
    if (catNames.has(k)) err('categories', `Duplicate category name "${c.name}"`)
    catNames.add(k)
  }

  // locations
  for (const t of d.towns) {
    if (!regionIds.has(t.regionId)) err('towns', `${t.name}: missing region ${t.regionId}`)
    if (!inBotswana(t.lat, t.lng)) err('towns', `${t.name}: coordinates outside Botswana (${t.lat}, ${t.lng})`)
  }
  for (const r of d.regions) {
    if (!inBotswana(r.lat, r.lng)) err('regions', `${r.name}: centre outside Botswana`)
  }

  // businesses
  for (const b of d.businesses) {
    const where = `businesses/${b.id}`
    if (!APPROVAL.includes(b.approvalStatus)) err(where, `Invalid approvalStatus "${b.approvalStatus}"`)
    if (!LISTING.includes(b.listingStatus)) err(where, `Invalid listingStatus "${b.listingStatus}"`)
    if (!VERIFICATION.includes(b.verificationStatus)) err(where, `Invalid verificationStatus "${b.verificationStatus}"`)
    if (!b.categoryIds.length) err(where, 'No categories')
    for (const c of b.categoryIds) if (!categoryIds.has(c)) err(where, `Missing category ${c}`)
    if (!regionIds.has(b.regionId)) err(where, `Missing region ${b.regionId}`)
    const town = townById.get(b.townId)
    if (!town) err(where, `Missing town ${b.townId}`)
    else {
      if (town.regionId !== b.regionId) err(where, `Region ${b.regionId} does not contain town ${town.name}`)
      if (!inBotswana(b.lat, b.lng)) err(where, `Coordinates outside Botswana (${b.lat}, ${b.lng})`)
      else if (haversineKm(b.lat, b.lng, town.lat, town.lng) > 12) warn(where, `${b.name} is more than 12 km from ${town.name}`)
    }
    if (b.ownerUserId && !userIds.has(b.ownerUserId)) err(where, `Missing owner ${b.ownerUserId}`)
    if (b.approvalStatus === 'approved' && b.listingStatus === 'published' && b.rejectionReason) warn(where, 'Published business still carries a rejection reason')
    if (b.updatedAt < b.createdAt) err(where, 'updatedAt is earlier than createdAt')
  }
  const coord = new Map<string, string>()
  for (const b of d.businesses) {
    const k = `${b.lat.toFixed(5)},${b.lng.toFixed(5)}`
    if (coord.has(k)) warn('businesses', `${b.name} shares coordinates with ${coord.get(k)}`)
    coord.set(k, b.name)
  }

  // products
  for (const p of d.products) {
    const where = `products/${p.id}`
    const biz = bizById.get(p.businessId)
    if (!biz) err(where, `Missing business ${p.businessId}`)
    if (!categoryIds.has(p.categoryId)) err(where, `Missing category ${p.categoryId}`)
    if (!PUBLICATION.includes(p.publicationStatus)) err(where, `Invalid publicationStatus "${p.publicationStatus}"`)
    if (!PRICE_TYPES.includes(p.priceType)) err(where, `Invalid priceType "${p.priceType}"`)
    if (!AVAILABILITY.includes(p.availability)) err(where, `Invalid availability "${p.availability}"`)
    if (p.priceType === 'quote' && p.price !== undefined) err(where, 'Quote-only product has a price')
    if (p.priceType !== 'quote' && (p.price === undefined || !(p.price > 0))) err(where, 'Priced product has no valid price')
    if (biz && p.updatedAt < p.createdAt) err(where, 'updatedAt is earlier than createdAt')
    if (biz && p.createdAt < biz.createdAt) warn(where, 'Product pre-dates its business')
  }

  // services
  for (const s of d.services) {
    const where = `services/${s.id}`
    if (!bizById.has(s.businessId)) err(where, `Missing business ${s.businessId}`)
    if (!categoryIds.has(s.categoryId)) err(where, `Missing category ${s.categoryId}`)
    if (!PUBLICATION.includes(s.publicationStatus)) err(where, `Invalid publicationStatus "${s.publicationStatus}"`)
    if (!PRICING.includes(s.pricingModel)) err(where, `Invalid pricingModel "${s.pricingModel}"`)
    if (!SVC_AVAIL.includes(s.availability)) err(where, `Invalid availability "${s.availability}"`)
    if (!COVERAGE.includes(s.coverage)) err(where, `Invalid coverage "${s.coverage}"`)
    for (const t of s.townIds) if (!townIds.has(t)) err(where, `Missing town ${t}`)
    for (const r of s.regionIds) if (!regionIds.has(r)) err(where, `Missing region ${r}`)
    if (s.pricingModel === 'quote' && s.price !== undefined) err(where, 'Quote-only service has a price')
    if (s.pricingModel !== 'quote' && (s.price === undefined || !(s.price > 0))) err(where, 'Priced service has no valid price')
    if (s.priceMax !== undefined && s.price !== undefined && s.priceMax < s.price) err(where, 'priceMax below price')
  }

  // users
  for (const u of d.users) {
    for (const id of u.businessIds) {
      const b = bizById.get(id)
      if (!b) err(`users/${u.id}`, `Missing business ${id}`)
      else if (b.ownerUserId !== u.id) err(`users/${u.id}`, `Business ${id} lists a different owner`)
    }
    if (!townIds.has(u.townId)) err(`users/${u.id}`, `Missing town ${u.townId}`)
  }

  // enquiries
  for (const e of d.enquiries) {
    const where = `enquiries/${e.id}`
    if (!bizById.has(e.businessId)) err(where, `Missing business ${e.businessId}`)
    if (e.targetType === 'business' && e.targetId !== e.businessId) err(where, 'Business enquiry targets a different business')
    if (e.targetType === 'product') {
      if (!productIds.has(e.targetId)) err(where, `Missing product ${e.targetId}`)
      else if (d.products.find((p) => p.id === e.targetId)?.businessId !== e.businessId) err(where, 'Product belongs to another business')
    }
    if (e.targetType === 'service') {
      if (!serviceIds.has(e.targetId)) err(where, `Missing service ${e.targetId}`)
      else if (d.services.find((s) => s.id === e.targetId)?.businessId !== e.businessId) err(where, 'Service belongs to another business')
    }
  }
  void enquiryIds

  // activity
  const entityExists: Record<string, Set<string>> = {
    business: businessIds, product: productIds, service: serviceIds, user: userIds, enquiry: enquiryIds,
    category: categoryIds, region: regionIds, town: townIds,
  }
  for (const a of d.activities) {
    const set = entityExists[a.entityType]
    if (set && !set.has(a.entityId)) warn(`activities/${a.id}`, `Refers to missing ${a.entityType} ${a.entityId}`)
  }

  return issues
}
