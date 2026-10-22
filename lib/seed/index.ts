import type { Dataset } from '../types'
import { buildDataset } from './generate'

export { SEED_ANCHOR, SEED_VALUE, TARGETS } from './generate'

let cached: Dataset | null = null

/**
 * The deterministic seed dataset. Generated once per process/browser session and treated as immutable —
 * the store never mutates these objects, so reference equality can be used to detect edits.
 */
export function getSeed(): Dataset {
  if (!cached) cached = buildDataset()
  return cached
}
