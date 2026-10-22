'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/** Copies text to the clipboard with visible and announced feedback. */
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API can be blocked (insecure origin, permissions) — fall back to a textarea copy.
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) throw new Error('copy failed')
        setCopied(true)
        toast.success(`${label} copied to clipboard`)
        setTimeout(() => setCopied(false), 1800)
      } catch {
        toast.error(`Couldn’t copy the ${label.toLowerCase()}. Select it manually instead.`)
      }
    }
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`} className={cn('rounded-md p-1.5 text-ink-faint transition hover:bg-mint hover:text-brand', className)}>
      {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
    </button>
  )
}
