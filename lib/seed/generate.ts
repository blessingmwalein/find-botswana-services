import { haversineKm, offsetPoint } from '../geo'
import type {
  Activity,
  ApprovalStatus,
  ArtRef,
  Business,
  BusinessType,
  DayHours,
  Dataset,
  Enquiry,
  EnquiryStatus,
  EnquiryTarget,
  ListingStatus,
  OpeningHours,
  Product,
  ProductAvailability,
  PublicationStatus,
  Service,
  ServiceAvailability,
  ServiceCoverage,
  Settings,
  Town,
  ToneKey,
  User,
} from '../types'
import { BRANDABLE, PACKS, PACK_BY_SLUG, RELATED } from './catalog'
import { SVC_MODEL, type CategoryPack, type ProdTpl, type SvcTpl } from './catalog/types'
import { CATEGORIES } from './categories'
import { REGIONS, TOWNS } from './locations'
import {
  BUSINESS_ENQUIRY_MESSAGES,
  CHANGE_REQUESTS,
  FIRST_NAMES,
  PREFIXES,
  PRODUCT_ENQUIRY_MESSAGES,
  REJECTION_REASONS,
  SERVICE_ENQUIRY_MESSAGES,
  SURNAMES,
} from './names'
import { Rng, slugify } from './prng'

// ───────────────────────── configuration ─────────────────────────

export const SEED_VALUE = 20260401
/** The seed world's "now". All seeded timestamps are absolute and relative to this anchor. */
export const SEED_ANCHOR = '2026-10-15T08:00:00.000Z'
const ANCHOR_MS = Date.parse(SEED_ANCHOR)
const DAY = 86_400_000

export const TARGETS = {
  businesses: 300,
  products: 1500,
  services: 450,
  users: 30,
  enquiries: 150,
  activities: 250,
}

const TONES: ToneKey[] = ['sage', 'sand', 'clay', 'sky', 'mist', 'stone']

const iso = (ms: number) => new Date(ms).toISOString()
const daysAgo = (d: number) => ANCHOR_MS - d * DAY

// ───────────────────────── curated businesses ─────────────────────────
// The sixteen businesses from the original prototype are retained as curated seeds.

type CuratedState = 'published' | 'pending' | 'draft'
interface Curated {
  name: string
  cats: string[]
  town: string
  short: string
  verified: boolean
  state: CuratedState
  featured?: boolean
  owner?: string
  /** Restrict the generated catalogue to these packs (category membership is unaffected). */
  catalog?: string[]
}

const CURATED: Curated[] = [
  { name: 'Kgale Building Centre', cats: ['construction-hardware'], town: 'gaborone', short: 'Reliable building materials, tools and expert advice for projects of every scale.', verified: true, state: 'published', featured: true },
  { name: 'Metsi Agri Supplies', cats: ['agriculture-farming', 'irrigation-livestock'], town: 'francistown', short: 'Quality seed, irrigation equipment and practical farm solutions for Botswana.', verified: true, state: 'published', featured: true },
  { name: 'Tholo Fresh Market', cats: ['food-groceries'], town: 'maun', short: 'Fresh produce, pantry essentials and wholesale grocery supply.', verified: false, state: 'published' },
  { name: 'Okavango Solar Works', cats: ['solar-renewable', 'electronics-technology'], town: 'maun', short: 'Solar systems, backup power and professional installation for homes and businesses.', verified: true, state: 'published', featured: true, owner: 'Naledi Molefe', catalog: ['solar-renewable'] },
  { name: 'Tati Fleet Services', cats: ['automotive-transport'], town: 'francistown', short: 'Dependable fleet maintenance, vehicle parts and transport solutions.', verified: false, state: 'pending', owner: 'Thabo Kgosidintsi' },
  { name: 'Kalahari Advisory', cats: ['professional-services', 'legal-accounting'], town: 'gaborone', short: 'Business, accounting and compliance support for growing local companies.', verified: true, state: 'published' },
  { name: 'Chobe Safari Outfitters', cats: ['tourism-hospitality', 'safari-lodges-tours'], town: 'kasane', short: 'Curated safari transport, guiding and accommodation experiences.', verified: true, state: 'published', featured: true },
  { name: 'Palapye Home & Garden', cats: ['home-garden'], town: 'palapye', short: 'Practical home improvement, garden supplies and local delivery.', verified: false, state: 'published' },
  { name: 'Serowe Learning Hub', cats: ['education-training'], town: 'serowe', short: 'Skills development, tutoring and professional short courses.', verified: true, state: 'published' },
  { name: 'Kanye Health Pharmacy', cats: ['health-wellness'], town: 'kanye', short: 'Trusted wellness products and community pharmacy services.', verified: true, state: 'published' },
  { name: 'Lobatse Leather Works', cats: ['fashion-retail'], town: 'lobatse', short: 'Handcrafted leather goods made locally in Botswana.', verified: false, state: 'draft', owner: 'Thabo Kgosidintsi' },
  { name: 'Central Mining Logistics', cats: ['mining-energy'], town: 'palapye', short: 'Equipment logistics and field support for energy and mining operators.', verified: true, state: 'published' },
  { name: 'Gaborone Digital Studio', cats: ['professional-services', 'ict-computer-services'], town: 'gaborone', short: 'Brand, web and digital product support for ambitious teams.', verified: true, state: 'published', featured: true },
  { name: 'Maun Fresh Produce Co', cats: ['food-groceries', 'butcheries-produce'], town: 'maun', short: 'Reliable farm-to-market produce supply for hospitality and retailers.', verified: false, state: 'published' },
  { name: 'Francistown Auto Parts', cats: ['automotive-transport', 'vehicle-repair-tyres'], town: 'francistown', short: 'Genuine and aftermarket parts for cars, trucks and equipment.', verified: true, state: 'published' },
  { name: 'Kasane Craft Market', cats: ['fashion-retail'], town: 'kasane', short: 'Locally made crafts, gifts and contemporary design.', verified: false, state: 'published' },
]

// ───────────────────────── helpers ─────────────────────────

function resolveVariant(rng: Rng, name: string): { name: string; mult: number } {
  const m = name.match(/\{([^}]+)\}/)
  if (!m) return { name, mult: 1 }
  const options = m[1].split('|').map((o) => {
    const idx = o.lastIndexOf(':')
    if (idx > 0) {
      const n = Number(o.slice(idx + 1))
      if (!Number.isNaN(n)) return { label: o.slice(0, idx), mult: n }
    }
    return { label: o, mult: 1 }
  })
  const chosen = rng.pick(options)
  return { name: name.replace(m[0], chosen.label).replace(/\s+/g, ' ').trim(), mult: chosen.mult }
}

