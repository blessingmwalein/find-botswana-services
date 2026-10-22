# Find Botswana — Implementation Status

_Last updated: Phase 1 (audit and foundation) — in progress_

This file tracks the transformation of the generated Find Botswana prototype into a complete, data-driven product simulation.
It is updated at the end of every phase.

---

## 1. Audit of the original repository

### Stack

| Area | Finding |
|---|---|
| Framework | Next.js 16.4.0 (App Router, Turbopack), React 19.2 |
| Styling | Tailwind CSS 4 (`@theme inline`), `tw-animate-css`, `shadcn/tailwind.css` |
| UI library | shadcn (`base-nova`) on `@base-ui/react`; only `components/ui/button.tsx` exists and was unused |
| Icons | `lucide-react` |
| Map library | **None** — the "map" was absolutely-positioned buttons on a gradient |
| Package manager | pnpm (`pnpm@12.3.4`). The `pnpm` shim on the dev machine is broken; run `node <pnpm-home>/.tools/pnpm/12.3.4/node_modules/pnpm/bin/pnpm.mjs …` |
| State management | None — local `useState` inside each component |
| Routing | `app/page.tsx` + one `app/[...slug]/page.tsx` catch-all rendering one giant conditional component |
| Type safety | `typescript.ignoreBuildErrors: true` in `next.config.mjs` (masking errors) |

### Original files

| File | Role | Verdict |
|---|---|---|
| `app/layout.tsx` | Root layout, metadata, analytics | Kept |
| `app/globals.css` | Tokens: bg `#f7f8f5`, fg `#202720`, primary `#176b45`, border `#e3e7e1`, muted | **Kept as the design source of truth**; tokens extended |
| `components/find-botswana-app.tsx` | Homepage **and** admin portal toggled by `useState` (admin was not a route) | Visual design preserved, rebuilt as real routes |
| `components/portal-page.tsx` | Directory / Detail / Register / Admin / OwnerDashboard in one conditional | Replaced by real pages and components |
| `lib/mock-data.ts` | 16 businesses, 60 products, 25 services, 12 categories, 8 towns, 6 regions | Replaced by the deterministic seed system; original 16 business names retained as curated seeds |

### Defects found in the original

- Admin portal was not routable; no browser refresh, back button or deep link.
- All records referenced by array index / numeric string; products linked to suppliers by `i % businesses.length`.
- Business coordinates were `-24.65 + i*0.31, 25.91 + i*0.43` — later records fell **outside Botswana**.
- Map was decorative; pins positioned with `(i*17)%78 %`.
- Hardcoded numbers disagreeing with data: "Explore 1,248 local listings", category counts (184, 126 …), approvals badge "37", region bar chart.
- `Add business`, `Filters`, `View all categories`, `Explore all`, `List your business` (hero CTA), `Demo admin` and `View profile` had no real behaviour.
- `/categories/*` and `/regions/*` fell through to the generic Discover page; no `/towns/*`.
- Registration wizard was a single input that created nothing.
- Admin "create" cloned `records[0]`; edits were local to the admin component and never reached the public site.
- No persistence, no pagination, no sorting, no URL-synchronised filters, no validation, no empty/error/loading states.
- Search matched a single concatenated string with `includes`; no suggestions, no grouped results.
- Product/service price stored as display strings (`'P 98.00'`, `'Request a quote'`), so numeric sorting was impossible.
- Verification, approval and publication were collapsed into one `status` string.

---

## 2. Target architecture

```
app/                      routes (thin) — public routes, /admin routes, not-found
components/
  ui/                     primitives (button, badge, card, dialog, toast, tabs, pagination …)
  layout/                 public header/footer, admin shell
  shared/                 cards, filters, search box, contact panel, hours, pagination …
  map/                    Leaflet explorer (client only)
  pages/                  page-level client components (home, directories, details …)
  owner/                  business owner workspace
  admin/                  admin portal screens
lib/
  types.ts                entity types
  seed/                   deterministic seed data (PRNG, locations, categories, catalog, generators)
  store/                  central store, persistence (localStorage delta), actions, hooks
  search/                 normalisation, indexes, filtering/sorting engines
  validate-data.ts        referential-integrity validation
  geo.ts format.ts csv.ts use-query-state.ts …
scripts/validate-data.ts  CLI integrity check (`pnpm validate:data`)
```

Visibility rules (`lib/rules.ts`): a business is public iff `approvalStatus = approved` **and** `listingStatus = published`.
A product/service is public iff `publicationStatus = published` **and** its business is public.
Verification is independent of both.

---

## 3. Progress checklist

_Legend: ☐ not started · ◐ in progress · ☑ done_

### Phase 1 — Audit and foundation
- ☑ Repository audit
- ◐ Types, seed data (300 / 1,500 / 450 / 20 / 60+ / 30 / 150 / 250), validation
- ☐ Store, persistence, reset
- ☐ Search/filter engine, URL state

### Phase 2 — Public discovery
- ☐ Home · Discover · Businesses · Products · Services · Map

### Phase 3 — Detail pages
- ☐ Business · Product · Service · Category · Region · Town

### Phase 4 — Business owner
- ☐ Registration wizard · Dashboard (profile, catalogue, enquiries)

### Phase 5 — Administration
- ☐ Overview · Businesses · Business detail · Approvals · Products · Services · Categories · Regions · Towns · Users · Reports · Settings

### Phase 6 — Quality assurance
- ☐ Scenarios A–J, build, responsive review

---

## 4. Known limitations (will be extended)

- All data is fictional. Business coordinates are illustrative offsets around real town centres and do not identify real premises.
- There is no real backend, authentication or email delivery. Enquiries are stored locally; nothing is sent.
