// Run with: pnpm validate:data
// Generates the seed dataset twice (determinism check), prints distribution statistics and validates integrity.
import { buildDataset, TARGETS } from '../lib/seed/generate'
import { businessLifecycle, isBusinessPublic } from '../lib/rules'
import { validateDataset } from '../lib/validate-data'

const t0 = performance.now()
const a = buildDataset()
const ms = Math.round(performance.now() - t0)
const b = buildDataset()

const same = JSON.stringify(a) === JSON.stringify(b)
console.log(`Generated in ${ms} ms · deterministic across runs: ${same ? 'YES' : 'NO'}`)

const counts: [string, number, number | undefined][] = [
  ['businesses', a.businesses.length, TARGETS.businesses],
  ['products', a.products.length, TARGETS.products],
  ['services', a.services.length, TARGETS.services],
  ['categories', a.categories.length, 20],
  ['towns', a.towns.length, 60],
  ['regions', a.regions.length, undefined],
  ['users', a.users.length, TARGETS.users],
  ['enquiries', a.enquiries.length, TARGETS.enquiries],
  ['activities', a.activities.length, TARGETS.activities],
]
for (const [name, n, target] of counts) console.log(`  ${name.padEnd(11)} ${String(n).padStart(5)}${target ? `  (target ${target})${n >= target ? '' : '  <-- BELOW TARGET'}` : ''}`)

const lifecycle = new Map<string, number>()
for (const biz of a.businesses) lifecycle.set(businessLifecycle(biz), (lifecycle.get(businessLifecycle(biz)) ?? 0) + 1)
console.log('Lifecycle:', Object.fromEntries(lifecycle))
console.log(`Verified: ${a.businesses.filter((x) => x.verificationStatus === 'verified').length} · Featured: ${a.businesses.filter((x) => x.featured).length} · Public: ${a.businesses.filter(isBusinessPublic).length}`)
console.log(`Quote-only products: ${a.products.filter((p) => p.priceType === 'quote').length} · services: ${a.services.filter((s) => s.pricingModel === 'quote').length}`)

const perTown = new Map<string, number>()
for (const biz of a.businesses) perTown.set(biz.townId, (perTown.get(biz.townId) ?? 0) + 1)
console.log(`Towns with at least one business: ${perTown.size}/${a.towns.length}`)
console.log('Top towns:', [...perTown.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([id, n]) => `${id.replace('twn-', '')}:${n}`).join(', '))

const prodPerBiz = a.businesses.map((x) => a.products.filter((p) => p.businessId === x.id).length)
console.log(`Products per business: min ${Math.min(...prodPerBiz)} · max ${Math.max(...prodPerBiz)} · zero ${prodPerBiz.filter((n) => n === 0).length}`)
console.log(`Distinct product names: ${new Set(a.products.map((p) => p.name)).size} of ${a.products.length}`)
console.log(`Distinct business descriptions: ${new Set(a.businesses.map((x) => x.description)).size} of ${a.businesses.length}`)
console.log(`Distinct phones: ${new Set(a.businesses.map((x) => x.phone)).size} · distinct emails: ${new Set(a.businesses.map((x) => x.email)).size}`)

const issues = validateDataset(a)
const errors = issues.filter((i) => i.level === 'error')
const warnings = issues.filter((i) => i.level === 'warning')
console.log(`\nIntegrity: ${errors.length} error(s), ${warnings.length} warning(s)`)
for (const i of errors.slice(0, 40)) console.log(`  ERROR  [${i.area}] ${i.message}`)
for (const i of warnings.slice(0, 15)) console.log(`  warn   [${i.area}] ${i.message}`)
if (!same || errors.length) process.exit(1)
