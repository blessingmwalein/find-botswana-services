import { cn } from '@/lib/utils'

/** The white bordered surface used across the original design. */
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-line bg-white', className)} {...props}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-xs font-semibold uppercase tracking-[0.14em] text-brand', className)}>{children}</p>
}

export function SectionHeading({ eyebrow, title, action, className }: { eyebrow?: string; title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-forest">{title}</h2>
      </div>
      {action}
    </div>
  )
}
