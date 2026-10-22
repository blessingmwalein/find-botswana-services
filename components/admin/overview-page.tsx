'use client'

import { ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ActivityTimeline, BarList, ColumnChart, Panel, StackedBar, StatCard } from '@/components/admin/widgets'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { BizLogo } from '@/components/ui/art'
import { buttonVariants } from '@/components/ui/button'
import { formatNumber, timeAgo } from '@/lib/format'
import { businessLifecycle, isInApprovalQueue } from '@/lib/rules'
import { useIndex } from '@/lib/store/hooks'
import { parentCategories } from '@/lib/store/indexes'
import { countSince, groupCount, referenceTime, weeklyBuckets } from '@/lib/store/stats'

export function AdminOverview() {
  const idx = useIndex()
  const data = idx.data
  const [greeting, setGreeting] = useState('Welcome back, admin.')
  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(`${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, admin.`)
  }, [])

  const s = useMemo(() => {
    const ref = referenceTime(data)
    const published = idx.publicBusinesses
    const queue = data.businesses.filter(isInApprovalQueue)
    const verified = data.businesses.filter((b) => b.verificationStatus === 'verified')
    const byRegion = groupCount(published, (b) => b.regionId)
    const regionData = data.regions.map((r) => ({ label: r.name, value: byRegion.get(r.id) ?? 0 })).sort((a, b) => b.value - a.value)
    const catData = parentCategories(idx)
      .map((c) => {
        const ids = idx.categoryTree.get(c.id)!
        return { id: c.slug, label: c.name, value: published.filter((b) => b.categoryIds.some((x) => ids.has(x))).length }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    const lifecycle = groupCount(data.businesses, (b) => businessLifecycle(b))
    return {
      ref,
      published,
      queue: queue.sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '')),
      verified,
      regionData,
      catData,
      lifecycle,
      weekly: weeklyBuckets(data.businesses.map((b) => b.createdAt), 12, ref),
      newBiz: countSince(data.businesses.map((b) => b.createdAt), 30, ref),
      newProducts: countSince(data.products.map((p) => p.createdAt), 30, ref),
      newServices: countSince(data.services.map((x) => x.createdAt), 30, ref),
      newEnquiries: countSince(data.enquiries.map((e) => e.createdAt), 30, ref),
      recent: data.businesses.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      activity: data.activities.slice().sort((a, b) => b.at.localeCompare(a.at)),
    }
  }, [data, idx])

  const [activityShown, setActivityShown] = useState(8)
  const open = data.enquiries.filter((e) => e.status === 'new').length
  const activeUsers = data.users.filter((u) => u.status === 'active').length

  return (
    <>
      <AdminPageHeader
        title={greeting}
        description="Here’s what’s happening across your directory."
        actions={
          <Link href="/admin/businesses?new=1" className={buttonVariants({ variant: 'brand', size: 'md' })}>
            <Plus /> Add business
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total businesses" value={data.businesses.length} pill={`+${s.newBiz}`} note="added in the last 30 days" href="/admin/businesses" />
        <StatCard label="Published businesses" value={s.published.length} note={`${Math.round((s.published.length / Math.max(1, data.businesses.length)) * 100)}% of all listings are public`} href="/admin/businesses?status=published" />
        <StatCard label="Pending submissions" value={s.queue.length} pill={s.queue.length ? 'Needs review' : 'All clear'} note="in the approval queue" href="/admin/approvals" />
        <StatCard label="Verified listings" value={s.verified.length} note={`${Math.round((s.verified.length / Math.max(1, data.businesses.length)) * 100)}% of all businesses`} href="/admin/businesses?verified=verified" />
        <StatCard label="Products" value={data.products.length} pill={`+${s.newProducts}`} note={`${formatNumber(idx.publicProducts.length)} publicly visible`} href="/admin/products" />
        <StatCard label="Services" value={data.services.length} pill={`+${s.newServices}`} note={`${formatNumber(idx.publicServices.length)} publicly visible`} href="/admin/services" />
        <StatCard label="New enquiries" value={open} pill={`+${s.newEnquiries}`} note={`${data.enquiries.length} received in total`} />
        <StatCard label="Active users" value={activeUsers} note={`${data.users.length} accounts in total`} href="/admin/users" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Listings by region" subtitle="Published businesses across Botswana's districts">
          <ColumnChart data={s.regionData} ariaLabel="Published businesses by region" />
        </Panel>
        <Panel
          title="Recent registrations"
          action={
            <Link href="/admin/businesses?sort=newest" className="text-xs font-semibold text-brand hover:text-forest">
              View all
            </Link>
          }
        >
          <ul className="flex flex-col gap-4">
            {s.recent.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/businesses/${b.id}`} className="flex items-center gap-3 hover:opacity-80">
                  <BizLogo business={b} className="size-8 rounded-lg text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{b.name}</p>
                    <p className="text-[10px] text-ink-faint">
                      {idx.townById.get(b.townId)?.name} · {timeAgo(b.createdAt, s.ref)}
                    </p>
                  </div>
                  <span title={businessLifecycle(b)} className={`size-2 rounded-full ${businessLifecycle(b) === 'published' ? 'bg-[#4f9c68]' : 'bg-[#c79d4d]'}`} />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/businesses" className="mt-6 block w-full border-t border-divider pt-4 text-xs font-semibold text-brand">
            View all businesses <ArrowRight className="ml-1 inline size-3" />
          </Link>
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Category distribution" subtitle="Published businesses per main category">
          <BarList data={s.catData} hrefFor={(d) => `/admin/businesses?category=${d.id}`} />
        </Panel>
        <Panel title="Listing status" subtitle="Approval and publication across every business">
          <StackedBar
            segments={[
              { label: 'Published', value: s.lifecycle.get('published') ?? 0, color: '#176b45' },
              { label: 'Pending approval', value: s.lifecycle.get('pending') ?? 0, color: '#c79d4d' },
              { label: 'Changes requested', value: s.lifecycle.get('changes_requested') ?? 0, color: '#e0c27f' },
              { label: 'Draft', value: s.lifecycle.get('draft') ?? 0, color: '#9fb0a3' },
              { label: 'Unpublished', value: s.lifecycle.get('unpublished') ?? 0, color: '#c3cdc5' },
              { label: 'Suspended', value: s.lifecycle.get('suspended') ?? 0, color: '#b9605a' },
              { label: 'Rejected', value: s.lifecycle.get('rejected') ?? 0, color: '#7d2f2b' },
            ]}
          />
        </Panel>
        <Panel title="Registrations per week" subtitle="New business records, last 12 weeks" className="lg:col-span-2 xl:col-span-1">
          <ColumnChart data={s.weekly.map((w) => ({ label: w.label, value: w.count }))} ariaLabel="New businesses per week" height={170} />
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Recent activity" subtitle="Everything administrators, owners and visitors have done lately">
          <ActivityTimeline items={s.activity.slice(0, activityShown)} />
          {activityShown < Math.min(s.activity.length, 50) && (
            <button type="button" onClick={() => setActivityShown((n) => n + 10)} className="mt-6 w-full border-t border-divider pt-4 text-xs font-semibold text-brand hover:text-forest">
              Show more activity
            </button>
          )}
        </Panel>
        <Panel
          title="Approval queue"
          subtitle="Oldest submissions first"
          action={
            <Link href="/admin/approvals" className="text-xs font-semibold text-brand hover:text-forest">
              Open queue
            </Link>
          }
        >
          {s.queue.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing is waiting for review. 🎉</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {s.queue.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/approvals?id=${b.id}`} className="flex items-center gap-3 hover:opacity-80">
                    <BizLogo business={b} className="size-8 rounded-lg text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{b.name}</p>
                      <p className="text-[10px] text-ink-faint">
                        {idx.townById.get(b.townId)?.name} · submitted {b.submittedAt ? timeAgo(b.submittedAt, s.ref) : ''}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-brand">Review</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
