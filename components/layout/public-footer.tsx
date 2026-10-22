import Link from 'next/link'
import { Logo } from './logo'

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Discover', href: '/discover' },
      { label: 'Businesses', href: '/businesses' },
      { label: 'Products', href: '/products' },
      { label: 'Services', href: '/services' },
      { label: 'Explore map', href: '/map' },
    ],
  },
  {
    title: 'Browse by',
    links: [
      { label: 'Categories', href: '/categories' },
      { label: 'Regions', href: '/regions' },
      { label: 'Towns', href: '/towns' },
    ],
  },
  {
    title: 'For businesses',
    links: [
      { label: 'List your business', href: '/business/register' },
      { label: 'Owner dashboard', href: '/business/dashboard' },
      { label: 'Demo admin', href: '/admin' },
    ],
  },
]

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid grid-cols-1 max-w-[1240px] gap-10 px-5 py-10 text-xs text-ink-muted lg:grid-cols-[1.4fr_2fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm leading-5">Find Botswana is a fictional product demonstration. All businesses, products, services, contacts and map positions are sample data.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{col.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-brand">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  )
}
