'use client'

import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface BaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

/** Accessible centred dialog (focus trap, Escape to close, labelled by its title). */
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: BaseProps & { size?: keyof typeof SIZES }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fb-backdrop fixed inset-0 z-50 bg-forest/40" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid grid-cols-1 place-items-center overflow-y-auto p-4 sm:p-5">
          <Dialog.Popup className={cn('fb-popup w-full rounded-xl border border-line bg-white p-5 shadow-xl outline-none sm:p-6', SIZES[size])}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold tracking-[-0.02em] text-forest">{title}</Dialog.Title>
                {description && <Dialog.Description className="mt-1.5 text-sm text-ink-muted">{description}</Dialog.Description>}
              </div>
              <Dialog.Close aria-label="Close dialog" className="-mr-2 -mt-1 rounded-lg p-2 text-ink-muted transition hover:bg-neutral-bg hover:text-ink">
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <div className="mt-5">{children}</div>
            {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Right-hand slide-over for detail views and long forms. */
export function Drawer({ open, onOpenChange, title, description, children, footer }: BaseProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fb-backdrop fixed inset-0 z-50 bg-forest/40" />
        <Dialog.Popup className="fb-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-white shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-divider px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em] text-forest">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-xs text-ink-muted">{description}</Dialog.Description>}
            </div>
            <Dialog.Close aria-label="Close panel" className="-mr-2 rounded-lg p-2 text-ink-muted transition hover:bg-neutral-bg hover:text-ink">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-divider px-5 py-4 sm:px-6">{footer}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Confirmation prompt. `onConfirm` may return a string to keep the dialog open and show an error. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  children,
  confirmDisabled,
}: BaseProps & { confirmLabel?: string; destructive?: boolean; onConfirm: () => string | void | Promise<string | void>; confirmDisabled?: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const result = await onConfirm()
      if (typeof result === 'string') setError(result)
      else {
        setError(null)
        onOpenChange(false)
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null)
        onOpenChange(o)
      }}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="soft" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'brand'} size="md" disabled={busy || confirmDisabled} onClick={run}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </Modal>
  )
}
