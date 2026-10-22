import { haversineKm } from '../geo'
import type { Index } from '../store/indexes'
import { businessCategories } from '../store/indexes'
import type { Business, Product, Service } from '../types'
import { normalize, stem, tokenize } from './normalize'

// ───────────────────────── text indexes ─────────────────────────

interface Entry<T> {
  item: T
  /** normalised primary name */
  name: string
  /** normalised searchable text (name + description + taxonomy + location + catalogue keywords) */
  text: string
}

interface TextIndexes {
  businesses: Entry<Business>[]
  products: Entry<Product>[]
  services: Entry<Service>[]
}

const cache = new WeakMap<Index, TextIndexes>()

function categoryNames(idx: Index, categoryId: string): string {
  const c = idx.categoryById.get(categoryId)
  if (!c) return ''
  const parent = c.parentId ? idx.categoryById.get(c.parentId) : undefined
  return `${c.name} ${parent?.name ?? ''}`
}

export function textIndexes(idx: Index): TextIndexes {
  const hit = cache.get(idx)
  if (hit) return hit

  const businesses = idx.publicBusinesses.map((b) => {
    const town = idx.townById.get(b.townId)?.name ?? ''
    const region = idx.regionById.get(b.regionId)?.name ?? ''
    const cats = businessCategories(idx, b).map((c) => categoryNames(idx, c.id)).join(' ')
    const catalogue = [
      ...(idx.productsByBusiness.get(b.id) ?? []).filter((p) => p.publicationStatus === 'published').map((p) => p.name),
      ...(idx.servicesByBusiness.get(b.id) ?? []).filter((s) => s.publicationStatus === 'published').map((s) => s.name),
    ].join(' ')
    return {
      item: b,
      name: normalize(b.name),
      text: normalize(`${b.name} ${b.shortDescription} ${b.description} ${cats} ${town} ${region} ${b.businessType} ${b.address} ${catalogue}`),
    }
  })

  const products = idx.publicProducts.map((p) => {
    const biz = idx.businessById.get(p.businessId)
    const town = biz ? idx.townById.get(biz.townId)?.name ?? '' : ''
    const region = biz ? idx.regionById.get(biz.regionId)?.name ?? '' : ''
    const specs = p.specifications.map((s) => s.value).join(' ')
    return {
      item: p,
      name: normalize(p.name),
      text: normalize(`${p.name} ${p.description} ${categoryNames(idx, p.categoryId)} ${biz?.name ?? ''} ${town} ${region} ${p.sku} ${specs}`),
    }
  })

  const services = idx.publicServices.map((s) => {
    const biz = idx.businessById.get(s.businessId)
    const towns = s.townIds.map((t) => idx.townById.get(t)?.name ?? '').join(' ')
    return {
      item: s,
      name: normalize(s.name),
      text: normalize(`${s.name} ${s.description} ${categoryNames(idx, s.categoryId)} ${biz?.name ?? ''} ${towns} ${s.serviceAreaNote}`),
    }
  })

  const out = { businesses, products, services }
  cache.set(idx, out)
  return out
}

// ───────────────────────── scoring ─────────────────────────

function ladder(entry: { name: string; text: string }, tok: string, scale: number): number {
  if (entry.name === tok) return 100 * scale
  if (entry.name.startsWith(tok)) return 70 * scale
  if (entry.name.includes(` ${tok}`)) return 55 * scale
  if (entry.name.includes(tok)) return 35 * scale
  if (entry.text.includes(` ${tok}`) || entry.text.startsWith(tok)) return 12 * scale
  if (entry.text.includes(tok)) return 6 * scale
  return 0
}

function tokenScore(entry: { name: string; text: string }, tok: string): number {
  const direct = ladder(entry, tok, 1)
  if (direct) return direct
  const s = stem(tok)
  return s !== tok ? ladder(entry, s, 0.8) : 0
}

/** All tokens must match somewhere (AND); the score rewards name matches and whole-phrase matches. */
function scoreEntry(entry: { name: string; text: string }, tokens: string[], phrase: string): number | null {
  let score = 0
  for (const tok of tokens) {
    const s = tokenScore(entry, tok)
    if (!s) return null
    score += s
  }
  if (tokens.length > 1 && entry.name.includes(phrase)) score += 40
  return score
}

export interface Hit<T> {
  item: T
  score: number
  distanceKm?: number
}

