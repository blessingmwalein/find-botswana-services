'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10'

interface ShellProps {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  hideLabel?: boolean
  children: React.ReactNode
}

function Shell({ id, label, hint, error, required, className, hideLabel, children }: ShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={cn('block text-xs font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden className="ml-0.5 text-danger">*</span>}
      </label>
      <div className={cn(!hideLabel && 'mt-2')}>{children}</div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-ink-faint">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, hint?: string, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

type CommonProps = { label: string; hint?: string; error?: string; hideLabel?: boolean; wrapperClassName?: string }

export function TextField({ label, hint, error, hideLabel, wrapperClassName, className, required, ...props }: CommonProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName} hideLabel={hideLabel}>
      <input id={id} required={required} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={cn(inputClass, className)} {...props} />
    </Shell>
  )
}

export function TextAreaField({ label, hint, error, hideLabel, wrapperClassName, className, required, ...props }: CommonProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName} hideLabel={hideLabel}>
      <textarea id={id} required={required} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={cn(inputClass, 'min-h-24 resize-y leading-6', className)} {...props} />
    </Shell>
  )
}

export function SelectField({ label, hint, error, hideLabel, wrapperClassName, className, required, children, ...props }: CommonProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName} hideLabel={hideLabel}>
      <select id={id} required={required} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={cn(inputClass, 'appearance-none bg-[length:16px] bg-[position:right_0.75rem_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2368736a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
        {children}
      </select>
    </Shell>
  )
}

export function CheckboxField({ label, description, checked, onChange, disabled, className }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; className?: string }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line-strong accent-brand" />
      <label htmlFor={id} className="cursor-pointer text-xs">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-ink-muted">{description}</span>}
      </label>
    </div>
  )
}

/** Accessible on/off switch. */
export function SwitchField({ label, description, checked, onChange, disabled }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50', checked ? 'bg-brand' : 'bg-[#cdd6cd]')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}
