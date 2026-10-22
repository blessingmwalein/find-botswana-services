'use client'

import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-shell'
import { Panel } from '@/components/admin/widgets'
import { RoleBadge, UserStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, TableCard, type Column } from '@/components/ui/data-table'
import { ConfirmDialog, Modal } from '@/components/ui/dialog'
import { SelectField, TextField, inputClass } from '@/components/ui/form'
import { RowMenu } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/format'
import { normalize } from '@/lib/search/normalize'
import { createUser, prefs, roleLabel, updateUser } from '@/lib/store/actions'
import { useIndex } from '@/lib/store/hooks'
import type { User, UserRole, UserStatus } from '@/lib/types'
import { firstError, required, validEmail } from '@/lib/validation'

const ROLES: UserRole[] = ['administrator', 'moderator', 'business_owner', 'consumer']
const STATUSES: UserStatus[] = ['active', 'inactive', 'invited']

export function AdminUsersPage() {
  const idx = useIndex()
  const router = useRouter()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [inviting, setInviting] = useState(false)
  const [toggling, setToggling] = useState<User | null>(null)

  const rows = useMemo(() => {
    const needle = normalize(q)
    return idx.data.users.filter((u) => (!needle || normalize(`${u.name} ${u.email}`).includes(needle)) && (!role || u.role === role) && (!status || u.status === status))
  }, [idx, q, role, status])

  const counts = ROLES.map((r) => ({ role: r, n: idx.data.users.filter((u) => u.role === r).length }))

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'User',
      sort: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid grid-cols-1 size-8 shrink-0 place-items-center rounded-full bg-sage text-[11px] font-bold text-brand">{u.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">{u.name}</p>
            <p className="mt-0.5 truncate text-[10px] text-ink-faint">{u.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'role', header: 'Role', sort: (u) => u.role, cell: (u) => <RoleBadge role={u.role} /> },
    { id: 'status', header: 'Status', sort: (u) => u.status, cell: (u) => <UserStatusBadge status={u.status} /> },
    {
      id: 'businesses',
      header: 'Businesses',
      sort: (u) => u.businessIds.length,
      hideBelow: 'md',
      cell: (u) => {
        const names = u.businessIds.map((id) => idx.businessById.get(id)).filter((b): b is NonNullable<typeof b> => !!b)
        if (!names.length) return <span className="text-ink-faint">—</span>
        return (
          <div className="max-w-[240px] text-ink-muted">
            {names.slice(0, 2).map((b, i) => (
              <span key={b.id}>
                {i > 0 && ', '}
                <Link href={`/admin/businesses/${b.id}`} className="hover:text-brand hover:underline">{b.name}</Link>
              </span>
            ))}
            {names.length > 2 && <span className="text-ink-faint"> +{names.length - 2} more</span>}
          </div>
        )
      },
    },
    { id: 'town', header: 'Town', sort: (u) => idx.townById.get(u.townId)?.name ?? '', hideBelow: 'lg', cell: (u) => <span className="text-ink-muted">{idx.townById.get(u.townId)?.name}</span> },
    { id: 'active', header: 'Last active', sort: (u) => u.lastActiveAt, hideBelow: 'lg', cell: (u) => <span className="whitespace-nowrap text-ink-muted">{formatDate(u.lastActiveAt)}</span> },
    {
      id: 'actions',
      header: '',
      cell: (u) => (
        <RowMenu
          label={`Actions for ${u.name}`}
          actions={[
            { label: 'Edit role & details', onSelect: () => setEditing(u) },
            { label: u.status === 'active' ? 'Deactivate account' : 'Activate account', onSelect: () => (u.status === 'active' ? setToggling(u) : activate(u)) },
            { label: 'Open owner workspace', hidden: u.role !== 'business_owner' || !u.businessIds.length, onSelect: () => { prefs.setOwnerUser(u.id); router.push('/business/dashboard') } },
          ]}
        />
      ),
    },
  ]

  const activate = (u: User) => {
    const r = updateUser(u.id, { status: 'active' })
    if (r.ok) toast.success(`${u.name}’s account was activated`)
    else toast.error(r.error)
  }
  const sel = `${inputClass} py-2 text-xs sm:w-auto`

  return (
    <>
      <AdminPageHeader title="Users" description="Demo accounts and their roles. There is no real authentication — roles are for demonstration." actions={<Button variant="brand" size="md" onClick={() => setInviting(true)}><Plus /> Invite user</Button>} />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <button key={c.role} type="button" onClick={() => setRole(role === c.role ? '' : c.role)} aria-pressed={role === c.role} className={`rounded-xl border px-4 py-3 text-left transition ${role === c.role ? 'border-brand bg-mint' : 'border-line-strong bg-white hover:border-[#b9d1be]'}`}>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-forest">{c.n}</p>
            <p className="text-xs text-ink-muted">{roleLabel(c.role)}s</p>
          </button>
        ))}
      </div>

      <TableCard
        className="mt-6"
        toolbar={
          <>
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line-strong px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Search className="size-4 text-ink-faint" aria-hidden />
              <input aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="w-full text-sm outline-none" />
            </div>
            <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className={sel}>
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </>
        }
      >
        <DataTable rows={rows} columns={columns} rowKey={(u) => u.id} caption="Users" pageSize={15} defaultSort={{ id: 'name', dir: 'asc' }} resetKey={`${q}|${role}|${status}`} empty={<EmptyState className="border-0" title="No users match">Try a different search or filter.</EmptyState>} />
      </TableCard>

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title="Deactivate this account?"
        description={toggling ? `${toggling.name} will be marked inactive. Their businesses stay listed.` : undefined}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (!toggling) return
          const r = updateUser(toggling.id, { status: 'inactive' })
          if (!r.ok) return r.error
          toast.success(`${toggling.name}’s account was deactivated`)
        }}
      />
      <Panel title="About demo roles" className="mt-8">
        <ul className="grid grid-cols-1 gap-2 text-xs leading-5 text-ink-muted sm:grid-cols-2">
          <li><span className="font-semibold text-ink">Administrator</span> — full access to this portal.</li>
          <li><span className="font-semibold text-ink">Moderator</span> — reviews submissions (same screens in this demo).</li>
          <li><span className="font-semibold text-ink">Business owner</span> — manages their own listings in the owner workspace.</li>
          <li><span className="font-semibold text-ink">Consumer</span> — browses and sends enquiries.</li>
        </ul>
      </Panel>
    </>
  )
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToast()
  const [v, setV] = useState({ name: user.name, email: user.email, role: user.role, status: user.status })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = { name: required(v.name, 'Name'), email: firstError(required(v.email, 'Email'), validEmail(v.email)) }
    const clean = Object.fromEntries(Object.entries(errs).filter(([, x]) => x))
    setErrors(clean)
    if (Object.keys(clean).length) return
    const r = updateUser(user.id, { name: v.name.trim(), email: v.email, role: v.role, status: v.status })
    if (!r.ok) return setError(r.error)
    toast.success(`${r.value.name} was updated`)
    onClose()
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Edit ${user.name}`} description={user.businessIds.length ? `Owns ${user.businessIds.length} business${user.businessIds.length === 1 ? '' : 'es'}.` : undefined}>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
        <TextField label="Name" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} />
        <TextField label="Email" required type="email" value={v.email} onChange={(e) => { setV({ ...v, email: e.target.value }); setError(null) }} error={errors.email} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Role" value={v.role} onChange={(e) => { setV({ ...v, role: e.target.value as UserRole }); setError(null) }}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </SelectField>
          <SelectField label="Account status" value={v.status} onChange={(e) => { setV({ ...v, status: e.target.value as UserStatus }); setError(null) }}>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </SelectField>
        </div>
        {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" size="md" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="brand" size="md">Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const idx = useIndex()
  const toast = useToast()
  const [v, setV] = useState({ name: '', email: '', role: 'business_owner' as UserRole, townId: idx.data.towns[0]?.id ?? '' })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = { name: required(v.name, 'Name'), email: firstError(required(v.email, 'Email'), validEmail(v.email)) }
    const clean = Object.fromEntries(Object.entries(errs).filter(([, x]) => x))
    setErrors(clean)
    if (Object.keys(clean).length) return
    const r = createUser(v)
    if (!r.ok) return setError(r.error)
    toast.success(`${r.value.name} was invited — no email is sent in this demo`)
    onClose()
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Invite a user" description="Creates an account in “invited” status. No invitation email is sent in this demo.">
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4">
        <TextField label="Name" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} />
        <TextField label="Email" required type="email" value={v.email} onChange={(e) => { setV({ ...v, email: e.target.value }); setError(null) }} error={errors.email} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Role" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as UserRole })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </SelectField>
          <SelectField label="Town" value={v.townId} onChange={(e) => setV({ ...v, townId: e.target.value })}>
            {idx.data.towns.filter((t) => t.enabled).sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </SelectField>
        </div>
        {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" size="md" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="brand" size="md">Send invite</Button>
        </div>
      </form>
    </Modal>
  )
}
