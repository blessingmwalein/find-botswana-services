import type { Business, Product, Service } from '../types'
import type { Index } from './indexes'

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

const memo = new WeakMap<Index, Map<string, unknown>>()
function cached<T>(idx: Index, key: string, build: () => T): T {
  let m = memo.get(idx)
  if (!m) {
    m = new Map()
    memo.set(idx, m)
  }
  if (!m.has(key)) m.set(key, build())
  return m.get(key) as T
}

/** Featured businesses first (verified, richer catalogues ahead), then verified businesses to fill the row. */
export function featuredBusinesses(idx: Index, limit: number): Business[] {
  const ranked = cached(idx, 'featured', () => {
    const rank = (b: Business) => (b.featured ? 100 : 0) + (b.verificationStatus === 'verified' ? 20 : 0) + Math.min(idx.publicProductCount.get(b.id) ?? 0, 19)
    return idx.publicBusinesses.slice().sort((a, b) => rank(b) - rank(a) || collator.compare(a.name, b.name))
  })
  return ranked.slice(0, limit)
}

export function recentBusinesses(idx: Index, limit: number): Business[] {
  const ranked = cached(idx, 'recent', () => idx.publicBusinesses.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || collator.compare(a.name, b.name)))
  return ranked.slice(0, limit)
}

function enquiryCounts(idx: Index): Map<string, number> {
  return cached(idx, 'enquiryCounts', () => {
    const m = new Map<string, number>()
    for (const e of idx.data.enquiries) m.set(e.targetId, (m.get(e.targetId) ?? 0) + 1)
    return m
  })
}

/** "Popular" = most enquired-about, then products from featured/verified suppliers that are in stock. */
export function popularProducts(idx: Index, limit: number): Product[] {
  const ranked = cached(idx, 'popularProducts', () => {
    const counts = enquiryCounts(idx)
    const score = (p: Product) => {
      const biz = idx.businessById.get(p.businessId)
      return (counts.get(p.id) ?? 0) * 5 + (biz?.featured ? 3 : 0) + (biz?.verificationStatus === 'verified' ? 2 : 0) + (p.availability === 'in_stock' ? 1 : 0) + (p.priceType !== 'quote' ? 0.5 : 0)
    }
    return idx.publicProducts.slice().sort((a, b) => score(b) - score(a) || collator.compare(a.name, b.name))
  })
  // Avoid showing the same supplier more than twice in a short list.
  const out: Product[] = []
  const perSupplier = new Map<string, number>()
  for (const p of ranked) {
    const n = perSupplier.get(p.businessId) ?? 0
    if (n >= 2) continue
    perSupplier.set(p.businessId, n + 1)
    out.push(p)
    if (out.length >= limit) break
  }
  return out
}

export function featuredServices(idx: Index, limit: number): Service[] {
  const ranked = cached(idx, 'featuredServices', () => {
    const counts = enquiryCounts(idx)
    const score = (s: Service) => {
      const biz = idx.businessById.get(s.businessId)
      return (counts.get(s.id) ?? 0) * 5 + (biz?.featured ? 3 : 0) + (biz?.verificationStatus === 'verified' ? 2 : 0) + (s.availability === 'available' ? 1 : 0) + (s.pricingModel !== 'quote' ? 0.5 : 0)
    }
    return idx.publicServices.slice().sort((a, b) => score(b) - score(a) || collator.compare(a.name, b.name))
  })
  const out: Service[] = []
  const perProvider = new Map<string, number>()
  for (const s of ranked) {
    const n = perProvider.get(s.businessId) ?? 0
    if (n >= 1) continue
    perProvider.set(s.businessId, n + 1)
    out.push(s)
    if (out.length >= limit) break
  }
  return out
}

/** Public business count per category, including sub-categories (a parent counts its children's businesses once). */
export function categoryBusinessCounts(idx: Index): Map<string, number> {
  return cached(idx, 'categoryCounts', () => {
    const m = new Map<string, number>()
    for (const c of idx.data.categories) {
      const ids = idx.categoryTree.get(c.id)!
      m.set(c.id, idx.publicBusinesses.filter((b) => b.categoryIds.some((id) => ids.has(id))).length)
    }
    return m
  })
}

export function regionBusinessCounts(idx: Index): Map<string, number> {
  return cached(idx, 'regionCounts', () => {
    const m = new Map<string, number>()
    for (const b of idx.publicBusinesses) m.set(b.regionId, (m.get(b.regionId) ?? 0) + 1)
    return m
  })
}

export function townBusinessCounts(idx: Index): Map<string, number> {
  return cached(idx, 'townCounts', () => {
    const m = new Map<string, number>()
    for (const b of idx.publicBusinesses) m.set(b.townId, (m.get(b.townId) ?? 0) + 1)
    return m
  })
}

/** Products related to a product: same category first, then same supplier, never itself. */
export function relatedProducts(idx: Index, p: Product, limit: number): Product[] {
  const score = (o: Product) => (o.categoryId === p.categoryId ? 10 : 0) + (o.businessId === p.businessId ? 4 : 0)
  return idx.publicProducts
    .filter((o) => o.id !== p.id && score(o) >= 10)
    .sort((a, b) => score(b) - score(a) || (a.businessId === p.businessId ? -1 : 0) || collator.compare(a.name, b.name))
    .slice(0, limit)
}

export function relatedServices(idx: Index, s: Service, limit: number): Service[] {
  return idx.publicServices
    .filter((o) => o.id !== s.id && o.categoryId === s.categoryId)
    .sort((a, b) => (b.businessId === s.businessId ? 1 : 0) - (a.businessId === s.businessId ? 1 : 0) || collator.compare(a.name, b.name))
    .slice(0, limit)
}

/** Other public businesses in the same primary category, nearest town first. */
export function relatedBusinesses(idx: Index, b: Business, limit: number): Business[] {
  const cat = b.categoryIds[0]
  return idx.publicBusinesses
    .filter((o) => o.id !== b.id && o.categoryIds.includes(cat))
    .sort((x, y) => (y.regionId === b.regionId ? 1 : 0) - (x.regionId === b.regionId ? 1 : 0) || (y.townId === b.townId ? 1 : 0) - (x.townId === b.townId ? 1 : 0) || collator.compare(x.name, y.name))
    .slice(0, limit)
}
