'use client'

import { ArrowRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSettings } from '@/lib/store/hooks'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

export const PUBLIC_NAV = [
  { label: 'Discover', href: '/discover' },
  { label: 'Businesses', href: '/businesses' },
  { label: 'Products', href: '/products' },
  { label: 'Services', href: '/services' },
  { label: 'Explore map', href: '/map' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const settings = useSettings()

  useEffect(() => setOpen(false), [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {settings.showDemoBanner && (
        <div className="border-b border-line bg-canvas px-5 py-2 text-center text-[11px] text-ink-muted">
          A national business directory for discovering local suppliers, products and services. <span className="font-medium text-brand">Fictional demo data</span>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[13px] font-medium text-ink-muted lg:flex">
            {PUBLIC_NAV.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} className={cn('transition-colors hover:text-brand', isActive(item.href) && 'font-semibold text-brand')}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/business/dashboard" className="hidden text-[12px] font-medium text-ink-muted transition-colors hover:text-brand xl:block">
              Owner dashboard
            </Link>
            <Link href="/admin" className="hidden text-[12px] font-medium text-ink-muted transition-colors hover:text-brand md:block">
              Demo admin
            </Link>
            <Link href="/business/register" className="hidden rounded-lg bg-brand px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-forest sm:block">
              List your business <ArrowRight className="ml-1 inline size-3.5" />
            </Link>
            <button type="button" onClick={() => setOpen(!open)} className="rounded-lg border border-[#d7dfd7] p-2 lg:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-nav">
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {open && (
          <div id="mobile-nav" className="border-t border-line bg-white px-5 py-4 lg:hidden">
            <nav aria-label="Mobile" className="flex flex-col gap-1 text-sm">
              {PUBLIC_NAV.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} className={cn('rounded-lg px-2 py-2.5', isActive(item.href) ? 'bg-mint font-semibold text-brand' : 'text-ink')}>
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-divider" />
              <Link href="/business/register" className="rounded-lg px-2 py-2.5 font-semibold text-brand">
                List your business
              </Link>
              <Link href="/business/dashboard" className="rounded-lg px-2 py-2.5 font-medium text-ink-muted">
                Owner dashboard
              </Link>
              <Link href="/admin" className="rounded-lg px-2 py-2.5 font-medium text-ink-muted">
                Open demo admin
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
