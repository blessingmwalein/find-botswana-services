import { getSeed } from '../seed'
import type { Dataset } from '../types'
import { DATA_KEY, PREFS_KEY, clearStoredData, loadData, saveData } from './persistence'

/** Per-viewer conveniences — kept separate from the shared demo dataset. */
export interface Prefs {
  /** Demo identity for the business owner workspace (NOT authentication). */
  ownerUserId: string
  /** Business currently being managed in the owner workspace. */
  ownerBusinessId: string | null
  recentSearches: string[]
  viewMode: 'grid' | 'list'
}

export interface AppState {
  data: Dataset
  prefs: Prefs
  /** False during SSR and the first client render; true once localStorage has been read. */
  hydrated: boolean
  /** Why stored data was discarded on load, if it was. */
  notice: string | null
  /** Incremented on every data change — useful for effects that must react to edits. */
  revision: number
}

const DEFAULT_PREFS: Prefs = {
  ownerUserId: 'usr-04',
  ownerBusinessId: null,
  recentSearches: ['cement', 'solar installation', 'butchery Maun', 'tyres'],
  viewMode: 'grid',
}

let state: AppState = {
  data: getSeed(),
  prefs: DEFAULT_PREFS,
  hydrated: false,
  notice: null,
  revision: 0,
}

const listeners = new Set<() => void>()

export function getState(): AppState {
  return state
}

export function getServerState(): AppState {
  return initialState
}
const initialState = state

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function emit() {
  for (const l of listeners) l()
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (typeof window === 'undefined') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    saveData(state.data)
  }, 150)
}

/** Flush any pending write immediately (used before reloads and on tab close). */
export function flushSave() {
  if (typeof window === 'undefined') return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    saveData(state.data)
  }
}

/** Apply a change to the shared dataset. The updater must return new objects for anything it edits. */
export function updateData(updater: (data: Dataset) => Dataset) {
  const next = updater(state.data)
  if (next === state.data) return
  state = { ...state, data: next, revision: state.revision + 1 }
  scheduleSave()
  emit()
}

export function updatePrefs(patch: Partial<Prefs>) {
  state = { ...state, prefs: { ...state.prefs, ...patch } }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs))
    } catch {
      /* storage unavailable — prefs stay in memory */
    }
  }
  emit()
}

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<Prefs>
    return {
      ownerUserId: typeof p.ownerUserId === 'string' ? p.ownerUserId : DEFAULT_PREFS.ownerUserId,
      ownerBusinessId: typeof p.ownerBusinessId === 'string' ? p.ownerBusinessId : null,
      recentSearches: Array.isArray(p.recentSearches) ? p.recentSearches.filter((s) => typeof s === 'string').slice(0, 8) : DEFAULT_PREFS.recentSearches,
      viewMode: p.viewMode === 'list' ? 'list' : 'grid',
    }
  } catch {
    return DEFAULT_PREFS
  }
}

/** Load persisted data after mount (never during SSR/hydration, so markup always matches). */
export function hydrateStore() {
  if (typeof window === 'undefined') return
  const result = loadData()
  const prefs = readPrefs()
  state = {
    ...state,
    prefs,
    hydrated: true,
    data: result.status === 'loaded' ? result.data : getSeed(),
    notice: result.status === 'discarded' ? result.reason : null,
    revision: state.revision + 1,
  }
  emit()
}

/** Re-read data when another tab changes it. */
export function installCrossTabSync(): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === DATA_KEY || e.key === null) {
      const result = loadData()
      state = {
        ...state,
        data: result.status === 'loaded' ? result.data : getSeed(),
        revision: state.revision + 1,
      }
      emit()
    } else if (e.key === PREFS_KEY) {
      state = { ...state, prefs: readPrefs() }
      emit()
    }
  }
  const onHide = () => flushSave()
  window.addEventListener('storage', onStorage)
  window.addEventListener('pagehide', onHide)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pagehide', onHide)
  }
}

/** Discard every demo edit and restore the original deterministic dataset. */
export function resetToSeed() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  clearStoredData()
  state = { ...state, data: getSeed(), notice: null, revision: state.revision + 1 }
  emit()
}

export function dismissNotice() {
  if (state.notice === null) return
  state = { ...state, notice: null }
  emit()
}
