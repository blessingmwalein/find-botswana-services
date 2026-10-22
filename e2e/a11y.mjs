// Automated WCAG 2.0/2.1 A + AA audit (axe-core) of the main public, owner and admin pages.
//   pnpm build && pnpm start -p 3100   then   pnpm e2e:a11y     (BASE=… to point elsewhere). Exits 1 on any violation.
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:3100'
const paths = ['/', '/discover', '/businesses', '/products', '/services', '/map', '/categories', '/businesses/kgale-building-centre', '/products/portland-cement-32-5r-50kg-kgale-building-centre', '/services/solar-geyser-installation-okavango-solar-works', '/business/register', '/business/dashboard', '/admin', '/admin/businesses', '/admin/approvals', '/admin/products', '/admin/categories', '/admin/users', '/admin/reports', '/admin/settings']
const b = await chromium.launch()
const page = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage()
const agg = new Map()
for (const p of paths) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' })
  const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }))
  for (const v of res.violations) {
    const key = v.id
    const e = agg.get(key) ?? { impact: v.impact, help: v.help, pages: new Set(), nodes: 0, sample: [] }
    e.pages.add(p); e.nodes += v.nodes.length
    for (const n of v.nodes.slice(0, 2)) if (e.sample.length < 3) e.sample.push(n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]?.trim().slice(0, 140))
    agg.set(key, e)
  }
  console.log(`${p.padEnd(75)} violations: ${res.violations.map((v) => `${v.id}(${v.nodes.length})`).join(', ') || 'none'}`)
}
console.log('\n=== summary ===')
for (const [id, e] of [...agg.entries()].sort((a, b) => b[1].nodes - a[1].nodes)) console.log(`${e.impact?.padEnd(9)} ${id}  — ${e.help}\n    pages: ${e.pages.size}, nodes: ${e.nodes}\n    ${e.sample.join('\n    ')}`)
await b.close()
if (agg.size > 0) process.exit(1)