// ───────────────────────── queries ─────────────────────────

export interface BusinessQuery {
  q: string
  category: string
  region: string
  town: string
  verified: string // '' | 'verified' | 'unverified'
  type: string
  sort: string // relevance | name | newest | products | distance
  near: string // town slug used as a reference point
}
export const BUSINESS_DEFAULTS: BusinessQuery = { q: '', category: '', region: '', town: '', verified: '', type: '', sort: '', near: '' }

export interface ProductQuery {
  q: string
  category: string
  region: string
  town: string
  availability: string
  price: string // '' | 'priced' | 'quote'
  min: string
  max: string
  supplier: string // business slug
  sort: string // relevance | name | newest | price-asc | price-desc
}
export const PRODUCT_DEFAULTS: ProductQuery = { q: '', category: '', region: '', town: '', availability: '', price: '', min: '', max: '', supplier: '', sort: '' }

export interface ServiceQuery {
  q: string
  category: string
  region: string
  town: string
  availability: string
  price: string
  coverage: string
  provider: string // business slug
  sort: string // relevance | name | newest | price-asc | price-desc
}
export const SERVICE_DEFAULTS: ServiceQuery = { q: '', category: '', region: '', town: '', availability: '', price: '', coverage: '', provider: '', sort: '' }

function categorySet(idx: Index, slug: string): Set<string> | null {
  if (!slug) return null
  const cat = idx.categoryBySlug.get(slug)
  return cat ? idx.categoryTree.get(cat.id) ?? new Set([cat.id]) : new Set<string>()
}

function regionId(idx: Index, slug: string): string | null {
  if (!slug) return null
  return idx.regionBySlug.get(slug)?.id ?? '__none__'
}