export function roundPrice(v: number): number {
  if (v < 20) return Math.round(v * 2) / 2
  if (v < 100) return Math.round(v)
  if (v < 500) return Math.round(v / 5) * 5
  if (v < 5000) return Math.round(v / 10) * 10
  if (v < 20000) return Math.round(v / 50) * 50
  return Math.round(v / 100) * 100
}

function pad(n: number, w: number) {
  return String(n).padStart(w, '0')
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !/^(&|and|the|of|\(.*\))$/i.test(w))
  const letters = words.slice(0, 2).map((w) => w.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase())
  return letters.join('') || 'FB'
}

function artFor(rng: Rng, label?: string, tone?: ToneKey): ArtRef {
  return { tone: tone ?? rng.pick(TONES), pattern: rng.int(0, 4) as ArtRef['pattern'], label }
}

// Population-style weights used when placing businesses in towns.
const TOWN_WEIGHT: Record<string, number> = {
  gaborone: 70, francistown: 24, maun: 9, kasane: 4, palapye: 5, serowe: 4, kanye: 3.5, lobatse: 3.5,
  mahalapye: 3, 'selebi-phikwe': 3.5, molepolole: 4.5, mochudi: 3, ramotswa: 1.5, tlokweng: 5, jwaneng: 2.5,
  orapa: 1, letlhakane: 1.5, tutume: 1, shakawe: 1, ghanzi: 2, tsabong: 1, goodhope: 0.6, bobonong: 1,
  tonota: 1.5, letlhakeng: 0.8, mogoditshane: 7, gabane: 1.2, mmopane: 1.2, thamaga: 1.5, nata: 0.8, gweta: 0.5,
  moshupa: 1, masunga: 1, sowa: 0.8, kazungula: 0.8, 'tati-siding': 0.5,
}

// Geographic name words only make sense near the place they evoke.
const GEO_PREFIX: Record<string, string[]> = {
  Kgale: ['south-east', 'kweneng'],
  Tati: ['north-east', 'central'],
  Okavango: ['north-west', 'chobe'],
  Delta: ['north-west', 'chobe'],
  Mokoro: ['north-west'],
  Boteti: ['central', 'north-west'],
  Makgadikgadi: ['central', 'north-west'],
  Limpopo: ['central', 'north-east'],
  Shashe: ['central', 'north-east'],
  Chobe: ['chobe', 'north-west'],
  Zambezi: ['chobe', 'north-west'],
  Notwane: ['south-east', 'kweneng', 'kgatleng'],
  Tswapong: ['central'],
}

const TOURISM_TOWNS = new Set(['maun', 'kasane', 'kazungula', 'nata', 'gweta', 'shakawe', 'gumare', 'seronga', 'toteng', 'ghanzi', 'pandamatenga', 'sehithwa', 'nokaneng', 'tsau'])
const MINING_TOWNS = new Set(['selebi-phikwe', 'orapa', 'jwaneng', 'letlhakane', 'sowa', 'palapye', 'francistown', 'tonota', 'mmadinare', 'bobonong'])
const FARMING_TOWNS = new Set(['ghanzi', 'kanye', 'mahalapye', 'molepolole', 'mochudi', 'tsabong', 'serowe', 'goodhope', 'kang', 'letlhakeng', 'thamaga'])

function townWeight(packSlug: string, t: Town): number {
  let w = TOWN_WEIGHT[t.slug] ?? 0.45
  if (packSlug === 'tourism-hospitality' || packSlug === 'safari-lodges-tours') {
    w = TOURISM_TOWNS.has(t.slug) ? w * 5 : w * 0.55
  } else if (packSlug === 'mining-energy') {
    w = MINING_TOWNS.has(t.slug) ? w * 4 : w * 0.5
  } else if (packSlug === 'agriculture-farming' || packSlug === 'irrigation-livestock') {
    w = FARMING_TOWNS.has(t.slug) || t.localityType === 'village' ? w * 2.4 : w * 0.7
  }
  return w
}

// Everyday trades that exist even in small settlements (used to guarantee every locality has listings).
const SMALL_TOWN_PACKS: [string, number][] = [
  ['food-groceries', 4], ['construction-hardware', 3], ['agriculture-farming', 2], ['fashion-retail', 1.2],
  ['automotive-transport', 1.2], ['butcheries-produce', 1.2], ['health-wellness', 1], ['vehicle-repair-tyres', 1],
]

const LANDLINE_PREFIX: Record<string, string[]> = {
  gaborone: ['390', '391', '392', '393', '395', '397'], francistown: ['241', '244', '245', '246'],
  maun: ['680', '686', '687'], kasane: ['625', '626'], palapye: ['492', '493'], serowe: ['463'], kanye: ['544'],
  lobatse: ['533'], mahalapye: ['471'], 'selebi-phikwe': ['261'], molepolole: ['592'], mochudi: ['577'],
  ramotswa: ['539'], jwaneng: ['588'], orapa: ['297'], letlhakane: ['297'], ghanzi: ['659'], tsabong: ['654'],
}

function makePhone(rng: Rng, townSlug: string): string {
  const landline = LANDLINE_PREFIX[townSlug]
  if (landline && rng.chance(0.5)) return `+267 ${rng.pick(landline)} ${pad(rng.int(0, 9999), 4)}`
  return `+267 ${rng.pick(['71', '72', '73', '74', '75', '76', '77'])} ${pad(rng.int(0, 999), 3)} ${pad(rng.int(0, 999), 3)}`
}

function makeHours(rng: Rng, packSlug: string): OpeningHours | null {
  if (rng.chance(0.06)) return null
  const h = (open: string, close: string): DayHours => ({ open, close })
  const wk = (d: DayHours | null) => ({ mon: d, tue: d, wed: d, thu: d, fri: d })
  const jitterOpen = () => rng.pick(['07:30', '08:00', '08:00', '08:30'])
  const jitterClose = () => rng.pick(['17:00', '17:00', '17:30', '18:00'])

  if (packSlug === 'tourism-hospitality') {
    const all = rng.chance(0.6) ? h('00:00', '23:59') : h('06:00', '22:00')
    return { ...wk(all), sat: all, sun: all }
  }
  if (packSlug === 'safari-lodges-tours') {
    const d = h('06:00', '18:00')
    return { ...wk(d), sat: d, sun: d }
  }
  if (['professional-services', 'legal-accounting', 'ict-computer-services', 'education-training'].includes(packSlug)) {
    return { ...wk(h('08:00', rng.pick(['16:30', '17:00', '17:00']))), sat: rng.chance(0.2) ? h('09:00', '12:00') : null, sun: null }
  }
  if (packSlug === 'food-groceries' || packSlug === 'butcheries-produce') {
    return {
      ...wk(h(rng.pick(['06:30', '07:00', '07:30']), rng.pick(['18:00', '19:00', '20:00']))),
      sat: h('07:00', rng.pick(['17:00', '18:00'])),
      sun: rng.chance(0.85) ? h('08:00', rng.pick(['13:00', '14:00'])) : null,
    }
  }
  if (packSlug === 'health-wellness') {
    const close = rng.pick(['17:00', '18:00', '19:00'])
    return { ...wk(h('08:00', close)), sat: h('08:00', rng.pick(['13:00', '16:00', '17:00'])), sun: rng.chance(0.5) ? h('09:00', '13:00') : null }
  }
  return {
    ...wk(h(jitterOpen(), jitterClose())),
    sat: rng.chance(0.85) ? h(rng.pick(['08:00', '08:30']), rng.pick(['13:00', '14:00', '16:00'])) : null,
    sun: rng.chance(0.15) ? h('09:00', '13:00') : null,
  }
}

