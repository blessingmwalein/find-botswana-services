import { Compass } from 'lucide-react'
import Link from 'next/link'
import { PublicFooter } from '@/components/layout/public-footer'
import { PublicHeader } from '@/components/layout/public-header'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <PublicHeader />
      <main id="main" className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-start px-5 py-24 lg:px-8">
        <span className="grid grid-cols-1 size-12 place-items-center rounded-xl bg-mint text-brand">
          <Compass className="size-6" />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand">Error 404</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-forest md:text-5xl">We couldn’t find that page.</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-ink-muted">The address may be mistyped, or the page may have moved. Try searching the directory instead.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={buttonVariants({ variant: 'brand', size: 'md' })}>
            Back to home
          </Link>
          <Link href="/discover" className={buttonVariants({ variant: 'soft', size: 'md' })}>
            Search the directory
          </Link>
          <Link href="/businesses" className={buttonVariants({ variant: 'soft', size: 'md' })}>
            Browse businesses
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
