// End-to-end scenarios for Find Botswana (Playwright, real Chromium).
//
//   pnpm build && pnpm start -p 3100          # in one terminal
//   npx playwright install chromium           # first time only
//   pnpm e2e                                  # in another terminal
//
// Env: BASE (default http://localhost:3100) · ONLY="A,F" to run scenarios by prefix · OUT=<dir> for screenshots/CSV.
// Every scenario runs in a fresh browser context (clean localStorage). Any console warning/error fails the scenario.
// Scenarios A–E cover consumer flows, F–J the register → approve → catalogue → persist → reset journey,
// K–S cover pagination/URL state, search, CSV export, moderation rules, navigation, responsiveness, map and clipboard behaviour.
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3100'
const OUT = process.env.OUT ?? path.join(os.tmpdir(), 'findbw-e2e')
fs.mkdirSync(OUT, { recursive: true })
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)

const results = []
const browser = await chromium.launch()

async function newPage(ctx) {
  const page = await ctx.newPage()
  page.setDefaultTimeout(15000)
  page.consoleProblems = []
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()) && !/Download the React DevTools|tile\.openstreetmap|ERR_NAME_NOT_RESOLVED|Failed to load resource/i.test(m.text())) page.consoleProblems.push(`${m.type()}: ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', (e) => page.consoleProblems.push('pageerror: ' + e.message.slice(0, 200)))
  return page
}

async function scenario(name, fn, ctxOpts = {}) {
  if (ONLY.length && !ONLY.some((o) => name.startsWith(o))) return
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true, ...ctxOpts })
  const page = await newPage(ctx)
  const steps = []
  const step = async (label, f) => {
    try {
      const v = await f()
      steps.push(`  ✓ ${label}`)
      return v
    } catch (e) {
      steps.push(`  ✗ ${label}\n      ${String(e.message).split('\n')[0].slice(0, 300)}`)
      throw e
    }
  }
  let ok = true
  try {
    await fn(page, step, ctx)
  } catch (e) {
    ok = false
    try { await page.screenshot({ path: path.join(OUT, `fail-${name.replace(/\W+/g, '_')}.png`) }) } catch {}
  }
  if (page.consoleProblems.length) {
    ok = false
    steps.push(`  ✗ console problems:\n      ${page.consoleProblems.slice(0, 3).join('\n      ')}`)
  }
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n${steps.join('\n')}`)
  await ctx.close()
}

// Required fields render a decorative "*" inside <label>, which getByLabel includes in the label text.
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const L = (page, text) => page.getByLabel(new RegExp('^' + escapeRe(text) + '\\s*\\*?$'))
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }
const num = (s) => Number(String(s).replace(/[^\d]/g, ''))
async function poll(fn, timeout = 8000) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last } catch {}
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('poll timed out')
}
const go = async (page, p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(300) }
const resultCount = async (page) => {
  const t = await page.getByText(/Showing .* of .* (businesses|business|products|product|services|service)/).first().textContent()
  return num(t.split(' of ')[1])
}
// Dashboard numbers first render from the seed, then update once localStorage is read; wait until a value stops changing.
async function stable(page, label) {
  let prev = -1
  for (let i = 0; i < 20; i++) {
    const v = await statValue(page, label)
    if (v === prev && v > 0) return v
    prev = v
    await page.waitForTimeout(250)
  }
  throw new Error(`stat "${label}" never settled`)
}
async function statValue(page, label, scope = 'main') {
  // The stat card is the nearest rounded container (link or div) around its exact label text.
  const card = page.locator(scope).getByText(label, { exact: true }).first().locator('xpath=ancestor::*[self::a or self::div][contains(@class,"rounded-xl")][1]')
  const lines = (await card.innerText()).split(/\r?\n/).map((l) => l.trim())
  return num(lines.find((l) => /^[\d,]+$/.test(l)) ?? '0')
}

// ───────────────────────── scenarios ─────────────────────────

await scenario('A. Consumer search → category + town filters → product → supplier', async (page, step) => {
  await step('open products', () => go(page, '/products'))
  const all = await step('read total', () => resultCount(page))
  await step('search "cement"', async () => {
    await page.getByRole('combobox', { name: 'Search directory' }).fill('cement')
    await page.waitForURL(/q=cement/)
  })
  const afterQ = await step('results narrowed', async () => { const n = await resultCount(page); expect(n > 0 && n < all, `cement results ${n} of ${all}`); return n })
  await step('apply category filter', async () => {
    await page.getByLabel('Category', { exact: true }).selectOption('construction-hardware')
    await page.waitForURL(/category=construction-hardware/)
  })
  await step('apply town filter', async () => {
    await page.getByLabel('Town', { exact: true }).selectOption('gaborone')
    await page.waitForURL(/town=gaborone/)
  })
  const afterAll = await step('filters combined (q kept, count not larger)', async () => {
    expect(page.url().includes('q=cement'), 'q was dropped')
    expect(page.url().includes('category=construction-hardware'), 'category was dropped')
    await page.waitForTimeout(300)
    const n = await resultCount(page)
    expect(n > 0 && n <= afterQ, `combined results ${n}`)
    return n
  })
  const name = await step('open first result', async () => {
    const first = page.locator('article, div.group').filter({ has: page.getByRole('link') }).first()
    const link = page.getByRole('link', { name: /cement/i }).first()
    const t = (await link.textContent()).trim()
    await link.click()
    await page.waitForURL(/\/products\/.+/)
    return t
  })
  await step('detail shows the product and its supplier', async () => {
    await page.getByRole('heading', { level: 1 }).waitFor()
    expect((await page.getByRole('heading', { level: 1 }).textContent()).trim() === name, 'h1 mismatch')
    await page.getByText('Indicative price').or(page.getByText('Pricing')).first().waitFor()
  })
  await step('navigate to supplier profile', async () => {
    const supplier = page.getByRole('link', { name: /View supplier/ }).first()
    await supplier.click()
    await page.waitForURL(/\/businesses\/.+/)
    await page.getByRole('heading', { level: 1 }).waitFor()
    await page.getByRole('tab', { name: /Products/ }).click()
    await page.getByText(name).first().waitFor()
  })
  console.log(`      (cement results: ${afterQ}; combined: ${afterAll})`)
})