function descriptionFor(
  rng: Rng,
  biz: Business,
  town: Town,
  regionName: string,
  nearby: string[],
  packs: CategoryPack[],
  productNames: string[],
  serviceNames: string[],
): string {
  const trade = rng.pick(packs[0].trade)
  const typeLower = biz.businessType.toLowerCase()
  const est = biz.yearEstablished ? `, trading since ${biz.yearEstablished}` : ''
  const openers = [
    `${biz.name} is a ${town.name}-based ${typeLower} specialising in ${trade}${est}.`,
    `Based in ${town.name}, ${biz.name} supplies ${trade} to customers across ${regionName}${est}.`,
    `${biz.name} is a locally owned ${typeLower} in ${town.name} offering ${trade}${est}.`,
    `Serving ${town.name} and surrounding communities, ${biz.name} focuses on ${trade}${est}.`,
  ]
  const parts = [rng.pick(openers)]
  const listItems = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
  if (productNames.length) parts.push(`Popular lines include ${listItems(rng.sample(productNames, Math.min(3, productNames.length)))}.`)
  if (serviceNames.length) parts.push(`Services include ${listItems(rng.sample(serviceNames, Math.min(2, serviceNames.length)))}.`)
  const reach = [
    `Delivery is available within ${rng.pick([25, 40, 50, 80, 100, 150])} km of ${town.name}.`,
    `Customers regularly travel in from ${nearby.slice(0, 2).join(' and ') || regionName} for the range and advice.`,
    `The team serves clients across ${regionName} District and beyond.`,
    `Accounts are available for registered businesses and institutions.`,
  ]
  parts.push(rng.pick(reach))
  const closers = [
    `Visit us at ${biz.address} or call for a quotation.`,
    `Contact the team to confirm availability before you travel.`,
    `Walk-ins are welcome during opening hours.`,
    `Ask about bulk pricing and repeat-order discounts.`,
  ]
  parts.push(rng.pick(closers))
  return parts.join(' ')
}

function shortDescriptionFor(rng: Rng, pack: CategoryPack, biz: Business, town: Town, regionName: string): string {
  const tagline = rng.pick(pack.taglines)
  const t1 = pack.trade[0]
  const t2 = pack.trade[Math.min(1, pack.trade.length - 1)]
  switch (rng.int(0, 3)) {
    case 0:
      return tagline
    case 1:
      return `Serving ${town.name} and surrounding areas with ${t1} and ${t2}.`
    case 2:
      return `${tagline.replace(/\.$/, '')} — based in ${town.name}.`
    default:
      return `A ${biz.businessType.toLowerCase()} of ${t1}, trusted by customers across ${regionName} District.`
  }
}

// ───────────────────────── the generator ─────────────────────────

interface Plan {
  biz: Business
  town: Town
  packs: CategoryPack[]
  nProd: number
  nSvc: number
  prodCap: number
  svcCap: number
  tier?: 'large'
}

