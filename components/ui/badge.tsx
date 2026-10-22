import { cn } from '@/lib/utils'
import type { BusinessLifecycle } from '@/lib/rules'
import type { ProductAvailability, PublicationStatus, ServiceAvailability, EnquiryStatus, UserRole, UserStatus } from '@/lib/types'
import { availabilityLabel, serviceAvailabilityLabel } from '@/lib/format'

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'dark'

const TONES: Record<BadgeTone, string> = {
  green: 'bg-mint text-brand',
  amber: 'bg-warn-bg text-warn',
  red: 'bg-danger-bg text-danger',
  blue: 'bg-info-bg text-info',
  gray: 'bg-neutral-bg text-neutral',
  dark: 'bg-forest text-white',
}

export function Badge({ children, tone = 'green', className }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold', TONES[tone], className)}>{children}</span>
}

const LIFECYCLE: Record<BusinessLifecycle, [string, BadgeTone]> = {
  published: ['Published', 'green'],
  pending: ['Pending approval', 'amber'],
  draft: ['Draft', 'gray'],
  changes_requested: ['Changes requested', 'amber'],
  rejected: ['Rejected', 'red'],
  suspended: ['Suspended', 'red'],
  unpublished: ['Unpublished', 'gray'],
}

export function LifecycleBadge({ status }: { status: BusinessLifecycle }) {
  const [label, tone] = LIFECYCLE[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function PublicationBadge({ status }: { status: PublicationStatus }) {
  return <Badge tone={status === 'published' ? 'green' : status === 'draft' ? 'gray' : 'amber'}>{status === 'published' ? 'Published' : status === 'draft' ? 'Draft' : 'Unpublished'}</Badge>
}

export function AvailabilityBadge({ value, unit }: { value: ProductAvailability; unit?: string }) {
  const tone: BadgeTone = value === 'in_stock' ? 'green' : value === 'out_of_stock' ? 'red' : value === 'low_stock' ? 'amber' : 'blue'
  return <Badge tone={tone}>{availabilityLabel(value, unit)}</Badge>
}

export function ServiceAvailabilityBadge({ value }: { value: ServiceAvailability }) {
  const tone: BadgeTone = value === 'available' ? 'green' : value === 'unavailable' ? 'red' : 'amber'
  return <Badge tone={tone}>{serviceAvailabilityLabel(value)}</Badge>
}

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const map: Record<EnquiryStatus, [string, BadgeTone]> = { new: ['New', 'green'], read: ['Read', 'gray'], replied: ['Replied', 'blue'], closed: ['Closed', 'gray'] }
  const [label, tone] = map[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={status === 'active' ? 'green' : status === 'invited' ? 'amber' : 'gray'}>{status === 'active' ? 'Active' : status === 'invited' ? 'Invited' : 'Inactive'}</Badge>
}

export function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, [string, BadgeTone]> = { administrator: ['Administrator', 'dark'], moderator: ['Moderator', 'blue'], business_owner: ['Business owner', 'green'], consumer: ['Consumer', 'gray'] }
  const [label, tone] = map[role]
  return <Badge tone={tone}>{label}</Badge>
}