await scenario('B. Business directory: search, grid/list, verification, profile', async (page, step) => {
  await step('open businesses', () => go(page, '/businesses'))
  await step('search "Kgale"', async () => {
    await page.getByRole('combobox', { name: 'Search directory' }).fill('Kgale')
    await page.waitForURL(/q=Kgale/)
    await page.getByRole('link', { name: 'Kgale Building Centre' }).first().waitFor()
  })
  await step('switch to list view', async () => {
    await page.getByRole('button', { name: 'List view' }).click()
    await page.waitForURL(/view=list/)
    expect((await page.getByRole('button', { name: 'List view' }).getAttribute('aria-pressed')) === 'true', 'list view not pressed')
  })
  await step('switch back to grid', async () => {
    await page.getByRole('button', { name: 'Grid view' }).click()
    await page.waitForFunction(() => !location.search.includes('view=list'))
  })
  await step('verification filter', async () => {
    await page.getByLabel('Verification', { exact: true }).selectOption('verified')
    await page.waitForURL(/verified=verified/)
    await page.getByRole('link', { name: 'Kgale Building Centre' }).first().waitFor()
    await page.getByLabel('Verification', { exact: true }).selectOption('unverified')
    await page.waitForURL(/verified=unverified/)
    await page.getByText(/No businesses|Nothing matched|Showing/).first().waitFor()
    await page.getByLabel('Verification', { exact: true }).selectOption('verified')
    await page.waitForURL(/verified=verified/)
  })
  await step('open profile', async () => {
    await page.getByRole('link', { name: 'Kgale Building Centre' }).first().click()
    await page.waitForURL(/\/businesses\/kgale-building-centre/)
    expect((await page.getByRole('heading', { level: 1 }).textContent()).trim() === 'Kgale Building Centre', 'wrong profile')
  })
})

await scenario('C. Product discovery: catalogue → detail → supplier', async (page, step) => {
  await step('open products and search', async () => {
    await go(page, '/products')
    await page.getByRole('combobox', { name: 'Search directory' }).fill('solar panel')
    await page.waitForURL(/q=solar/)
    await page.waitForTimeout(400)
  })
  const prod = await step('open the first result', async () => {
    const link = page.getByRole('link', { name: /solar panel/i }).first()
    const t = (await link.textContent()).trim()
    await link.click()
    await page.waitForURL(/\/products\/.+/)
    return t
  })
  await step('detail has specs, price and supplier', async () => {
    await page.getByRole('heading', { name: 'Specifications' }).waitFor()
    await page.getByRole('heading', { name: 'Description' }).waitFor()
    await page.getByRole('link', { name: /View supplier/ }).waitFor()
  })
  await step('supplier profile lists this product', async () => {
    await page.getByRole('link', { name: /View supplier/ }).click()
    await page.waitForURL(/\/businesses\/.+/)
    await page.getByRole('tab', { name: /Products/ }).click()
    await page.getByText(prod).first().waitFor()
  })
})

await scenario('D. Service discovery: search, location, detail, enquiry', async (page, step) => {
  const baselineEnquiries = await step('read the new-enquiries baseline', async () => {
    await go(page, '/admin')
    return poll(async () => statValue(page, 'New enquiries'))
  })
  await step('open services, search', async () => {
    await go(page, '/services')
    await page.getByRole('combobox', { name: 'Search directory' }).fill('solar installation')
    await page.waitForURL(/q=solar/)
    await page.waitForTimeout(400)
  })
  await step('filter by location', async () => {
    await page.getByLabel('Region', { exact: true }).selectOption('north-west')
    await page.waitForURL(/region=north-west/)
    await page.waitForTimeout(300)
    await resultCount(page)
  })
  await step('open a service', async () => {
    await page.locator('h3 a').first().click()
    await page.waitForURL(/\/services\/.+/)
    await page.getByRole('heading', { name: 'Service area' }).waitFor()
  })
  await step('enquiry validation blocks an empty form', async () => {
    await page.getByRole('button', { name: 'Request booking' }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: 'Send request' }).click()
    await page.getByText('Your name is required').waitFor()
    await page.getByText('Email is required').waitFor()
  })
  await step('submit an enquiry', async () => {
    await page.getByLabel('Your name').fill('E2E Tester')
    await L(page, 'Email').fill('e2e@example.com')
    await page.getByLabel('Message').fill('Please quote for a 5kVA installation at my farm.')
    await page.getByRole('button', { name: 'Send request' }).click()
    await page.getByRole('heading', { name: 'Enquiry recorded' }).waitFor()
    await page.getByText(/no email, SMS or call was sent/).waitFor()
    await page.getByRole('button', { name: 'Done' }).click()
  })
  await step('enquiry count increased in admin', async () => {
    await go(page, '/admin')
    await poll(async () => (await statValue(page, 'New enquiries')) === baselineEnquiries + 1)
  })
})