export function buildDataset(): Dataset {
  const rng = new Rng(SEED_VALUE)
  const regions = REGIONS.map((r) => ({ ...r }))
  const towns = TOWNS.map((t) => ({ ...t }))
  const categories = CATEGORIES.map((c) => ({ ...c }))
  const townBySlug = new Map(towns.map((t) => [t.slug, t]))
  const regionById = new Map(regions.map((r) => [r.id, r]))

  // 1. Allocate slots (category + town) for generated businesses ------------------------------
  const curatedCount = CURATED.length
  const generatedCount = TARGETS.businesses - curatedCount
  const totalShare = PACKS.reduce((s, p) => s + p.share, 0)
  const quota = new Map<string, number>()
  let allocated = 0
  const remainders: [string, number][] = []
  for (const p of PACKS) {
    const exact = (p.share / totalShare) * generatedCount
    const base = Math.floor(exact)
    quota.set(p.slug, base)
    allocated += base
    remainders.push([p.slug, exact - base])
  }
  remainders.sort((a, b) => b[1] - a[1])
  for (let i = 0; allocated < generatedCount; i++, allocated++) {
    const slug = remainders[i % remainders.length][0]
    quota.set(slug, (quota.get(slug) ?? 0) + 1)
  }

  const coveredTowns = new Set(CURATED.map((c) => c.town))
  const uncovered = rng.shuffle(towns.filter((t) => !coveredTowns.has(t.slug)))
  const slots: { pack: string; town: Town }[] = []
  for (const t of uncovered) {
    // Prefer a trade that suits the locality; tourism towns get a tourism trade first.
    const hasQuota = (slug: string) => (quota.get(slug) ?? 0) > 0
    let candidates: [string, number][] = SMALL_TOWN_PACKS.filter(([slug]) => hasQuota(slug))
    if (TOURISM_TOWNS.has(t.slug)) {
      const tourism: [string, number][] = [['tourism-hospitality', 6], ['safari-lodges-tours', 4]]
      candidates = [...tourism.filter(([slug]) => hasQuota(slug)), ...candidates]
    }
    if (MINING_TOWNS.has(t.slug) && hasQuota('mining-energy')) candidates = [['mining-energy', 5], ...candidates]
    const pack = rng.weighted(candidates)
    quota.set(pack, (quota.get(pack) ?? 1) - 1)
    slots.push({ pack, town: t })
  }
  for (const p of PACKS) {
    for (let i = 0; i < (quota.get(p.slug) ?? 0); i++) {
      slots.push({ pack: p.slug, town: rng.weighted(towns.map((t) => [t, townWeight(p.slug, t)] as const)) })
    }
  }
  const shuffledSlots = rng.shuffle(slots)

  // 2. Lifecycle states ----------------------------------------------------------------------
  // Generated businesses (284): pending 26, draft 7, rejected 8, changes requested 6, suspended 7, unpublished 9.
  const states: string[] = []
  const stateCounts: [string, number][] = [['pending', 26], ['draft', 7], ['rejected', 8], ['changes', 6], ['suspended', 7], ['unpublished', 9]]
  for (const [s, n] of stateCounts) for (let i = 0; i < n; i++) states.push(s)
  while (states.length < generatedCount) states.push('published')
  const shuffledStates = rng.shuffle(states)

  // 3. Businesses ----------------------------------------------------------------------------
  const usedNames = new Set<string>()
  const usedSlugs = new Set<string>()
  const prefixUse = new Map<string, number>()
  const plans: Plan[] = []

  const uniqueName = (pack: CategoryPack, town: Town): string => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const prefix = rng.pick(PREFIXES)
      if ((prefixUse.get(prefix) ?? 0) >= 8) continue
      const allowed = GEO_PREFIX[prefix]
      if (allowed && !allowed.includes(town.regionId.replace('reg-', ''))) continue
      const pattern = rng.pick(pack.namePatterns)
      let name = pattern.replace('{P}', prefix).replace('{T}', town.name)
      if (attempt > 25) name = `${name} ${town.name}`
      if (!usedNames.has(name.toLowerCase())) {
        usedNames.add(name.toLowerCase())
        prefixUse.set(prefix, (prefixUse.get(prefix) ?? 0) + 1)
        return name
      }
    }
    const fallback = `${rng.pick(PREFIXES)} ${rng.pick(pack.namePatterns).replace('{P}', '').replace('{T}', town.name).trim()} ${town.name}`
    usedNames.add(fallback.toLowerCase())
    return fallback
  }

  const makeBusiness = (
    index: number,
    name: string,
    packSlugs: string[],
    town: Town,
    state: string,
    opts: { shortOverride?: string; verified?: boolean; featured?: boolean; catalog?: string[] },
  ): Plan => {
    const packs = (opts.catalog ?? packSlugs).map((s) => PACK_BY_SLUG[s])
    const primary = packs[0]
    let slug = slugify(name)
    if (usedSlugs.has(slug)) slug = `${slug}-${town.slug}`
    let n = 2
    while (usedSlugs.has(slug)) slug = `${slugify(name)}-${town.slug}-${n++}`
    usedSlugs.add(slug)

    const bearing = rng.float(0, Math.PI * 2)
    const maxKm = town.localityType === 'city' ? 6 : town.localityType === 'town' ? 3 : town.localityType === 'village' ? 1.4 : 0.7
    const dist = Math.sqrt(rng.next()) * maxKm
    const [lat, lng] = offsetPoint(town.lat, town.lng, dist, bearing)
    const area = rng.pick(town.areas)
    const plot = rng.int(100, 99999)
    const address = `Plot ${plot}, ${area}, ${town.name}`
    const emailBase = slug.replace(/-/g, '').slice(0, 26)
    const hasWebsite = rng.chance(0.62)
    const businessType = rng.weighted(primary.bizTypes) as BusinessType

    // lifecycle
    let approvalStatus: ApprovalStatus = 'approved'
    let listingStatus: ListingStatus = 'published'
    let submittedAt: string | undefined
    let rejectionReason: string | undefined
    let changeRequest: string | undefined
    let createdMs: number
    const recent = rng.chance(0.22)
    createdMs = recent ? daysAgo(rng.int(1, 58)) : daysAgo(rng.int(60, 900))
    switch (state) {
      case 'pending':
        approvalStatus = 'pending'
        listingStatus = 'draft'
        createdMs = daysAgo(rng.int(0, 20))
        submittedAt = iso(createdMs + rng.int(0, 2) * DAY / 2)
        break
      case 'draft':
        approvalStatus = 'pending'
        listingStatus = 'draft'
        createdMs = daysAgo(rng.int(2, 40))
        break
      case 'rejected':
        approvalStatus = 'rejected'
        listingStatus = 'draft'
        createdMs = daysAgo(rng.int(20, 70))
        submittedAt = iso(createdMs + DAY)
        rejectionReason = rng.pick(REJECTION_REASONS)
        break
      case 'changes':
        approvalStatus = 'changes_requested'
        listingStatus = 'draft'
        createdMs = daysAgo(rng.int(6, 30))
        submittedAt = iso(createdMs + DAY)
        changeRequest = rng.pick(CHANGE_REQUESTS)
        break
      case 'suspended':
        listingStatus = 'suspended'
        break
      case 'unpublished':
        listingStatus = 'unpublished'
        break
    }
    const isLive = approvalStatus === 'approved'
    const updatedMs = Math.min(ANCHOR_MS, createdMs + (rng.chance(0.4) ? 0 : rng.int(0, Math.max(1, Math.floor((ANCHOR_MS - createdMs) / DAY))) * DAY))
    const verified = opts.verified ?? (isLive && listingStatus === 'published' && rng.chance(0.42))
    const tone = TONES[index % TONES.length]

    const biz: Business = {
      id: `biz-${pad(index + 1, 3)}`,
      slug,
      name,
      logo: { initials: initialsOf(name), tone },
      cover: artFor(rng, undefined, tone),
      categoryIds: packSlugs.map((s) => `cat-${s}`),
      businessType,
      shortDescription: opts.shortOverride ?? '',
      description: '',
      phone: makePhone(rng, town.slug),
      alternatePhone: rng.chance(0.4) ? makePhone(rng, 'mobile') : undefined,
      email: `${rng.pick(['info', 'sales', 'hello', 'enquiries', 'office', 'admin'])}@${emailBase}.example`,
      website: hasWebsite ? `https://www.${emailBase}.example` : undefined,
      regionId: town.regionId,
      townId: town.id,
      address,
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
      openingHours: makeHours(rng, primary.slug),
      approvalStatus,
      listingStatus,
      verificationStatus: verified ? 'verified' : 'unverified',
      featured: opts.featured ?? false,
      isFictional: true,
      yearEstablished: rng.chance(0.85) ? rng.int(1988, 2025) : undefined,
      registrationRef: rng.chance(0.7) ? `DEMO-BW-${pad(rng.int(0, 99999999), 8)}` : undefined,
      social: rng.chance(0.55)
        ? {
            facebook: `@${emailBase}`,
            ...(rng.chance(0.4) ? { instagram: `@${emailBase}` } : {}),
            ...(rng.chance(0.25) ? { whatsapp: makePhone(rng, 'mobile') } : {}),
            ...(rng.chance(0.15) ? { linkedin: slug } : {}),
          }
        : undefined,
      contactPreferences: {
        showPhone: rng.chance(0.95),
        showEmail: rng.chance(0.88),
        acceptEnquiries: rng.chance(0.93),
        preferredContact: rng.weighted([['phone', 5], ['email', 3], ['whatsapp', 2]] as const),
      },
      createdAt: iso(createdMs),
      updatedAt: iso(updatedMs),
      submittedAt,
      rejectionReason,
      changeRequest,
    }
    if (biz.yearEstablished && new Date(createdMs).getFullYear() < biz.yearEstablished) {
      biz.yearEstablished = new Date(createdMs).getFullYear() - rng.int(0, 3)
    }
    return { biz, town, packs, nProd: 0, nSvc: 0, prodCap: 0, svcCap: 0 }
  }

  let idx = 0
  for (const c of CURATED) {
    const plan = makeBusiness(idx, c.name, c.cats, townBySlug.get(c.town)!, c.state === 'published' ? 'published' : c.state, {
      shortOverride: c.short,
      verified: c.verified,
      featured: c.featured,
      catalog: c.catalog,
    })
    plan.tier = 'large'
    plans.push(plan)
    idx++
  }
  for (let i = 0; i < generatedCount; i++) {
    const slot = shuffledSlots[i]
    const primary = PACK_BY_SLUG[slot.pack]
    const packSlugs = [slot.pack]
    const related = RELATED[slot.pack]
    if (related.length && rng.chance(0.35)) packSlugs.push(rng.pick(related))
    const name = uniqueName(primary, slot.town)
    plans.push(makeBusiness(idx, name, packSlugs, slot.town, shuffledStates[i], {}))
    idx++
  }

  // Featured: roughly one in ten visible, verified businesses (curated featured retained).
  const featuredCandidates = plans.filter((p) => p.biz.verificationStatus === 'verified' && p.biz.approvalStatus === 'approved' && p.biz.listingStatus === 'published' && !p.biz.featured)
  for (const p of rng.sample(featuredCandidates, 16)) p.biz.featured = true

  // 4. Catalogue sizes -------------------------------------------------------------------------
  const caps = (packs: CategoryPack[]) => ({
    prod: packs.reduce((s, p) => s + p.products.length, 0),
    svc: packs.reduce((s, p) => s + p.services.length, 0),
  })
  for (const p of plans) {
    const c = caps(p.packs)
    p.prodCap = c.prod
    p.svcCap = c.svc
    const bias = p.packs[0].productBias
    const tier = p.tier === 'large' ? 'l' : rng.weighted([['s', 0.42], ['m', 0.36], ['l', 0.17], ['x', 0.05]] as const)
    const raw = tier === 's' ? rng.int(1, 3) : tier === 'm' ? rng.int(4, 8) : tier === 'l' ? rng.int(9, 15) : rng.int(16, 24)
    let n = Math.round(raw * bias)
    if (bias <= 0.6 && rng.chance(0.35)) n = 0
    p.nProd = Math.min(n, p.prodCap)
    const sBias = p.packs[0].serviceBias
    const sRaw = rng.weighted([[0, 0.22], [1, 0.34], [2, 0.26], [3, 0.12], [4, 0.06]] as const)
    let sn = Math.round(sRaw * sBias + (sBias > 1.5 && rng.chance(0.5) ? 1 : 0))
    if (p.tier === 'large') sn = Math.max(sn, 2)
    p.nSvc = Math.min(sn, p.svcCap)
  }
  reconcile(rng, plans, 'nProd', 'prodCap', TARGETS.products, 0.3)
  reconcile(rng, plans, 'nSvc', 'svcCap', TARGETS.services, 0)

  // 5. Products and services -------------------------------------------------------------------
  const products: Product[] = []
  const services: Service[] = []
  const usedProdSlugs = new Set<string>()
  const usedSvcSlugs = new Set<string>()
  let prodSeq = 0
  let svcSeq = 0

  for (const p of plans) {
    const { biz, town, packs } = p
    const region = regionById.get(town.regionId)!
    const nearby = nearbyTowns(towns, town, 6).map((t) => t.name)
    const pubFromBusiness = (): PublicationStatus => {
      if (biz.approvalStatus === 'approved' && biz.listingStatus === 'published') {
        return rng.weighted([['published', 90], ['draft', 6], ['unpublished', 4]] as const)
      }
      return rng.weighted([['published', 80], ['draft', 20]] as const)
    }

    // Product templates: 70% from primary pack, remainder from secondary packs.
    const templates: { tpl: ProdTpl; pack: CategoryPack }[] = []
    for (const pack of packs) for (const tpl of pack.products) templates.push({ tpl, pack })
    const chosen = pickWeightedDistinct(
      rng,
      templates,
      p.nProd,
      (t) => (t.pack === packs[0] ? 7 : 3),
    )
    const productNames: string[] = []
    for (const { tpl, pack } of chosen) {
      const [rawName, unit, min, max, blurb, specStr] = tpl
      const { name: variantName, mult } = resolveVariant(rng, rawName)
      // Many suppliers sell staples under a house brand ("Kudu Maize Meal Super 10kg"), which also keeps
      // identical products from different suppliers distinguishable in the catalogue.
      const brandWord = biz.name.split(' ')[0]
      const name = BRANDABLE.has(pack.slug) && PREFIXES.includes(brandWord) && rng.chance(0.42) ? `${brandWord} ${variantName}` : variantName
      const quoteOnly = max === 0
      const priceType = quoteOnly ? 'quote' : rng.weighted([['fixed', 78], ['from', 10], ['quote', 12]] as const)
      const price = priceType === 'quote' ? undefined : roundPrice(rng.float(min, max) * mult)
      const slugBase = slugify(name)
      let slug = `${slugBase}-${biz.slug}`
      let k = 2
      while (usedProdSlugs.has(slug)) slug = `${slugBase}-${biz.slug}-${k++}`
      usedProdSlugs.add(slug)

      const isHospitality = pack.slug === 'tourism-hospitality' || pack.slug === 'safari-lodges-tours'
      const seasonalOk = ['agriculture-farming', 'butcheries-produce', 'food-groceries', 'home-garden'].includes(pack.slug)
      let availability = rng.weighted([['in_stock', 62], ['low_stock', 10], ['made_to_order', 8], ['seasonal', seasonalOk ? 9 : 0], ['out_of_stock', 7]] as const) as ProductAvailability
      if (isHospitality && availability === 'out_of_stock' && rng.chance(0.6)) availability = 'in_stock'
      const specs: { label: string; value: string }[] = []
      if (specStr) for (const kv of specStr.split(';')) { const [label, ...rest] = kv.split(':'); specs.push({ label, value: rest.join(':') }) }
      specs.push({ label: 'Unit of sale', value: unit })
      if (rng.chance(0.25)) specs.push({ label: 'Supplier lead time', value: rng.pick(['In stock', '1–2 days', '3–5 days', '1–2 weeks']) })

      const createdMs = Math.max(Date.parse(biz.createdAt), daysAgo(rng.chance(0.2) ? rng.int(1, 58) : rng.int(5, 600)))
      const clamped = Math.min(ANCHOR_MS, Math.max(createdMs, Date.parse(biz.createdAt)))
      const closers = [
        `Available from ${biz.name} in ${town.name}.`,
        `Ask ${biz.name} about bulk pricing and delivery options.`,
        `Stocked by ${biz.name} — collect in ${town.name} or arrange delivery.`,
        `${biz.name} can supply this item on account for registered customers.`,
        `Supplied by ${biz.name}. Prices are indicative and may change.`,
        `Contact ${biz.name} in ${town.name} to confirm current stock.`,
      ]
      const tone = TONES[(prodSeq + biz.logo.initials.charCodeAt(0)) % TONES.length]
      const galleryCount = rng.weighted([[0, 3], [1, 3], [2, 3], [3, 1]] as const)
      productNames.push(name)
      products.push({
        id: `prd-${pad(++prodSeq, 4)}`,
        slug,
        businessId: biz.id,
        name,
        categoryId: `cat-${pack.slug}`,
        description: `${blurb} ${rng.pick(closers)}`,
        image: { tone, pattern: rng.int(0, 4) as ArtRef['pattern'], label: initialsOf(name) },
        gallery: Array.from({ length: galleryCount }, () => artFor(rng, undefined, tone)),
        unit,
        price,
        currency: 'BWP',
        priceType,
        availability,
        specifications: specs,
        sku: `${biz.logo.initials}-${pack.slug.slice(0, 3).toUpperCase()}-${pad(prodSeq, 4)}`,
        publicationStatus: pubFromBusiness(),
        createdAt: iso(clamped),
        updatedAt: iso(Math.min(ANCHOR_MS, clamped + (rng.chance(0.5) ? 0 : rng.int(0, 60) * DAY))),
      })
    }

    // Services
    const svcTemplates: { tpl: SvcTpl; pack: CategoryPack }[] = []
    for (const pack of packs) for (const tpl of pack.services) svcTemplates.push({ tpl, pack })
    const svcChosen = pickWeightedDistinct(rng, svcTemplates, p.nSvc, (t) => (t.pack === packs[0] ? 7 : 3))
    const serviceNames: string[] = []
    for (const { tpl, pack } of svcChosen) {
      const [name, model, min, max, blurb] = tpl
      const pricingModel = SVC_MODEL[model]
      const quote = pricingModel === 'quote'
      const price = quote ? undefined : roundPrice(rng.float(min, max))
      const priceMax = !quote && price !== undefined && (model === 'p' || model === 'd' || model === 'm') && rng.chance(0.4) ? roundPrice(price * rng.float(1.3, 2.2)) : undefined
      const slugBase = slugify(name)
      let slug = `${slugBase}-${biz.slug}`
      let k = 2
      while (usedSvcSlugs.has(slug)) slug = `${slugBase}-${biz.slug}-${k++}`
      usedSvcSlugs.add(slug)

      const natBias = ['professional-services', 'legal-accounting', 'ict-computer-services', 'safari-lodges-tours', 'education-training'].includes(pack.slug)
      const coverage = rng.weighted([['local', natBias ? 35 : 58], ['regional', 30], ['nationwide', natBias ? 35 : 12]] as const) as ServiceCoverage
      let townIds = [town.id]
      let regionIds = [town.regionId]
      let note = `${town.name} and surrounding areas`
      if (coverage === 'regional') {
        const near = nearbyTowns(towns, town, rng.int(2, 4))
        townIds = [town.id, ...near.map((t) => t.id)]
        regionIds = Array.from(new Set(townIds.map((id) => towns.find((t) => t.id === id)!.regionId)))
        note = `${town.name}, ${near.map((t) => t.name).join(', ')} and nearby villages`
      } else if (coverage === 'nationwide') {
        townIds = [town.id]
        regionIds = regions.map((r) => r.id)
        note = 'Nationwide, by arrangement — travel charges may apply'
      }
      const createdMs = Math.min(ANCHOR_MS, Math.max(Date.parse(biz.createdAt), daysAgo(rng.chance(0.2) ? rng.int(1, 58) : rng.int(5, 600))))
      const closers = [
        `Provided by ${biz.name} in ${town.name}.`,
        `Contact ${biz.name} to discuss your requirements and timing.`,
        `${biz.name} serves ${note.toLowerCase()}.`,
        `Request a quotation from ${biz.name} for a tailored scope.`,
      ]
      serviceNames.push(name)
      services.push({
        id: `svc-${pad(++svcSeq, 4)}`,
        slug,
        businessId: biz.id,
        name,
        categoryId: `cat-${pack.slug}`,
        description: `${blurb} ${rng.pick(closers)}`,
        image: { tone: TONES[svcSeq % TONES.length], pattern: rng.int(0, 4) as ArtRef['pattern'], label: initialsOf(name) },
        coverage,
        townIds,
        regionIds,
        serviceAreaNote: note,
        price,
        priceMax,
        currency: 'BWP',
        pricingModel,
        availability: rng.weighted([['available', 72], ['limited', 14], ['waitlist', 8], ['unavailable', 6]] as const) as ServiceAvailability,
        publicationStatus: pubFromBusiness(),
        createdAt: iso(createdMs),
        updatedAt: iso(Math.min(ANCHOR_MS, createdMs + (rng.chance(0.5) ? 0 : rng.int(0, 60) * DAY))),
      })
    }

    // Descriptions (reference real catalogue items)
    if (!biz.shortDescription) biz.shortDescription = shortDescriptionFor(rng, packs[0], biz, town, region.name)
    biz.description = descriptionFor(rng, biz, town, region.name, nearby, packs, productNames, serviceNames)
  }

  // 6. Users -------------------------------------------------------------------------------------
  const businesses = plans.map((p) => p.biz)
  const users = buildUsers(rng, businesses, towns)

  // 7. Enquiries ---------------------------------------------------------------------------------
  const enquiries = buildEnquiries(rng, businesses, products, services)

  // 8. Activity ------------------------------------------------------------------------------------
  const activities = buildActivities(rng, businesses, products, services, enquiries, users)

  const settings: Settings = {
    siteName: 'Find Botswana',
    tagline: 'Find the right business, closer to home.',
    contactEmail: 'hello@findbotswana.example',
    pageSize: 12,
    requireApproval: true,
    showDemoBanner: true,
    showVerifiedBadges: true,
    allowEnquiries: true,
    featuredLimit: 8,
  }

  return { businesses, products, services, categories, regions, towns, users, enquiries, activities, settings }
}

