import type { BusinessType, PricingModel } from '../../types'

/**
 * Product template.
 *  name   — may contain one variant token `{label:multiplier|label:multiplier}`; the generator picks
 *           one option and scales the price by its multiplier (multiplier defaults to 1).
 *  unit   — unit of sale shown with the price ("per bag", "per night" …)
 *  min/max— indicative BWP price range for the base variant. `0, 0` means quote-only.
 *  blurb  — one sentence used in the product description.
 *  specs  — optional "Label:Value;Label:Value" specification string.
 */
export type ProdTpl = [name: string, unit: string, min: number, max: number, blurb: string, specs?: string]

export type SvcModel = 'f' | 'h' | 'd' | 'p' | 'm' | 'q'
/** Service template: model f=fixed h=hourly d=daily p=per project m=monthly q=quote-only. */
export type SvcTpl = [name: string, model: SvcModel, min: number, max: number, blurb: string]

export const SVC_MODEL: Record<SvcModel, PricingModel> = {
  f: 'fixed',
  h: 'hourly',
  d: 'daily',
  p: 'project',
  m: 'monthly',
  q: 'quote',
}

export interface CategoryPack {
  /** Category slug this pack belongs to. */
  slug: string
  /** Relative share of businesses whose primary category is this one. */
  share: number
  /** Multipliers on the generated catalogue size (1 = average). */
  productBias: number
  serviceBias: number
  bizTypes: [BusinessType, number][]
  /** `{P}` = name prefix word, `{T}` = town name. */
  namePatterns: string[]
  /** Short one-line business descriptions. */
  taglines: string[]
  /** Short trade phrases used inside long descriptions ("building materials and hardware"). */
  trade: string[]
  products: ProdTpl[]
  services: SvcTpl[]
}