await scenario('E. Map: region filter, marker/list select, preview, profile', async (page, step) => {
  await step('open map', () => go(page, '/map'))
  await step('tiles + markers render', async () => {
    await page.locator('.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
    await page.locator('.fb-cluster, .fb-pin').first().waitFor()
  })
  const total = await step('read plotted count', async () => num(await page.getByText(/businesses plotted/).first().innerText()))
  await step('select a region', async () => {
    await page.getByLabel('Region', { exact: true }).selectOption('chobe')
    await page.waitForURL(/region=chobe/)
    await poll(async () => num(await page.getByText(/businesses plotted/).first().innerText()) < total)
  })
  const first = await step('select first result in list', async () => {
    const row = page.getByRole('complementary', { name: 'Results list' }).getByRole('button').first()
    const name = (await row.locator('span').first().innerText()).split('\n')[0].trim()
    await row.click()
    await page.getByRole('dialog', { name: /preview/ }).waitFor()
    return name
  })
  await step('marker is highlighted', async () => { await page.locator('.fb-pin-selected').first().waitFor({ timeout: 8000 }) })
  await step('preview links to the right profile', async () => {
    await page.getByRole('link', { name: /View profile/ }).click()
    await page.waitForURL(/\/businesses\/.+/)
    const h1 = (await page.getByRole('heading', { level: 1 }).textContent()).trim()
    expect(h1.length > 0 && h1.startsWith(first.slice(0, 8)), `profile "${h1}" vs "${first}"`)
  })
  await step('clicking a map marker also opens the preview', async () => {
    await go(page, '/map?town=kasane')
    await page.locator('.fb-cluster, .fb-pin').first().waitFor({ timeout: 15000 })
    for (let i = 0; i < 6; i++) {
      if (await page.locator('.fb-pin').count()) break
      await page.locator('.fb-cluster').first().click({ force: true })
      await page.waitForTimeout(700)
    }
    await page.locator('.fb-pin').first().click({ force: true })
    await page.getByRole('dialog', { name: /preview/ }).waitFor()
  })
})

// F → J share one browser context so the changes persist between them.
{
  const stamp = 'E2E Trading ' + Math.random().toString(36).slice(2, 6).toUpperCase()
  let bizId = ''
  let counts = {}
  await scenario('F–J. Register → approve → catalogue → persist → reset', async (page, step) => {
    await step('baseline counts from admin', async () => {
      await go(page, '/admin')
      counts.pending = await stable(page, 'Pending submissions')
      counts.total = await stable(page, 'Total businesses')
      counts.published = await stable(page, 'Published businesses')
    })
    // F
    await step('F: wizard blocks empty step', async () => {
      await go(page, '/business/register')
      await page.getByRole('button', { name: /Continue/ }).click()
      await page.getByText('Business name is required').waitFor()
    })
    await step('F: step 1 identity', async () => {
      await page.getByLabel('Business name').fill(stamp)
      await page.getByLabel('Business type').selectOption('Retailer')
      await page.getByLabel('Year established (optional)').fill('2019')
      await page.getByLabel('Short description').fill('Cement, steel and roofing for Palapye builders.')
      await page.getByLabel('Full description').fill('We supply cement, reinforcement steel and roofing to builders and homeowners across Palapye and the Tswapong area.')
      await page.getByRole('button', { name: /Continue/ }).click()
    })
    await step('F: draft survives a refresh', async () => {
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      expect((await page.getByRole('heading', { level: 2, name: 'Category' }).count()) === 1, 'step not restored')
      await page.getByRole('button', { name: /Back/ }).click()
      expect((await page.getByLabel('Business name').inputValue()) === stamp, 'values not preserved')
      await page.getByRole('button', { name: /Continue/ }).click()
    })
    await step('F: step 2 category', async () => {
      await page.getByLabel('Primary category').selectOption('cat-construction-hardware')
      await page.getByRole('button', { name: /Continue/ }).click()
    })
    await step('F: step 3 location', async () => {
      await L(page, 'Region').selectOption({ label: 'Central' })
      await page.getByLabel('Town or village').selectOption({ label: 'Palapye' })
      await page.getByLabel('Street address').fill('Plot 4521, Palapye Industrial')
      await page.getByRole('button', { name: /Continue/ }).click()
    })
    await step('F: step 4 contact validation + fill', async () => {
      await L(page, 'Phone').fill('12')
      await L(page, 'Email').fill('not-an-email')
      await page.getByRole('button', { name: /Continue/ }).click()
      await page.getByText('Enter a valid Botswana phone number').waitFor()
      await page.getByText('Enter a valid email address').waitFor()
      await L(page, 'Phone').fill('+267 71 234 567')
      await L(page, 'Email').fill('orders@e2etrading.example')
      await page.getByRole('button', { name: /Continue/ }).click()
    })
    await step('F: step 5 products and services', async () => {
      await page.getByLabel('Product name').fill('E2E Portland Cement 50kg')
      await page.getByLabel('Short description').fill('General purpose cement for building.')
      await page.getByLabel('Price (BWP)').fill('115')
      await page.getByRole('button', { name: 'Add to listing' }).click()
      await page.getByRole('radio', { name: 'Service' }).click()
      await page.getByLabel('Service name').fill('E2E Site Delivery')
      await page.getByLabel('Short description').fill('Delivery of materials to your site.')
      await page.getByLabel('Pricing').selectOption('quote')
      await page.getByRole('button', { name: 'Add to listing' }).click()
      await page.getByRole('list', { name: 'Added items' }).getByRole('listitem').nth(1).waitFor()
      await page.getByRole('button', { name: /Continue/ }).click()
    })
    await step('F: review requires confirmation, then submits', async () => {
      await page.getByRole('heading', { level: 2, name: 'Review & submit' }).waitFor()
      await page.getByRole('button', { name: 'Submit for review' }).click()
      await page.getByText('Please confirm to submit').waitFor()
      await page.getByRole('checkbox', { name: /I confirm this is demonstration/ }).check()
      await page.getByRole('button', { name: 'Submit for review' }).click()
      await page.getByRole('heading', { name: 'Submission received' }).waitFor()
      bizId = (await page.locator('dd.font-mono').first().innerText()).trim()
      expect(/^biz-\d+$/.test(bizId), `bad id ${bizId}`)
    })
    await step('F: hidden from the public while pending', async () => {
      await go(page, '/businesses?q=' + encodeURIComponent(stamp))
      await page.getByText(/No businesses found/).waitFor()
    })
    await step('F: appears in the admin approval queue (pending count +1)', async () => {
      await go(page, '/admin/approvals')
      await page.getByRole('button', { name: new RegExp(stamp) }).first().waitFor()
      await go(page, '/admin')
      await poll(async () => (await statValue(page, 'Pending submissions')) === counts.pending + 1)
      await poll(async () => (await statValue(page, 'Total businesses')) === counts.total + 1)
    })
    // G
    await step('G: approve with publish + verify', async () => {
      await go(page, '/admin/approvals')
      await page.getByRole('button', { name: new RegExp(stamp) }).first().click()
      await page.getByRole('heading', { level: 3, name: stamp }).waitFor()
      await page.getByRole('button', { name: 'Approve', exact: true }).click()
      const dlg = page.getByRole('dialog')
      await dlg.getByRole('checkbox', { name: /Also mark as verified/ }).check()
      await dlg.getByRole('button', { name: 'Approve', exact: true }).click()
      await dlg.waitFor({ state: 'detached' })
    })
    await step('G: record, status and counts updated consistently', async () => {
      await go(page, '/admin')
      await poll(async () => (await statValue(page, 'Pending submissions')) === counts.pending)
      await poll(async () => (await statValue(page, 'Published businesses')) === counts.published + 1)
      await go(page, `/admin/businesses/${bizId}`)
      await page.getByText('Verified', { exact: true }).first().waitFor()
      await page.getByText('Public', { exact: true }).first().waitFor()
    })
    await step('G: now public with its catalogue', async () => {
      await go(page, '/businesses?q=' + encodeURIComponent(stamp))
      await page.getByRole('link', { name: stamp }).first().click()
      await page.waitForURL(/\/businesses\/.+/)
      await page.getByRole('tab', { name: /Products/ }).click()
      await page.getByText('E2E Portland Cement 50kg').waitFor()
      await go(page, '/map?q=' + encodeURIComponent(stamp))
      await page.getByText(/1 business plotted/).waitFor()
      await page.locator('.fb-pin').first().waitFor({ timeout: 15000 })
    })
    // H
    await step('H: owner adds a product', async () => {
      await go(page, '/business/dashboard?tab=products')
      await page.getByRole('heading', { level: 1, name: stamp }).waitFor()
      await page.getByRole('button', { name: 'Add product' }).first().click()
      const dlg = page.getByRole('dialog')
      await dlg.getByLabel(/^Product name/).fill('E2E Premium Brick Pack')
      await dlg.getByLabel('Description').fill('Premium clay bricks, pallet of 500.')
      await dlg.getByLabel('Price (BWP)').fill('2450')
      await dlg.getByRole('button', { name: 'Add product' }).click()
      await dlg.waitFor({ state: 'detached' })
      await page.getByRole('table').getByText('E2E Premium Brick Pack').waitFor()
    })
    await step('H: product appears in the public catalogue with its supplier', async () => {
      await go(page, '/products?q=' + encodeURIComponent('E2E Premium Brick'))
      await page.getByRole('link', { name: 'E2E Premium Brick Pack' }).click()
      await page.waitForURL(/\/products\/.+/)
      await page.getByText(stamp).first().waitFor()
    })
    await step('H: unpublishing removes it from public', async () => {
      await go(page, '/business/dashboard?tab=products')
      await page.getByRole('button', { name: 'Unpublish E2E Premium Brick Pack' }).click()
      await go(page, '/products?q=' + encodeURIComponent('E2E Premium Brick'))
      await page.getByText(/No products found/).waitFor()
    })
    // I
    await step('I: admin edits a business and it persists across refresh', async () => {
      await go(page, `/admin/businesses/${bizId}?tab=edit`)
      const field = page.getByLabel('Short description')
      await field.fill('Edited by the E2E test.')
      await page.getByRole('button', { name: 'Save changes' }).click()
      await page.getByText('All changes saved.').waitFor()
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      expect((await page.getByLabel('Short description').inputValue()) === 'Edited by the E2E test.', 'edit lost after refresh')
      await go(page, '/businesses/' + (await page.evaluate(() => 0).then(() => stamp.toLowerCase().replace(/[^a-z0-9]+/g, '-'))))
      await page.getByText('Edited by the E2E test.').first().waitFor()
    })
    await step('I: edit is stored in localStorage as a delta', async () => {
      const size = await page.evaluate(() => (localStorage.getItem('findbw:data') ?? '').length)
      expect(size > 100 && size < 200000, `unexpected stored size ${size}`)
    })
    // moderation extras
    await step('suspend hides the listing publicly, reactivate restores it', async () => {
      await go(page, `/admin/businesses/${bizId}`)
      await page.getByRole('button', { name: 'More actions' }).click()
      await page.getByRole('menuitem', { name: 'Suspend' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Suspend listing' }).click()
      await go(page, '/businesses?q=' + encodeURIComponent(stamp))
      await page.getByText(/No businesses found/).waitFor()
      await go(page, `/admin/businesses/${bizId}`)
      await page.getByRole('button', { name: 'More actions' }).click()
      await page.getByRole('menuitem', { name: 'Reactivate' }).click()
      await go(page, '/businesses?q=' + encodeURIComponent(stamp))
      await page.getByRole('link', { name: stamp }).first().waitFor()
    })
    await step('activity history recorded the decisions', async () => {
      await go(page, `/admin/businesses/${bizId}?tab=activity`)
      await page.getByText(/was approved and published/).waitFor()
      await page.getByText(/was submitted for approval/).waitFor()
      await page.getByText(/was suspended/).waitFor()
    })
    // J
    await step('J: restore seed data', async () => {
      await go(page, '/admin/settings')
      await page.getByRole('button', { name: /Restore seed data/ }).click()
      const dlg = page.getByRole('dialog')
      const confirm = dlg.getByRole('button', { name: 'Restore seed data' })
      expect(await confirm.isDisabled(), 'confirm should be disabled until RESTORE is typed')
      await dlg.getByLabel('Type RESTORE to confirm').fill('RESTORE')
      await confirm.click()
      await dlg.waitFor({ state: 'detached' })
    })
    await step('J: original records are back, additions are gone', async () => {
      await go(page, '/admin')
      await poll(async () => (await statValue(page, 'Total businesses')) === counts.total)
      await poll(async () => (await statValue(page, 'Pending submissions')) === counts.pending)
      await go(page, '/businesses?q=' + encodeURIComponent(stamp))
      await page.getByText(/No businesses found/).waitFor()
      await go(page, '/businesses/kgale-building-centre')
      await page.getByRole('heading', { level: 1, name: 'Kgale Building Centre' }).waitFor()
      const stored = await page.evaluate(() => localStorage.getItem('findbw:data'))
      expect(stored === null || stored.length < 400, 'stored delta not cleared')
    })
  })
}

await scenario('K. Pagination boundaries and URL state', async (page, step) => {
  await step('page 1 of businesses', () => go(page, '/businesses'))
  const total = await step('count', () => resultCount(page))
  await step('go to page 2', async () => {
    await page.getByRole('button', { name: 'Page 2', exact: true }).click()
    await page.waitForURL(/page=2/)
    await page.getByText(/Showing 13–24 of/).waitFor()
  })
  await step('last page boundary is exact', async () => {
    const pages = Math.ceil(total / 12)
    await go(page, `/businesses?page=${pages}`)
    const rem = total - (pages - 1) * 12
    await page.getByText(new RegExp(`Showing ${(pages - 1) * 12 + 1}–${total} of`)).waitFor()
    expect((await page.locator('article, .group.relative').count()) >= rem, 'missing cards on last page')
  })
  await step('page beyond the end is clamped', async () => {
    await go(page, '/businesses?page=999')
    await page.getByText(/Showing .* of/).waitFor()
  })
  await step('changing a filter resets the page', async () => {
    await go(page, '/businesses?page=3')
    await page.getByLabel('Category', { exact: true }).selectOption('construction-hardware')
    await page.waitForFunction(() => !location.search.includes('page='))
  })
  await step('clearing one filter preserves the others; Clear all resets', async () => {
    await go(page, '/businesses?q=hardware&category=construction-hardware&town=gaborone')
    await page.getByRole('button', { name: 'Remove filter: “hardware”' }).click()
    await page.waitForFunction(() => !location.search.includes('q=') && location.search.includes('category=') && location.search.includes('town='))
    await page.getByRole('button', { name: 'Clear all' }).last().click()
    await page.waitForFunction(() => location.search === '')
  })
  await step('sorting by name orders results A–Z', async () => {
    await go(page, '/businesses?sort=name')
    const names = await page.locator('article h3, h3 a').allTextContents()
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }))
    expect(JSON.stringify(names) === JSON.stringify(sorted), 'not sorted: ' + names.slice(0, 4))
  })
  await step('no-results state offers a way out', async () => {
    await go(page, '/products?q=zzzxqj')
    await page.getByRole('heading', { name: 'No products found' }).waitFor()
    await page.getByRole('button', { name: 'Clear all filters' }).click()
    await page.waitForFunction(() => !location.search.includes('q='))
  })
})

