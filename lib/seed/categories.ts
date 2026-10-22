import type { Category } from '../types'

// 12 top-level categories (the set already shown in the original design) plus 8 sub-categories.
// Glyphs follow the original tile icons; sub-categories reuse their parent's family.
const ROWS: [slug: string, name: string, icon: string, parent: string | null, description: string][] = [
  ['construction-hardware', 'Construction & Hardware', '⌂', null, 'Building materials, tools, steel, timber and everything for the site.'],
  ['agriculture-farming', 'Agriculture & Farming', '✳', null, 'Seed, feed, equipment and advice for crop and livestock farmers.'],
  ['food-groceries', 'Food & Groceries', '▦', null, 'Wholesale and retail food, fresh produce and household staples.'],
  ['automotive-transport', 'Automotive & Transport', '↗', null, 'Vehicle parts, fleet services, hire and logistics.'],
  ['electronics-technology', 'Electronics & Technology', '◫', null, 'Devices, networking, security systems and IT supply.'],
  ['professional-services', 'Professional Services', '◎', null, 'Advisory, accounting, design, marketing and business support.'],
  ['tourism-hospitality', 'Tourism & Hospitality', '◇', null, 'Lodges, tours, transfers, catering and events.'],
  ['health-wellness', 'Health & Wellness', '+', null, 'Pharmacies, clinics, optical, fitness and personal care.'],
  ['fashion-retail', 'Fashion & Retail', '◌', null, 'Clothing, leather, crafts, gifts and general retail.'],
  ['education-training', 'Education & Training', '□', null, 'Schools, tutoring, short courses and skills development.'],
  ['mining-energy', 'Mining & Energy', '◆', null, 'Mining support, industrial supply, fuel and power.'],
  ['home-garden', 'Home & Garden', '⌁', null, 'Furniture, appliances, décor, landscaping and garden supplies.'],

  ['plumbing-electrical', 'Plumbing & Electrical', '⌂', 'construction-hardware', 'Pipes, fittings, cabling, switchgear and installation.'],
  ['irrigation-livestock', 'Irrigation & Livestock Supplies', '✳', 'agriculture-farming', 'Pumps, drip systems, fencing, feed and veterinary supplies.'],
  ['butcheries-produce', 'Butcheries & Fresh Produce', '▦', 'food-groceries', 'Butchers, abattoir suppliers, fruit and vegetable growers.'],
  ['vehicle-repair-tyres', 'Vehicle Repair & Tyres', '↗', 'automotive-transport', 'Workshops, panel beating, tyres, batteries and servicing.'],
  ['solar-renewable', 'Solar & Renewable Energy', '◆', 'mining-energy', 'Solar PV, batteries, solar water heating and installation.'],
  ['legal-accounting', 'Legal & Accounting', '◎', 'professional-services', 'Accountants, bookkeepers, auditors, legal and compliance support.'],
  ['safari-lodges-tours', 'Safari Lodges & Tours', '◇', 'tourism-hospitality', 'Lodges, camps, guides, mobile safaris and delta experiences.'],
  ['ict-computer-services', 'ICT & Computer Services', '◫', 'electronics-technology', 'Software, web, managed IT, repairs and networking services.'],
]

export const CATEGORIES: Category[] = ROWS.map(([slug, name, icon, parent, description], i) => ({
  id: `cat-${slug}`,
  slug,
  name,
  icon,
  parentId: parent ? `cat-${parent}` : null,
  description,
  sortOrder: i + 1,
  enabled: true,
}))
