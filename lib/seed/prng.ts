// Small deterministic PRNG utilities. The same seed always yields the same dataset.

export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** mulberry32 — returns a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  float(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }

  /** Weighted pick from [item, weight] pairs. */
  weighted<T>(pairs: readonly (readonly [T, number])[]): T {
    let total = 0
    for (const [, w] of pairs) total += w
    let r = this.next() * total
    for (const [item, w] of pairs) {
      r -= w
      if (r <= 0) return item
    }
    return pairs[pairs.length - 1][0]
  }

  shuffle<T>(items: readonly T[]): T[] {
    const a = items.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  /** n distinct items (or fewer if the pool is smaller). */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, n)
  }

  /** Approximately normal distribution (Irwin–Hall with 4 samples), mean/spread in the given range. */
  bell(min: number, max: number): number {
    const x = (this.next() + this.next() + this.next() + this.next()) / 4
    return min + x * (max - min)
  }
}

/** FNV-1a string hash → unsigned 32-bit int (used to derive deterministic values from a string). */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