function townId(idx: Index, slug: string): string | null {
  if (!slug) return null
  return idx.townBySlug.get(slug)?.id ?? '__none__'
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
const byName = (a: string, b: string) => collator.compare(a, b)

export function searchBusinesses(idx: Index, query: BusinessQuery): Hit<Business>[] {
  const tokens = tokenize(query.q)
  const phrase = tokens.join(' ')
  const cats = categorySet(idx, query.category)
  const region = regionId(idx, query.region)
  const town = townId(idx, query.town)
  const near = query.near ? idx.townBySlug.get(query.near) : undefined
  const hits: Hit<Business>[] = []

  for (const entry of textIndexes(idx).businesses) {
    const b = entry.item
    if (cats && !b.categoryIds.some((c) => cats.has(c))) continue
    if (region && b.regionId !== region) continue
    if (town && b.townId !== town) continue
    if (query.verified === 'verified' && b.verificationStatus !== 'verified') continue
    if (query.verified === 'unverified' && b.verificationStatus === 'verified') continue
    if (query.type && b.businessType !== query.type) continue
    let score = 0
    if (tokens.length) {
      const s = scoreEntry(entry, tokens, phrase)
      if (s === null) continue
      score = s
    }
    hits.push({ item: b, score, distanceKm: near ? haversineKm(near.lat, near.lng, b.lat, b.lng) : undefined })
  }

  const sort = query.sort === 'distance' && !near ? '' : query.sort
  hits.sort((a, b) => {
    switch (sort) {
      case 'name':
        return byName(a.item.name, b.item.name)
      case 'newest':
        return b.item.createdAt.localeCompare(a.item.createdAt) || byName(a.item.name, b.item.name)
      case 'products':
        return (idx.publicProductCount.get(b.item.id) ?? 0) - (idx.publicProductCount.get(a.item.id) ?? 0) || byName(a.item.name, b.item.name)
      case 'distance':
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      default: {
        // relevance: text score first; ties (or no query) favour featured, verified, richer catalogues
        if (b.score !== a.score) return b.score - a.score
        const rank = (h: Hit<Business>) => (h.item.featured ? 4 : 0) + (h.item.verificationStatus === 'verified' ? 2 : 0)
        return rank(b) - rank(a) || (idx.publicProductCount.get(b.item.id) ?? 0) - (idx.publicProductCount.get(a.item.id) ?? 0) || byName(a.item.name, b.item.name)
      }
    }
  })
  return hits
}

export function searchProducts(idx: Index, query: ProductQuery): Hit<Product>[] {
  const tokens = tokenize(query.q)
  const phrase = tokens.join(' ')
  const cats = categorySet(idx, query.category)
  const region = regionId(idx, query.region)
  const town = townId(idx, query.town)
  const supplier = query.supplier ? idx.businessBySlug.get(query.supplier) : undefined
  const min = query.min !== '' ? Number(query.min) : null
  const max = query.max !== '' ? Number(query.max) : null
  const hits: Hit<Product>[] = []

  for (const entry of textIndexes(idx).products) {
    const p = entry.item
    const biz = idx.businessById.get(p.businessId)
    if (!biz) continue
    if (query.supplier && biz.id !== supplier?.id) continue
    if (cats && !cats.has(p.categoryId)) continue
    if (region && biz.regionId !== region) continue
    if (town && biz.townId !== town) continue
    if (query.availability && p.availability !== query.availability) continue
    if (query.price === 'quote' && p.priceType !== 'quote') continue
    if (query.price === 'priced' && p.priceType === 'quote') continue
    if (min !== null && Number.isFinite(min) && (p.price === undefined || p.price < min)) continue
    if (max !== null && Number.isFinite(max) && (p.price === undefined || p.price > max)) continue
    let score = 0
    if (tokens.length) {
      const s = scoreEntry(entry, tokens, phrase)
      if (s === null) continue
      score = s
    }
    hits.push({ item: p, score })
  }

  hits.sort((a, b) => {
    switch (query.sort) {
      case 'name':
        return byName(a.item.name, b.item.name)
      case 'newest':
        return b.item.createdAt.localeCompare(a.item.createdAt) || byName(a.item.name, b.item.name)
      case 'price-asc':
        return (a.item.price ?? Infinity) - (b.item.price ?? Infinity) || byName(a.item.name, b.item.name)
      case 'price-desc':
        return (b.item.price ?? -Infinity) - (a.item.price ?? -Infinity) || byName(a.item.name, b.item.name)
      default:
        return b.score - a.score || stockRank(b.item) - stockRank(a.item) || byName(a.item.name, b.item.name)
    }
  })
  return hits
}

function stockRank(p: Product): number {
  return { in_stock: 3, low_stock: 2, seasonal: 1, made_to_order: 1, out_of_stock: 0 }[p.availability]
}

export function searchServices(idx: Index, query: ServiceQuery): Hit<Service>[] {
  const tokens = tokenize(query.q)
  const phrase = tokens.join(' ')
  const cats = categorySet(idx, query.category)
  const region = regionId(idx, query.region)
  const town = townId(idx, query.town)
  const provider = query.provider ? idx.businessBySlug.get(query.provider) : undefined
  const hits: Hit<Service>[] = []

  for (const entry of textIndexes(idx).services) {
    const s = entry.item
    const biz = idx.businessById.get(s.businessId)
    if (!biz) continue
    if (query.provider && biz.id !== provider?.id) continue
    if (cats && !cats.has(s.categoryId)) continue
    // Location uses the service area, not just the provider's address.
    if (region && !(s.coverage === 'nationwide' || s.regionIds.includes(region))) continue
    if (town) {
      const t = idx.townById.get(town)
      const served = s.coverage === 'nationwide' || s.townIds.includes(town) || (s.coverage === 'regional' && !!t && s.regionIds.includes(t.regionId))
      if (!served) continue
    }
    if (query.availability && s.availability !== query.availability) continue
    if (query.price === 'quote' && s.pricingModel !== 'quote') continue
    if (query.price === 'priced' && s.pricingModel === 'quote') continue
    if (query.coverage && s.coverage !== query.coverage) continue
    let score = 0
    if (tokens.length) {
      const sc = scoreEntry(entry, tokens, phrase)
      if (sc === null) continue
      score = sc
    }
    hits.push({ item: s, score })
  }

  hits.sort((a, b) => {
    switch (query.sort) {
      case 'name':
        return byName(a.item.name, b.item.name)
      case 'newest':
        return b.item.createdAt.localeCompare(a.item.createdAt) || byName(a.item.name, b.item.name)
      case 'price-asc':
        return (a.item.price ?? Infinity) - (b.item.price ?? Infinity) || byName(a.item.name, b.item.name)
      case 'price-desc':
        return (b.item.price ?? -Infinity) - (a.item.price ?? -Infinity) || byName(a.item.name, b.item.name)
      default:
        return b.score - a.score || availRank(b.item) - availRank(a.item) || byName(a.item.name, b.item.name)
    }
  })
  return hits
}

function availRank(s: Service): number {
  return { available: 3, limited: 2, waitlist: 1, unavailable: 0 }[s.availability]
}

// ───────────────────────── unified search & suggestions ─────────────────────────

export interface UnifiedResults {
  businesses: Hit<Business>[]
  products: Hit<Product>[]
  services: Hit<Service>[]
  categories: { slug: string; name: string }[]
  towns: { slug: string; name: string; region: string }[]
  total: number
}

export interface SearchScope {
  category?: string
  region?: string
  town?: string
}

/** One query across businesses, products and services; the optional scope narrows all three the same way. */
export function unifiedSearch(idx: Index, q: string, scope: SearchScope = {}): UnifiedResults {
  const tokens = tokenize(q)
  const facets = { category: scope.category ?? '', region: scope.region ?? '', town: scope.town ?? '' }
  const businesses = searchBusinesses(idx, { ...BUSINESS_DEFAULTS, q, ...facets })
  const products = searchProducts(idx, { ...PRODUCT_DEFAULTS, q, ...facets })
  const services = searchServices(idx, { ...SERVICE_DEFAULTS, q, ...facets })
  const phrase = tokens.join(' ')
  const categories = tokens.length
    ? idx.data.categories.filter((c) => c.enabled && tokens.every((t) => normalize(c.name).includes(t) || normalize(c.name).includes(stem(t)))).map((c) => ({ slug: c.slug, name: c.name }))
    : []
  const towns = tokens.length
    ? idx.data.towns
        .filter((t) => t.enabled && normalize(t.name).includes(phrase))
        .map((t) => ({ slug: t.slug, name: t.name, region: idx.regionById.get(t.regionId)?.name ?? '' }))
    : []
  return { businesses, products, services, categories, towns, total: businesses.length + products.length + services.length }
}

export interface Suggestion {
  type: 'business' | 'product' | 'service' | 'category' | 'town'
  label: string
  sub: string
  href: string
}

/** Fast typeahead: best few matches per type, navigating straight to the record. */
export function suggest(idx: Index, q: string, perType = 3): Suggestion[] {
  const tokens = tokenize(q)
  if (!tokens.length) return []
  const phrase = tokens.join(' ')
  const t = textIndexes(idx)
  const top = <T,>(entries: Entry<T>[], max: number): T[] => {
    const scored: { item: T; s: number }[] = []
    for (const e of entries) {
      const s = scoreEntry(e, tokens, phrase)
      if (s !== null) scored.push({ item: e.item, s })
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, max).map((x) => x.item)
  }
  const out: Suggestion[] = []
  const townName = (id: string) => idx.townById.get(id)?.name ?? ''
  for (const c of idx.data.categories) {
    if (c.enabled && tokens.every((tok) => normalize(c.name).includes(tok) || normalize(c.name).includes(stem(tok)))) out.push({ type: 'category', label: c.name, sub: 'Category', href: `/categories/${c.slug}` })
  }
  for (const tw of idx.data.towns) {
    if (tw.enabled && normalize(tw.name).startsWith(phrase)) out.push({ type: 'town', label: tw.name, sub: `Town · ${idx.regionById.get(tw.regionId)?.name ?? ''}`, href: `/towns/${tw.slug}` })
  }
  for (const b of top(t.businesses, perType)) out.push({ type: 'business', label: b.name, sub: `Business · ${townName(b.townId)}`, href: `/businesses/${b.slug}` })
  for (const p of top(t.products, perType)) out.push({ type: 'product', label: p.name, sub: `Product · ${idx.businessById.get(p.businessId)?.name ?? ''}`, href: `/products/${p.slug}` })
  for (const s of top(t.services, perType)) out.push({ type: 'service', label: s.name, sub: `Service · ${idx.businessById.get(s.businessId)?.name ?? ''}`, href: `/services/${s.slug}` })
  return out.slice(0, perType * 3 + 3)
}

// ───────────────────────── pagination ─────────────────────────

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
  total: number
  from: number
  to: number
  size: number
}

export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), pageCount)
  const start = (current - 1) * size
  const slice = items.slice(start, start + size)
  return { items: slice, page: current, pageCount, total, from: total ? start + 1 : 0, to: start + slice.length, size }
}
