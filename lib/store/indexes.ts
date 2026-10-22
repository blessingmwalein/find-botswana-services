import { isBusinessPublic, isProductPublic, isServicePublic } from '../rules'
import type { Business, Category, Dataset, Enquiry, Product, Region, Service, Town, User } from '../types'

/**
 * Lookup maps and derived lists built once per dataset version.
 * Every page reads relationships through this index so the whole app shares one source of truth.
 */
export interface Index {
  data: Dataset
  businessById: Map<string, Business>
  businessBySlug: Map<string, Business>
  productById: Map<string, Product>
  productBySlug: Map<string, Product>
  serviceById: Map<string, Service>
  serviceBySlug: Map<string, Service>
  categoryById: Map<string, Category>
  categoryBySlug: Map<string, Category>
  regionById: Map<string, Region>
  regionBySlug: Map<string, Region>
  townById: Map<string, Town>
  townBySlug: Map<string, Town>
  userById: Map<string, User>
  productsByBusiness: Map<string, Product[]>
  servicesByBusiness: Map<string, Service[]>
  enquiriesByBusiness: Map<string, Enquiry[]>
  townsByRegion: Map<string, Town[]>
  /** Category id → ids of itself and all descendants. */
  categoryTree: Map<string, Set<string>>
  publicBusinesses: Business[]
  publicProducts: Product[]
  publicServices: Service[]
  publicProductCount: Map<string, number>
  publicServiceCount: Map<string, number>
}

const cache = new WeakMap<Dataset, Index>()

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export function getIndex(data: Dataset): Index {
  const hit = cache.get(data)
  if (hit) return hit

  const businessById = new Map(data.businesses.map((b) => [b.id, b]))
  const productsByBusiness = new Map<string, Product[]>()
  const servicesByBusiness = new Map<string, Service[]>()
  const enquiriesByBusiness = new Map<string, Enquiry[]>()
  for (const p of data.products) push(productsByBusiness, p.businessId, p)
  for (const s of data.services) push(servicesByBusiness, s.businessId, s)
  for (const e of data.enquiries) push(enquiriesByBusiness, e.businessId, e)

  const townsByRegion = new Map<string, Town[]>()
  for (const t of data.towns) push(townsByRegion, t.regionId, t)

  const children = new Map<string, string[]>()
  for (const c of data.categories) if (c.parentId) push(children, c.parentId, c.id)
  const categoryTree = new Map<string, Set<string>>()
  const collect = (id: string, acc: Set<string>) => {
    acc.add(id)
    for (const child of children.get(id) ?? []) if (!acc.has(child)) collect(child, acc)
  }
  for (const c of data.categories) {
    const acc = new Set<string>()
    collect(c.id, acc)
    categoryTree.set(c.id, acc)
  }

  const publicBusinesses = data.businesses.filter(isBusinessPublic)
  const publicProducts = data.products.filter((p) => isProductPublic(p, businessById.get(p.businessId)))
  const publicServices = data.services.filter((s) => isServicePublic(s, businessById.get(s.businessId)))
  const publicProductCount = new Map<string, number>()
  const publicServiceCount = new Map<string, number>()
  for (const p of publicProducts) publicProductCount.set(p.businessId, (publicProductCount.get(p.businessId) ?? 0) + 1)
  for (const s of publicServices) publicServiceCount.set(s.businessId, (publicServiceCount.get(s.businessId) ?? 0) + 1)

  const idx: Index = {
    data,
    businessById,
    businessBySlug: new Map(data.businesses.map((b) => [b.slug, b])),
    productById: new Map(data.products.map((p) => [p.id, p])),
    productBySlug: new Map(data.products.map((p) => [p.slug, p])),
    serviceById: new Map(data.services.map((s) => [s.id, s])),
    serviceBySlug: new Map(data.services.map((s) => [s.slug, s])),
    categoryById: new Map(data.categories.map((c) => [c.id, c])),
    categoryBySlug: new Map(data.categories.map((c) => [c.slug, c])),
    regionById: new Map(data.regions.map((r) => [r.id, r])),
    regionBySlug: new Map(data.regions.map((r) => [r.slug, r])),
    townById: new Map(data.towns.map((t) => [t.id, t])),
    townBySlug: new Map(data.towns.map((t) => [t.slug, t])),
    userById: new Map(data.users.map((u) => [u.id, u])),
    productsByBusiness,
    servicesByBusiness,
    enquiriesByBusiness,
    townsByRegion,
    categoryTree,
    publicBusinesses,
    publicProducts,
    publicServices,
    publicProductCount,
    publicServiceCount,
  }
  cache.set(data, idx)
  return idx
}

// ───────────────────────── small relationship helpers ─────────────────────────

export function primaryCategory(idx: Index, b: Business): Category | undefined {
  return idx.categoryById.get(b.categoryIds[0])
}

export function businessCategories(idx: Index, b: Business): Category[] {
  return b.categoryIds.map((id) => idx.categoryById.get(id)).filter((c): c is Category => !!c)
}

export function parentCategories(idx: Index): Category[] {
  return idx.data.categories.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function childCategories(idx: Index, parentId: string): Category[] {
  return idx.data.categories.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** "Gaborone, South-East" */
export function locationLabel(idx: Index, regionId: string, townId: string): string {
  const town = idx.townById.get(townId)
  const region = idx.regionById.get(regionId)
  return [town?.name, region?.name].filter(Boolean).join(', ')
}

/** Number of public listings (businesses) in a category, including sub-categories. */
export function publicBusinessesInCategory(idx: Index, categoryId: string): Business[] {
  const ids = idx.categoryTree.get(categoryId)
  if (!ids) return []
  return idx.publicBusinesses.filter((b) => b.categoryIds.some((c) => ids.has(c)))
}
