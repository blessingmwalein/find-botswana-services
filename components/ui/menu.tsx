'use client'

import { Menu } from '@base-ui/react/menu'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MenuAction {
  label: string
  onSelect: () => void
  danger?: boolean
  hidden?: boolean
  disabled?: boolean
}

/** Accessible “…” actions menu (keyboard navigable, closes on Escape and outside click). */
export function RowMenu({ label, actions, className }: { label: string; actions: (MenuAction | 'separator')[]; className?: string }) {
  const visible = actions.filter((a) => a === 'separator' || !a.hidden)
  return (
    // Clicks (including those from the portalled popup, which bubble through React) must not trigger row click handlers.
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
    <Menu.Root>
      <Menu.Trigger aria-label={label} className={cn('grid size-8 place-items-center rounded-lg text-ink-muted transition hover:bg-neutral-bg hover:text-ink data-[popup-open]:bg-neutral-bg', className)}>
        <MoreHorizontal className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-[60]">
          <Menu.Popup className="min-w-44 rounded-xl border border-line bg-white p-1.5 text-xs shadow-[0_14px_40px_rgba(18,55,42,0.14)] outline-none">
            {visible.map((a, i) =>
              a === 'separator' ? (
                <Menu.Separator key={`sep-${i}`} className="my-1 h-px bg-divider" />
              ) : (
                <Menu.Item
                  key={a.label}
                  disabled={a.disabled}
                  onClick={a.onSelect}
                  className={cn('flex cursor-pointer select-none items-center rounded-lg px-3 py-2 font-medium outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40', a.danger ? 'text-danger data-[highlighted]:bg-danger-bg' : 'text-ink data-[highlighted]:bg-mint data-[highlighted]:text-brand')}
                >
                  {a.label}
                </Menu.Item>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
    </span>
  )
}
