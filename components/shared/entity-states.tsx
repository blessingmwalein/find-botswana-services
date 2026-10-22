'use client'

import { EyeOff, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { PageSkeleton, EmptyState } from '@/components/ui/states'
import { buttonVariants } from '@/components/ui/button'
import { useHydrated } from '@/lib/store/hooks'
import { pageContainer } from './page-header'

/**
 * What to render when a slug did not resolve. Until localStorage has been read we cannot tell
 * “doesn't exist” from “was created in this browser”, so show a skeleton first.
 */
export function MissingEntity({ kind, backHref, backLabel }: { kind: string; backHref: string; backLabel: string }) {
  const hydrated = useHydrated()
  if (!hydrated) return <PageSkeleton />
  return (
    <div className={pageContainer}>
      <EmptyState
        icon={<FileQuestion className="size-5" />}
        title={`We couldn’t find that ${kind}`}
        action={
          <>
            <Link href={backHref} className={buttonVariants({ variant: 'brand', size: 'md' })}>
              {backLabel}
            </Link>
            <Link href="/discover" className={buttonVariants({ variant: 'soft', size: 'md' })}>
              Search the directory
            </Link>
          </>
        }
      >
        The link may be out of date, or the {kind} may have been removed or unpublished.
      </EmptyState>
    </div>
  )
}

export function NotPublicEntity({ kind, reason, backHref, backLabel }: { kind: string; reason: string; backHref: string; backLabel: string }) {
  return (
    <div className={pageContainer}>
      <EmptyState
        icon={<EyeOff className="size-5" />}
        title={`This ${kind} isn’t public right now`}
        action={
          <Link href={backHref} className={buttonVariants({ variant: 'brand', size: 'md' })}>
            {backLabel}
          </Link>
        }
      >
        {reason}
      </EmptyState>
    </div>
  )
}
