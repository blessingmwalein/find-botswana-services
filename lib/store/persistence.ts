import { SEED_VALUE, getSeed } from '../seed'
import type { CollectionKey, Dataset, Settings } from '../types'
import { validateDataset } from '../validate-data'

/** Bump when the shape of stored data or the seed generator changes — stale stores are discarded. */
const SCHEMA_VERSION = 3
export const DATA_KEY = 'findbw:data'
export const PREFS_KEY = 'findbw:prefs'

export const COLLECTIONS: CollectionKey[] = [
  'businesses', 'products', 'services', 'categories', 'regions', 'towns', 'users', 'enquiries', 'activities',
]

type Entity = { id: string }
interface CollectionDelta {
  upserts: Record<string, Entity>
  deleted: string[]
}
export type Delta = Partial<Record<CollectionKey, CollectionDelta>> & { settings?: Settings }

interface StoredData {
  v: number
  seed: string
  savedAt: string
  delta: Delta
}

function seedSignature(): string {
  const s = getSeed()
  return `${SEED_VALUE}:${s.businesses.length}:${s.products.length}:${s.services.length}:${s.businesses[s.businesses.length - 1]?.id}`
}

const seedMaps = new WeakMap<object, Map<string, Entity>>()
function seedMap(list: Entity[]): Map<string, Entity> {
  let m = seedMaps.get(list)
  if (!m) {
    m = new Map(list.map((e) => [e.id, e]))
    seedMaps.set(list, m)
  }
  return m
}

/**
 * Persist only what differs from the seed. Seed objects are never mutated, so reference inequality
 * identifies every edited or newly created record.
 */
export function computeDelta(data: Dataset): Delta {
  const seed = getSeed()
  const delta: Delta = {}
  for (const key of COLLECTIONS) {
    const base = seedMap(seed[key] as Entity[])
    const upserts: Record<string, Entity> = {}
    const seen = new Set<string>()
    for (const e of data[key] as Entity[]) {
      seen.add(e.id)
      if (base.get(e.id) !== e) upserts[e.id] = e
    }
    const deleted: string[] = []
    for (const id of base.keys()) if (!seen.has(id)) deleted.push(id)
    if (Object.keys(upserts).length || deleted.length) delta[key] = { upserts, deleted }
  }
  if (data.settings !== seed.settings) delta.settings = data.settings
  return delta
}

export function applyDelta(delta: Delta): Dataset {
  const seed = getSeed()
  const out: Dataset = { ...seed }
  for (const key of COLLECTIONS) {
    const d = delta[key]
    if (!d) continue
    const deleted = new Set(d.deleted)
    const base = (seed[key] as Entity[]).filter((e) => !deleted.has(e.id))
    const baseIds = new Set(base.map((e) => e.id))
    const merged = base.map((e) => (d.upserts[e.id] ?? e) as Entity)
    for (const [id, e] of Object.entries(d.upserts)) if (!baseIds.has(id) && !deleted.has(id)) merged.push(e)
    ;(out as unknown as Record<string, unknown>)[key] = merged
  }
  if (delta.settings) out.settings = { ...seed.settings, ...delta.settings }
  return out
}

export function saveData(data: Dataset): boolean {
  try {
    const delta = computeDelta(data)
    const payload: StoredData = { v: SCHEMA_VERSION, seed: seedSignature(), savedAt: new Date().toISOString(), delta }
    window.localStorage.setItem(DATA_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; data: Dataset; savedAt: string }
  | { status: 'discarded'; reason: string }

/** Load persisted changes safely; any problem (old version, corrupt JSON, broken references) falls back to the seed. */
export function loadData(): LoadResult {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(DATA_KEY)
  } catch {
    return { status: 'empty' }
  }
  if (!raw) return { status: 'empty' }
  try {
    const stored = JSON.parse(raw) as StoredData
    if (!stored || typeof stored !== 'object' || typeof stored.delta !== 'object' || stored.delta === null) {
      return discard('Stored data had an unexpected shape.')
    }
    if (stored.v !== SCHEMA_VERSION) return discard('Stored data was created by an older version of the demo.')
    if (stored.seed !== seedSignature()) return discard('The demo seed data has changed since your edits were saved.')
    const data = applyDelta(stored.delta)
    const errors = validateDataset(data).filter((i) => i.level === 'error')
    if (errors.length) return discard(`Stored data failed validation (${errors[0].message}).`)
    return { status: 'loaded', data, savedAt: stored.savedAt }
  } catch {
    return discard('Stored data could not be read.')
  }
}

function discard(reason: string): LoadResult {
  try {
    window.localStorage.removeItem(DATA_KEY)
  } catch {
    /* ignore */
  }
  return { status: 'discarded', reason }
}

export function clearStoredData() {
  try {
    window.localStorage.removeItem(DATA_KEY)
  } catch {
    /* ignore */
  }
}
