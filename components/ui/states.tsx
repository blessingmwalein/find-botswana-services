import { AlertTriangle, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './card'

export function EmptyState({ title, children, action, icon, className }: { title: string; children?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('flex flex-col items-center p-10 text-center sm:p-12', className)}>
      <div className="grid grid-cols-1 size-11 place-items-center rounded-xl bg-mint text-brand">{icon ?? <SearchX className="size-5" />}</div>
      <h2 className="mt-4 font-semibold text-forest">{title}</h2>
      {children && <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </Card>
  )
}

export function ErrorState({ title = 'Something went wrong', children, action }: { title?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center border-[#f0d3d1] p-10 text-center">
      <div className="grid grid-cols-1 size-11 place-items-center rounded-xl bg-danger-bg text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <h2 className="mt-4 font-semibold text-forest">{title}</h2>
      {children && <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-[#e8ede7]', className)} />
}

export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
        </Card>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-[1240px] px-5 py-10 lg:px-8">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-md" />
      <CardGridSkeleton className="mt-10" />
    </div>
  )
}
