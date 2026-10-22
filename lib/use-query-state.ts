'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

export interface QueryState<T extends Record<string, string>> {
  /** Current values (defaults filled in for anything missing from the URL). */
  value: T
  page: number
  /** Merge a patch into the URL. The page resets to 1 unless the patch sets one. */
  set: (patch: Partial<T> & { page?: number }) => void
  /** Remove every filter in `defaults` except the keys listed in `keep`. */
  clear: (keep?: (keyof T)[]) => void
}

/**
 * Keeps filter state in the URL query string so filtered views survive refresh and can be shared.
 * `defaults` must be a stable (module-level) object.
 */
export function useQueryState<T extends Record<string, string>>(defaults: T): QueryState<T> {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const value = useMemo(() => {
    const out: Record<string, string> = { ...defaults }
    for (const key of Object.keys(defaults)) {
      const v = params.get(key)
      if (v !== null) out[key] = v
    }
    return out as T
  }, [params, defaults])

  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    },
    [router, pathname],
  )

  const set = useCallback(
    (patch: Partial<T> & { page?: number }) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'page') continue
        if (v === undefined || v === '' || v === defaults[k]) next.delete(k)
        else next.set(k, String(v))
      }
      if (patch.page && patch.page > 1) next.set('page', String(patch.page))
      else next.delete('page')
      push(next)
    },
    [params, defaults, push],
  )

  const clear = useCallback(
    (keep: (keyof T)[] = []) => {
      const next = new URLSearchParams(params.toString())
      for (const key of Object.keys(defaults)) if (!keep.includes(key as keyof T)) next.delete(key)
      next.delete('page')
      push(next)
    },
    [params, defaults, push],
  )

  return { value, page, set, clear }
}

/** Debounce a fast-changing value (e.g. keystrokes) before it is committed elsewhere. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
