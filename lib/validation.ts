// Small, dependency-free validators shared by every form in the demo.

export type FieldErrors<T> = Partial<Record<keyof T, string>>

export function required(value: string | undefined | null, label: string): string | undefined {
  return value && value.trim() ? undefined : `${label} is required`
}

export function minLength(value: string, min: number, label: string): string | undefined {
  return value.trim().length >= min ? undefined : `${label} must be at least ${min} characters`
}

export function maxLength(value: string, max: number, label: string): string | undefined {
  return value.trim().length <= max ? undefined : `${label} must be ${max} characters or fewer`
}

export function validEmail(value: string): string | undefined {
  if (!value.trim()) return undefined
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? undefined : 'Enter a valid email address'
}

/** Accepts Botswana numbers with or without +267, spaces or dashes (7–8 local digits). */
export function validPhone(value: string): string | undefined {
  if (!value.trim()) return undefined
  const digits = value.replace(/[^\d+]/g, '')
  const local = digits.startsWith('+267') ? digits.slice(4) : digits.startsWith('267') ? digits.slice(3) : digits
  return /^\d{7,8}$/.test(local) ? undefined : 'Enter a valid Botswana phone number, e.g. +267 71 234 567'
}

export function validUrl(value: string): string | undefined {
  if (!value.trim()) return undefined
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return u.hostname.includes('.') ? undefined : 'Enter a valid website address'
  } catch {
    return 'Enter a valid website address'
  }
}

export function positiveNumber(value: string, label: string): string | undefined {
  const n = Number(value)
  return value.trim() !== '' && Number.isFinite(n) && n > 0 ? undefined : `${label} must be a number greater than 0`
}

/** First defined error wins. */
export function firstError(...errors: (string | undefined)[]): string | undefined {
  return errors.find(Boolean)
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean)
}

export function normaliseUrl(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}
