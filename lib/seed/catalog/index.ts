import type { CategoryPack } from './types'
import { agricultureFarming, butcheriesProduce, foodGroceries, irrigationLivestock } from './agri-food'
import { automotiveTransport, miningEnergy, solarRenewable, vehicleRepairTyres } from './auto-energy'
import { constructionHardware, homeGarden, plumbingElectrical } from './construction'
import { fashionRetail, healthWellness, safariLodgesTours, tourismHospitality } from './lifestyle'
import { educationTraining, electronicsTechnology, ictComputerServices, legalAccounting, professionalServices } from './tech-pro'

export const PACKS: CategoryPack[] = [
  constructionHardware,
  plumbingElectrical,
  homeGarden,
  agricultureFarming,
  irrigationLivestock,
  foodGroceries,
  butcheriesProduce,
  automotiveTransport,
  vehicleRepairTyres,
  miningEnergy,
  solarRenewable,
  electronicsTechnology,
  ictComputerServices,
  professionalServices,
  legalAccounting,
  educationTraining,
  tourismHospitality,
  safariLodgesTours,
  healthWellness,
  fashionRetail,
]

export const PACK_BY_SLUG: Record<string, CategoryPack> = Object.fromEntries(PACKS.map((p) => [p.slug, p]))

/**
 * Secondary categories a business may additionally belong to. A secondary category also contributes
 * catalogue items, so only pairs whose products genuinely overlap are listed (a hardware store may
 * stock plumbing fittings, but not lounge suites).
 */
export const RELATED: Record<string, string[]> = {
  'construction-hardware': ['plumbing-electrical'],
  'plumbing-electrical': ['construction-hardware', 'solar-renewable'],
  'home-garden': [],
  'agriculture-farming': ['irrigation-livestock'],
  'irrigation-livestock': ['agriculture-farming', 'solar-renewable'],
  'food-groceries': ['butcheries-produce'],
  'butcheries-produce': ['food-groceries'],
  'automotive-transport': ['vehicle-repair-tyres'],
  'vehicle-repair-tyres': ['automotive-transport'],
  'mining-energy': [],
  'solar-renewable': ['plumbing-electrical'],
  'electronics-technology': ['ict-computer-services'],
  'ict-computer-services': ['electronics-technology', 'professional-services'],
  'professional-services': ['legal-accounting', 'ict-computer-services'],
  'legal-accounting': ['professional-services'],
  'education-training': ['ict-computer-services'],
  'tourism-hospitality': ['safari-lodges-tours'],
  'safari-lodges-tours': ['tourism-hospitality'],
  'health-wellness': [],
  'fashion-retail': [],
}

/** Packs whose items are commonly sold under a supplier's own house brand. */
export const BRANDABLE = new Set([
  'construction-hardware', 'plumbing-electrical', 'agriculture-farming', 'irrigation-livestock',
  'food-groceries', 'butcheries-produce', 'home-garden', 'automotive-transport',
])
