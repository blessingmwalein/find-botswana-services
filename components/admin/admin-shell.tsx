'use client'

import { BarChart3, Building2, CircleHelp, ClipboardList, FileText, Grid2X2, LayoutDashboard, MapPin, Menu, Package, Settings, Store, Users, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DemoBadge, Logo } from '@/components/layout/logo'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useData } from '@/lib/store/hooks'
import { isInApprovalQueue } from '@/lib/rules'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Businesses', href: '/admin/businesses', icon: Building2 },
  { label: 'Approvals', href: '/admin/approvals', icon: ClipboardList },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Services', href: '/admin/services', icon: FileText },
  { label: 'Categories', href: '/admin/categories', icon: Grid2X2 },
  { label: 'Regions', href: '/admin/regions', icon: MapPin },
  { label: 'Towns', href: '/admin/towns', icon: Store },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

function useActive() {
  const pathname = usePathname()
  const active = NAV.slice().reverse().find((n) => (n.href === '/admin' ? pathname === '/admin' : pathname === n.href || pathname.startsWith(`${n.href}/`)))
  return { pathname, active: active ?? NAV[0] }
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const data = useData()
  const { active } = useActive()
  const pending = data.businesses.filter(isInApprovalQueue).length
  return (
    <>
      <div className="px-6 py-7">
        <Logo dark />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9fbda7]">Workspace</p>
        <nav aria-label="Administration" className="flex flex-col gap-1">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active.href === href ? 'page' : undefined}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition', active.href === href ? 'bg-white/12 font-semibold text-white' : 'text-on-forest hover:bg-white/[0.07] hover:text-white')}
            >
              <Icon className="size-4" />
              {label}
              {label === 'Approvals' && pending > 0 && <span className="ml-auto rounded-full bg-[#c5ddc9] px-1.5 py-0.5 text-[10px] font-bold text-forest">{pending}</span>}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10 p-5">
        <Link href="/" onClick={onNavigate} className="text-xs text-on-forest hover:text-white">
          ← Back to public directory
        </Link>
      </div>
    </>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { pathname, active } = useActive()
  const [open, setOpen] = useState(false)
  const [help, setHelp] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="min-h-screen bg-canvas-admin text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line-strong bg-forest text-white lg:flex">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-forest/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[260px] flex-col bg-forest text-white shadow-2xl">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-on-forest hover:bg-white/10">
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-line-strong bg-white px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg border border-[#d7dfd7] p-2 lg:hidden">
              <Menu className="size-4" />
            </button>
            <div>
              <p className="text-xs text-ink-faint">
                Demo workspace / <span className="text-ink">{active.label}</span>
              </p>
              <h1 className="text-lg font-semibold tracking-[-0.02em] text-forest">{active.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DemoBadge className="hidden sm:inline-flex" />
            <button type="button" onClick={() => setHelp(true)} aria-label="About this demo workspace" className="rounded-lg p-2 hover:bg-[#f1f5f1]">
              <CircleHelp className="size-4 text-ink-muted" />
            </button>
            <div title="Signed in as Admin User (demo identity)" className="grid grid-cols-1 size-8 place-items-center rounded-full bg-sage text-xs font-bold text-brand">
              AU
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1240px] p-5 lg:p-8">
          {children}
        </main>
      </div>

      <Modal
        open={help}
        onOpenChange={setHelp}
        title="About this demo workspace"
        footer={
          <Button variant="brand" size="md" onClick={() => setHelp(false)}>
            Got it
          </Button>
        }
      >
        <ul className="grid grid-cols-1 gap-3 text-sm leading-6 text-ink-muted">
          <li>
            <span className="font-semibold text-ink">Everything here is real within the demo.</span> Approving, editing or deleting a record changes the same dataset the public site reads.
          </li>
          <li>
            <span className="font-semibold text-ink">Changes live in this browser.</span> They are saved to localStorage and survive a refresh. Use <em>Settings → Restore seed data</em> to start over.
          </li>
          <li>
            <span className="font-semibold text-ink">No real sign-in.</span> You are always “Admin User”; there is no authentication in this product demonstration.
          </li>
        </ul>
      </Modal>
    </div>
  )
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-forest">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