await scenario('L. Unified search groups results and links to records', async (page, step) => {
  await step('discover search', async () => {
    await go(page, '/discover')
    await page.getByRole('combobox', { name: 'Search directory' }).fill('solar')
    await page.waitForURL(/q=solar/)
    await page.getByRole('heading', { name: /Businesses/ }).first().waitFor()
    await page.getByRole('heading', { name: /Products/ }).first().waitFor()
    await page.getByRole('heading', { name: /Services/ }).first().waitFor()
  })
  await step('typeahead suggestions navigate straight to a record', async () => {
    await go(page, '/discover')
    await page.getByRole('combobox', { name: 'Search directory' }).fill('kgale')
    await page.getByRole('option').first().waitFor()
    await page.getByRole('option').first().click()
    await page.waitForURL(/\/(businesses|products|services|categories|towns)\//)
  })
  await step('recent searches are remembered', async () => {
    await go(page, '/discover')
    await page.getByRole('combobox', { name: 'Search directory' }).fill('tyres')
    await page.getByRole('combobox', { name: 'Search directory' }).press('Enter')
    await go(page, '/discover')
    await page.getByRole('button', { name: 'tyres', exact: true }).first().waitFor()
  })
})

await scenario('M. Admin CSV exports reflect the current filter', async (page, step) => {
  await step('businesses export respects filter', async () => {
    await go(page, '/admin/businesses?status=published&region=chobe')
    await page.getByText(/Showing 1–/).waitFor()
    const shown = num((await page.getByText(/Showing .* of/).first().innerText()).split(' of ')[1])
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
    const file = path.join(OUT, 'businesses.csv')
    await dl.saveAs(file)
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
    expect(lines[0].startsWith('ID,Name,Category'), 'header: ' + lines[0])
    expect(lines.length - 1 === shown, `csv rows ${lines.length - 1} vs filtered ${shown}`)
    expect(lines.slice(1).every((l) => l.includes('Chobe') && l.includes('published')), 'csv has rows outside the filter')
  })
  await step('report export uses report filters', async () => {
    await go(page, '/admin/reports?region=chobe')
    await page.getByRole('heading', { name: 'By region' }).waitFor()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export filtered businesses' }).click()])
    const file = path.join(OUT, 'report.csv')
    await dl.saveAs(file)
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
    expect(lines.length > 5 && lines.slice(1).every((l) => l.includes('Chobe')), 'report csv outside filter')
  })
  await step('products export', async () => {
    await go(page, '/admin/products?q=cement')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
    const file = path.join(OUT, 'products.csv')
    await dl.saveAs(file)
    const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
    expect(lines.length > 5 && lines.slice(1).every((l) => /cement/i.test(l)), 'products csv not filtered')
  })
})

await scenario('N. Admin: reject with reason, request changes, delete cascade, users, taxonomy protection', async (page, step) => {
  await step('reject requires a reason and records it', async () => {
    await go(page, '/admin/approvals')
    const name = (await page.locator('aside[aria-label="Submissions"] button').first().locator('span.truncate').first().innerText()).trim()
    await page.getByRole('button', { name: /Reject/ }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.getByRole('button', { name: 'Reject submission' }).click()
    await dlg.getByText(/reason of at least 10 characters/).waitFor()
    await dlg.getByLabel('Reason for rejection').fill('Contact details could not be verified by the team.')
    await dlg.getByRole('button', { name: 'Reject submission' }).click()
    await dlg.waitFor({ state: 'detached' })
    await page.getByRole('tab', { name: /Rejected/ }).click()
    await page.getByRole('button', { name: new RegExp(name) }).first().waitFor()
  })
  await step('request changes sends it back to the owner', async () => {
    await go(page, '/admin/approvals')
    const name = (await page.locator('aside[aria-label="Submissions"] button').first().locator('span.truncate').first().innerText()).trim()
    await page.getByRole('button', { name: 'Request changes' }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('What needs to change?').fill('Please add a full street address and opening hours.')
    await dlg.getByRole('button', { name: 'Request changes' }).click()
    await dlg.waitFor({ state: 'detached' })
    await page.getByRole('tab', { name: /Changes requested/ }).click()
    await page.getByRole('button', { name: new RegExp(name) }).first().waitFor()
  })
  await step('delete cascades to catalogue and keeps the dataset consistent', async () => {
    await go(page, '/admin/businesses/biz-020')
    const h = (await page.getByRole('heading', { level: 2 }).first().innerText()).trim()
    await page.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete business…' }).click()
    await page.getByRole('dialog').getByText(/Also deleted:/).waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete business' }).click()
    await page.waitForURL(/\/admin\/businesses$/)
    await go(page, '/admin/businesses/biz-020')
    await page.getByText('Business not found').waitFor()
    await go(page, '/admin/settings')
    await page.getByRole('button', { name: 'Run integrity check' }).click()
    await page.getByText(/No problems found/).waitFor()
    console.log(`      (deleted "${h}")`)
  })
  await step('referenced category cannot be deleted; unused one can', async () => {
    await go(page, '/admin/categories')
    await page.getByRole('button', { name: 'Actions for Construction & Hardware' }).click()
    await page.getByRole('menuitem', { name: 'Delete…' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete category' }).click()
    await page.getByRole('dialog').getByText(/is still used by/).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Add category' }).click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('Name').fill('construction & hardware')
    await dlg.getByRole('button', { name: 'Add category' }).click()
    await dlg.getByText(/already exists/).waitFor()
    await dlg.getByLabel('Name').fill('E2E Test Category')
    await dlg.getByRole('button', { name: 'Add category' }).click()
    await dlg.waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Actions for E2E Test Category' }).click()
    await page.getByRole('menuitem', { name: 'Delete…' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete category' }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached' })
  })
  await step('disabled category disappears from public filters', async () => {
    await go(page, '/admin/categories')
    await page.getByRole('button', { name: 'Actions for Fashion & Retail' }).click()
    await page.getByRole('menuitem', { name: 'Disable' }).click()
    await go(page, '/businesses')
    const opts = await page.getByLabel('Category', { exact: true }).locator('option').allTextContents()
    expect(!opts.includes('Fashion & Retail'), 'disabled category still offered')
  })
  await step('user role editing and account controls', async () => {
    await go(page, '/admin/users')
    await page.getByLabel('Search users').fill('Kagiso')
    await page.getByRole('button', { name: 'Actions for Kagiso Motsamai' }).click()
    await page.getByRole('menuitem', { name: 'Edit role & details' }).click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('Role').selectOption('moderator')
    await dlg.getByRole('button', { name: 'Save changes' }).click()
    await dlg.waitFor({ state: 'detached' })
    await page.getByRole('row', { name: /Kagiso Motsamai/ }).getByText('Moderator').waitFor()
    await page.getByRole('button', { name: 'Actions for Kagiso Motsamai' }).click()
    await page.getByRole('menuitem', { name: 'Deactivate account' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click()
    await page.getByRole('row', { name: /Kagiso Motsamai/ }).getByText('Inactive').waitFor()
    // an owner can't be demoted while they own businesses
    await page.getByLabel('Search users').fill('Naledi')
    await page.getByRole('button', { name: 'Actions for Naledi Molefe' }).click()
    await page.getByRole('menuitem', { name: 'Edit role & details' }).click()
    await page.getByRole('dialog').getByLabel('Role').selectOption('consumer')
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click()
    await page.getByRole('dialog').getByText(/must stay a business owner/).waitFor()
  })
  await step('settings drive public behaviour (enquiries off, banner off)', async () => {
    await go(page, '/admin/settings')
    await page.getByRole('switch', { name: /Allow enquiries/ }).click()
    await page.getByRole('switch', { name: /Show the demo banner/ }).click()
    await page.getByRole('button', { name: 'Save settings' }).click()
    await page.getByText('Settings are up to date.').waitFor()
    await go(page, '/businesses/kgale-building-centre')
    expect((await page.getByRole('button', { name: 'Send an enquiry' }).count()) === 0, 'enquiry button still shown')
    expect((await page.getByText('Fictional demo data').count()) === 0, 'banner still shown')
  })
})

await scenario('O. Direct navigation and refresh on every dynamic route', async (page, step) => {
  const routes = [
    ['/businesses/okavango-solar-works', 'Okavango Solar Works'],
    ['/categories/solar-renewable', 'Solar & Renewable Energy'],
    ['/regions/north-west', 'Businesses in North-West'],
    ['/towns/maun', 'Businesses in Maun'],
    ['/admin/businesses/biz-004', 'Okavango Solar Works'],
  ]
  for (const [r, h] of routes) {
    await step(`${r} (load, refresh)`, async () => {
      await go(page, r)
      await page.getByRole('heading', { name: h }).first().waitFor()
      await page.reload({ waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: h }).first().waitFor()
    })
  }
  await step('unknown slug shows a friendly not-found state', async () => {
    await go(page, '/businesses/definitely-not-real')
    await page.getByRole('heading', { name: /couldn’t find that business/ }).waitFor()
    await go(page, '/products/nope')
    await page.getByRole('heading', { name: /couldn’t find that product/ }).waitFor()
  })
})

await scenario('P. Responsive: mobile layouts have no horizontal overflow', async (page, step) => {
  const paths = ['/', '/discover', '/businesses', '/products', '/services', '/map', '/categories', '/regions', '/towns', '/businesses/kgale-building-centre', '/products/portland-cement-32-5r-50kg-kgale-building-centre', '/categories/construction-hardware', '/regions/chobe', '/towns/maun', '/business/register', '/business/dashboard', '/business/dashboard?tab=profile', '/business/dashboard?tab=products', '/admin', '/admin/businesses', '/admin/businesses/biz-004', '/admin/businesses/biz-004?tab=edit', '/admin/approvals', '/admin/products', '/admin/services', '/admin/categories', '/admin/regions', '/admin/towns', '/admin/users', '/admin/reports', '/admin/settings']
  for (const p of paths) {
    await step(`${p} @ 390px`, async () => {
      await page.setViewportSize({ width: 390, height: 800 })
      await go(page, p)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over <= 1, `horizontal overflow ${over}px`)
    })
  }
  await step('mobile navigation opens', async () => {
    await go(page, '/')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Businesses' }).click()
    await page.waitForURL(/\/businesses/)
  })
  await step('admin drawer opens on mobile', async () => {
    await go(page, '/admin')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Reports' }).click()
    await page.waitForURL(/\/admin\/reports/)
  })
})


await scenario('Q. Map degrades gracefully when tiles cannot load', async (page, step, ctx) => {
  await ctx.route(/tile\.openstreetmap\.org/, (route) => route.abort())
  await step('open map with the tile server unreachable', () => go(page, '/map'))
  await step('a clear notice appears with a retry action', async () => {
    await page.getByRole('alert').filter({ hasText: /Map tiles couldn’t be loaded/ }).waitFor({ timeout: 20000 })
    await page.getByRole('button', { name: /Retry/ }).waitFor()
  })
  await step('business markers are still plotted and usable', async () => {
    await page.locator('.fb-cluster, .fb-pin').first().waitFor()
    await page.getByRole('complementary', { name: 'Results list' }).getByRole('button').first().click()
    await page.getByRole('dialog', { name: /preview/ }).waitFor()
  })
})

await scenario('R. Clipboard copy, tel/mailto links and dialog keyboard handling', async (page, step) => {
  await step('open a profile', () => go(page, '/businesses/kgale-building-centre'))
  await step('contact links are real tel:/mailto: links', async () => {
    const tel = await page.locator('a[href^="tel:"]').first().getAttribute('href')
    const mail = await page.locator('a[href^="mailto:"]').first().getAttribute('href')
    expect(/^tel:\+?\d+$/.test(tel), 'bad tel link ' + tel)
    expect(/^mailto:.+@.+/.test(mail), 'bad mailto link ' + mail)
  })
  await step('copy phone puts the number on the clipboard and confirms', async () => {
    const phone = (await page.getByRole('link', { name: /^\+267/ }).first().innerText()).trim()
    await page.getByRole('button', { name: 'Copy phone' }).click()
    await page.getByText('Phone copied to clipboard').waitFor()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip === phone, `clipboard "${clip}" vs "${phone}"`)
  })
  await step('enquiry dialog traps focus and closes on Escape', async () => {
    await page.getByRole('button', { name: 'Send an enquiry' }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.waitFor()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100) // base-ui parks focus on a guard for a tick before wrapping it into the dialog
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
      expect(inside, 'focus escaped the dialog on Tab #' + (i + 1))
    }
    await page.keyboard.press('Escape')
    await dlg.waitFor({ state: 'detached' })
  })
}, { permissions: ['clipboard-read', 'clipboard-write'] })

await scenario('S. Report date filters agree with their CSV export', async (page, step) => {
  await step('filter by a created-date range', async () => {
    await go(page, '/admin/reports?from=2025-01-01&to=2025-12-31')
    await page.getByRole('heading', { name: 'By region' }).waitFor()
  })
  await step('KPI, table total and CSV row count agree', async () => {
    const kpi = await statValue(page, 'Businesses', 'main [aria-live="polite"]')
    const total = num(await page.getByRole('row', { name: /Total/ }).first().locator('th').nth(1).innerText())
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export filtered businesses' }).click()])
    const file = path.join(OUT, 'report-dates.csv')
    await dl.saveAs(file)
    const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/)
    expect(kpi > 0 && kpi < 300, `kpi ${kpi}`)
    expect(kpi === total && kpi === lines.length - 1, `kpi ${kpi}, table total ${total}, csv ${lines.length - 1}`)
    expect(lines.slice(1).every((l) => /2025-\d\d-\d\dT/.test(l)), 'csv contains records outside the date range')
  })
  await step('reset filters restores the full set', async () => {
    await page.getByRole('button', { name: /Reset filters/ }).click()
    await poll(async () => (await statValue(page, 'Businesses', 'main [aria-live="polite"]')) === 300)
  })
})

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`)
process.exit(failed.length ? 1 : 0)
