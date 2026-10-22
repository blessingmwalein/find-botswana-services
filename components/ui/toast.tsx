'use client'

import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  tone: Tone
}
interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Same dark-green toast as the original admin screen, now stackable and screen-reader friendly. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = ++seq.current
      setItems((list) => [...list.slice(-3), { id, message, tone }])
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
    },
    [dismiss],
  )
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg px-4 py-3 text-xs font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2',
              t.tone === 'error' ? 'bg-[#7d2f2b]' : 'bg-forest',
            )}
          >
            {t.tone === 'success' && <Check className="mt-px size-4 shrink-0 text-on-forest-soft" />}
            {t.tone === 'error' && <AlertTriangle className="mt-px size-4 shrink-0 text-[#f3c3bf]" />}
            {t.tone === 'info' && <Info className="mt-px size-4 shrink-0 text-on-forest-soft" />}
            <span className="leading-5">{t.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="-mr-1 ml-1 rounded p-0.5 text-white/70 hover:text-white">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