// ───────────────────────── supporting generators ─────────────────────────

function nearbyTowns(towns: Town[], from: Town, count: number): Town[] {
  return towns
    .filter((t) => t.id !== from.id)
    .map((t) => ({ t, d: haversineKm(from.lat, from.lng, t.lat, t.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.t)
}

function pickWeightedDistinct<T>(rng: Rng, items: readonly T[], n: number, weight: (t: T) => number): T[] {
  const pool = items.slice()
  const out: T[] = []
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, it) => s + weight(it), 0)
    let r = rng.next() * total
    let i = 0
    for (; i < pool.length - 1; i++) {
      r -= weight(pool[i])
      if (r <= 0) break
    }
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

function reconcile(rng: Rng, plans: Plan[], key: 'nProd' | 'nSvc', capKey: 'prodCap' | 'svcCap', target: number, minBias: number) {
  let sum = plans.reduce((s, p) => s + p[key], 0)
  let guard = 0
  while (sum > target && guard++ < 200000) {
    const p = plans[rng.int(0, plans.length - 1)]
    if (p[key] > 1) {
      p[key]--
      sum--
    }
  }
  while (sum < target && guard++ < 400000) {
    const p = plans[rng.int(0, plans.length - 1)]
    const bias = key === 'nProd' ? p.packs[0].productBias : p.packs[0].serviceBias
    if (bias >= minBias && p[key] < p[capKey] && (p[key] > 0 || rng.chance(0.3))) {
      p[key]++
      sum++
    }
  }
}

function buildUsers(rng: Rng, businesses: Business[], towns: Town[]): User[] {
  const fixed: { name: string; role: User['role']; status: User['status'] }[] = [
    { name: 'Admin User', role: 'administrator', status: 'active' },
    { name: 'Lerato Mokgadi', role: 'moderator', status: 'active' },
    { name: 'Tsholo Rammidi', role: 'moderator', status: 'active' },
    { name: 'Naledi Molefe', role: 'business_owner', status: 'active' },
    { name: 'Thabo Kgosidintsi', role: 'business_owner', status: 'active' },
    { name: 'Boitumelo Ramotadima', role: 'consumer', status: 'active' },
    { name: 'Odirile Phiri', role: 'consumer', status: 'active' },
    { name: 'Kagiso Motsamai', role: 'consumer', status: 'active' },
    { name: 'Rebaone Oteng', role: 'consumer', status: 'inactive' },
    { name: 'Onalenna Moagi', role: 'consumer', status: 'active' },
  ]
  const usedNames = new Set(fixed.map((f) => f.name))
  const ownersNeeded = 20 - 2
  const extra: typeof fixed = []
  while (extra.length < ownersNeeded) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`
    if (usedNames.has(name)) continue
    usedNames.add(name)
    extra.push({ name, role: 'business_owner', status: extra.length === 5 ? 'invited' : extra.length === 11 ? 'inactive' : 'active' })
  }
  while (fixed.length + extra.length < TARGETS.users) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`
    if (usedNames.has(name)) continue
    usedNames.add(name)
    extra.push({ name, role: 'consumer', status: 'active' })
  }
  const all = [...fixed, ...extra]
  const users: User[] = all.map((u, i) => {
    const created = daysAgo(rng.int(30, 700))
    const [first, ...rest] = u.name.split(' ')
    return {
      id: `usr-${pad(i + 1, 2)}`,
      name: u.name,
      email: u.role === 'administrator' ? 'admin@findbotswana.example' : `${first.toLowerCase()}.${rest.join('').toLowerCase()}@mail.example`,
      role: u.role,
      status: u.status,
      townId: rng.pick(towns.slice(0, 20)).id,
      businessIds: [],
      createdAt: iso(created),
      lastActiveAt: iso(u.status === 'active' ? daysAgo(rng.int(0, 20)) : u.status === 'inactive' ? daysAgo(rng.int(90, 300)) : created),
    }
  })

  const owners = users.filter((u) => u.role === 'business_owner')
  const ownerByName = new Map(owners.map((o) => [o.name, o]))
  const assign = (b: Business, owner: User) => {
    b.ownerUserId = owner.id
    owner.businessIds.push(b.id)
  }
  // curated owners
  const curatedOwners: Record<string, string> = {}
  for (const c of CURATED) if (c.owner) curatedOwners[c.name] = c.owner
  for (const b of businesses) {
    const forced = curatedOwners[b.name]
    if (forced) assign(b, ownerByName.get(forced)!)
  }
  // businesses that are not live need an owner (they were submitted by someone)
  const needing = businesses.filter((b) => !b.ownerUserId && (b.approvalStatus !== 'approved' || b.listingStatus !== 'published'))
  const activeOwners = owners.filter((o) => o.status !== 'invited')
  needing.forEach((b, i) => assign(b, activeOwners[i % activeOwners.length]))
  // a sample of published businesses are also claimed by owners
  const claimable = businesses.filter((b) => !b.ownerUserId && b.approvalStatus === 'approved' && b.listingStatus === 'published')
  for (const b of rng.sample(claimable, 28)) assign(b, rng.pick(activeOwners))
  // make sure every owner has at least one business
  for (const o of owners) {
    if (o.status === 'invited') continue
    if (!o.businessIds.length) {
      const b = rng.pick(businesses.filter((x) => !x.ownerUserId))
      assign(b, o)
    }
  }
  return users
}

function buildEnquiries(rng: Rng, businesses: Business[], products: Product[], services: Service[]): Enquiry[] {
  const live = businesses.filter((b) => b.approvalStatus === 'approved' && b.listingStatus === 'published' && b.contactPreferences.acceptEnquiries)
  const prodByBiz = new Map<string, Product[]>()
  for (const p of products) {
    if (p.publicationStatus !== 'published') continue
    prodByBiz.set(p.businessId, [...(prodByBiz.get(p.businessId) ?? []), p])
  }
  const svcByBiz = new Map<string, Service[]>()
  for (const s of services) {
    if (s.publicationStatus !== 'published') continue
    svcByBiz.set(s.businessId, [...(svcByBiz.get(s.businessId) ?? []), s])
  }
  const out: Enquiry[] = []
  // Make sure the featured demo owner (Okavango Solar Works) has enquiries to show.
  const priority = live.filter((b) => b.ownerUserId)
  for (let i = 0; i < TARGETS.enquiries; i++) {
    const biz = i < 40 ? rng.pick(priority) : rng.pick(live)
    const ps = prodByBiz.get(biz.id) ?? []
    const ss = svcByBiz.get(biz.id) ?? []
    let targetType: EnquiryTarget = rng.weighted([['business', 40], ['product', 35], ['service', 25]] as const)
    if (targetType === 'product' && !ps.length) targetType = 'business'
    if (targetType === 'service' && !ss.length) targetType = 'business'
    const target = targetType === 'product' ? rng.pick(ps).id : targetType === 'service' ? rng.pick(ss).id : biz.id
    const first = rng.pick(FIRST_NAMES)
    const last = rng.pick(SURNAMES)
    const msg = targetType === 'product' ? rng.pick(PRODUCT_ENQUIRY_MESSAGES) : targetType === 'service' ? rng.pick(SERVICE_ENQUIRY_MESSAGES) : rng.pick(BUSINESS_ENQUIRY_MESSAGES)
    const createdMs = Math.max(Date.parse(biz.createdAt), daysAgo(rng.int(0, 90)) - rng.int(0, 86_000_000))
    out.push({
      id: `enq-${pad(i + 1, 3)}`,
      businessId: biz.id,
      targetType,
      targetId: target,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@mail.example`,
      phone: rng.chance(0.55) ? makePhone(rng, 'mobile') : undefined,
      message: msg,
      preferredDate: targetType === 'service' && rng.chance(0.6) ? iso(ANCHOR_MS + rng.int(2, 30) * DAY).slice(0, 10) : undefined,
      status: rng.weighted([['new', 35], ['read', 25], ['replied', 30], ['closed', 10]] as const) as EnquiryStatus,
      createdAt: iso(Math.min(ANCHOR_MS, createdMs)),
    })
  }
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // renumber so IDs ascend with age (oldest first) — stable and readable
  return out.reverse().map((e, i) => ({ ...e, id: `enq-${pad(i + 1, 3)}` })).reverse()
}

function buildActivities(rng: Rng, businesses: Business[], products: Product[], services: Service[], enquiries: Enquiry[], users: User[]): Activity[] {
  const window = daysAgo(60)
  const admin = users[0]
  const mods = users.filter((u) => u.role === 'moderator')
  const actor = () => (rng.chance(0.55) ? { n: admin.name, r: 'Administrator' } : { n: rng.pick(mods).name, r: 'Moderator' })
  const bizById = new Map(businesses.map((b) => [b.id, b]))
  const cands: Activity[] = []
  const add = (at: number, action: string, entityType: Activity['entityType'], entityId: string, entityName: string, message: string, by?: { n: string; r: string }) => {
    const who = by ?? actor()
    cands.push({ id: '', at: iso(Math.min(ANCHOR_MS, at)), actorName: who.n, actorRole: who.r, action, entityType, entityId, entityName, message })
  }
  for (const b of businesses) {
    const owner = b.ownerUserId ? users.find((u) => u.id === b.ownerUserId) : undefined
    const ownerBy = owner ? { n: owner.name, r: 'Business owner' } : undefined
    if (b.submittedAt && Date.parse(b.submittedAt) >= window) {
      add(Date.parse(b.submittedAt), 'business.submitted', 'business', b.id, b.name, `${b.name} was submitted for approval.`, ownerBy)
    }
    const updated = Date.parse(b.updatedAt)
    if (b.approvalStatus === 'approved' && updated >= window) {
      add(updated, 'business.approved', 'business', b.id, b.name, `${b.name} was approved and published.`)
      if (b.verificationStatus === 'verified' && rng.chance(0.6)) add(updated + 3_600_000, 'business.verified', 'business', b.id, b.name, `${b.name} was marked as verified.`)
    }
    if (b.approvalStatus === 'rejected') add(Date.parse(b.submittedAt ?? b.createdAt) + 2 * DAY, 'business.rejected', 'business', b.id, b.name, `${b.name} was rejected: ${b.rejectionReason}`)
    if (b.approvalStatus === 'changes_requested') add(Date.parse(b.submittedAt ?? b.createdAt) + 2 * DAY, 'business.changes_requested', 'business', b.id, b.name, `Changes were requested for ${b.name}.`)
    if (b.listingStatus === 'suspended') add(updated, 'business.suspended', 'business', b.id, b.name, `${b.name} was suspended from the public directory.`)
  }
  for (const p of products) {
    const biz = bizById.get(p.businessId)!
    if (Date.parse(p.createdAt) >= window) add(Date.parse(p.createdAt), 'product.created', 'product', p.id, p.name, `${p.name} was added to ${biz.name}.`, undefined)
  }
  for (const s of services) {
    const biz = bizById.get(s.businessId)!
    if (Date.parse(s.createdAt) >= window) add(Date.parse(s.createdAt), 'service.created', 'service', s.id, s.name, `${s.name} was added to ${biz.name}.`)
  }
  for (const e of enquiries) {
    if (Date.parse(e.createdAt) >= window) {
      const biz = bizById.get(e.businessId)!
      add(Date.parse(e.createdAt), 'enquiry.received', 'enquiry', e.id, biz.name, `New enquiry for ${biz.name} from ${e.name}.`, { n: e.name, r: 'Consumer' })
    }
  }
  const roleUsers = users.filter((u) => u.role === 'business_owner')
  for (let i = 0; i < 4; i++) {
    const u = rng.pick(roleUsers)
    add(daysAgo(rng.int(2, 55)), 'user.role_changed', 'user', u.id, u.name, `${u.name}'s role was confirmed as Business owner.`)
  }
  for (const u of users.slice(-6)) add(Date.parse(u.createdAt), 'user.created', 'user', u.id, u.name, `${u.name} joined the platform.`, { n: u.name, r: 'Consumer' })

  const chosen = cands.length > TARGETS.activities ? rng.sample(cands, TARGETS.activities) : cands
  // pad with historical events if the 60-day window had fewer than needed
  let pad2 = 0
  while (chosen.length < TARGETS.activities) {
    const b = rng.pick(businesses.filter((x) => x.approvalStatus === 'approved'))
    const at = Math.min(Date.parse(b.updatedAt), window - rng.int(1, 120) * DAY)
    const who = actor()
    chosen.push({ id: '', at: iso(Math.max(at, Date.parse(b.createdAt))), actorName: who.n, actorRole: who.r, action: 'business.updated', entityType: 'business', entityId: b.id, entityName: b.name, message: `${b.name} listing details were updated.` })
    pad2++
  }
  chosen.sort((a, b) => a.at.localeCompare(b.at))
  return chosen.map((a, i) => ({ ...a, id: `act-${pad(i + 1, 3)}` })).reverse()
}
