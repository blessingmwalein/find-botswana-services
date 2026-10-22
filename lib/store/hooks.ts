'use client'

import { useSyncExternalStore } from 'react'
import type { Dataset, Settings } from '../types'
import { getIndex, type Index } from './indexes'
import { getServerState, getState, subscribe, type AppState, type Prefs } from './store'

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerState)
}

/** The shared dataset — identical across every page. */
export function useData(): Dataset {
  return useAppState().data
}

/** Relationship lookups and derived lists for the current dataset (memoised per dataset version). */
export function useIndex(): Index {
  return getIndex(useAppState().data)
}

export function useSettings(): Settings {
  return useAppState().data.settings
}

export function usePrefs(): Prefs {
  return useAppState().prefs
}

/** False on the server and during the first client render, true once localStorage has been applied. */
export function useHydrated(): boolean {
  return useAppState().hydrated
}
