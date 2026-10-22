import type { LocalityType, Region, Town } from '../types'

// Botswana's ten administrative districts. Cities/town councils (Gaborone, Francistown, Lobatse,
// Selebi-Phikwe, Jwaneng, Orapa, Sowa) are local authorities that sit inside a district, so they
// are modelled as towns whose `regionId` points to the containing district.
const REGION_ROWS: [slug: string, name: string, seat: string, lat: number, lng: number, description: string][] = [
  ['central', 'Central', 'Serowe', -22.0, 26.9, 'Botswana’s largest district by population, stretching from the Makgadikgadi Pans to the eastern railway corridor.'],
  ['chobe', 'Chobe', 'Kasane', -18.3, 25.2, 'The far north: Chobe National Park, the Zambezi and Botswana’s safari gateway.'],
  ['ghanzi', 'Ghanzi', 'Ghanzi', -21.9, 21.7, 'Kalahari ranching country and the heart of the Ghanzi farms belt.'],
  ['kgalagadi', 'Kgalagadi', 'Tsabong', -24.9, 21.9, 'The south-western Kalahari, bordering Namibia and South Africa.'],
  ['kgatleng', 'Kgatleng', 'Mochudi', -24.35, 26.25, 'A compact district north-east of Gaborone centred on Mochudi.'],
  ['kweneng', 'Kweneng', 'Molepolole', -24.1, 25.2, 'West of Gaborone — a mix of fast-growing peri-urban villages and Kalahari farmland.'],
  ['north-east', 'North-East', 'Masunga', -20.9, 27.4, 'The Tati region around Francistown, linked to Zimbabwe by the A1 corridor.'],
  ['north-west', 'North-West', 'Maun', -19.6, 22.9, 'Home of the Okavango Delta; Maun is its commercial and tourism hub.'],
  ['south-east', 'South-East', 'Ramotswa', -24.95, 25.8, 'The smallest district and the country’s most densely populated, anchored by Gaborone and Lobatse.'],
  ['southern', 'Southern', 'Kanye', -25.0, 24.9, 'Agricultural heartland and diamond-mining town of Jwaneng, south-west of Gaborone.'],
]

export const REGIONS: Region[] = REGION_ROWS.map(([slug, name, seat, lat, lng, description]) => ({
  id: `reg-${slug}`,
  slug,
  name,
  seat,
  description,
  lat,
  lng,
  enabled: true,
}))

type TownRow = [name: string, region: string, lat: number, lng: number, type: LocalityType, areas?: string[], description?: string]

// Coordinates are town-centre references (decimal degrees), verified against OpenStreetMap, GeoNames and Wikidata. Neighbourhood lists are used only to
// build plausible fictional addresses.
const TOWN_ROWS: TownRow[] = [
  // South-East
  ['Gaborone', 'south-east', -24.6545, 25.9086, 'city', ['Broadhurst Industrial', 'Main Mall', 'Block 8', 'Gaborone West', 'Extension 9', 'Phakalane', 'Fairgrounds', 'Gaborone North', 'Tlokweng Road', 'Block 3 Industrial'], 'Botswana’s capital and largest city — government, finance and the country’s biggest concentration of suppliers.'],
  ['Tlokweng', 'south-east', -24.6686, 25.9711, 'town', ['Tlokweng Main Road', 'Ward 3', 'Borakanelo', 'Tlokweng Industrial']],
  ['Ramotswa', 'south-east', -24.87, 25.87, 'town', ['Main Road', 'Ramotswa Industrial', 'Motse Wa Maloba']],
  ['Lobatse', 'south-east', -25.225, 25.675, 'town', ['Lobatse Industrial', 'Hospital Road', 'Peleng', 'Main Mall'], 'Home of the abattoir and the country’s leather and meat-processing heritage.'],
  ['Otse', 'south-east', -25.0167, 25.75, 'village', ['Main Road', 'Otse Village Centre']],

  // Kweneng
  ['Molepolole', 'kweneng', -24.4067, 25.495, 'town', ['Kgosing', 'Main Mall', 'Segoditshane', 'Molepolole Industrial', 'Borakalalo']],
  ['Mogoditshane', 'kweneng', -24.627, 25.865, 'town', ['Mogoditshane Main Road', 'Ward 4', 'Block 7 Industrial', 'Gaborone Road']],
  ['Gabane', 'kweneng', -24.667, 25.783, 'village', ['Main Road', 'Gabane Hill', 'Moshupa Road']],
  ['Mmopane', 'kweneng', -24.5673, 25.8738, 'village', ['Main Road', 'Mmopane Shopping Centre']],
  ['Thamaga', 'kweneng', -24.67, 25.53, 'village', ['Main Road', 'Pottery Centre Road', 'Thamaga Industrial']],
  ['Letlhakeng', 'kweneng', -24.0958, 25.0297, 'village', ['Main Road', 'Ward 2']],
  ['Lentsweletau', 'kweneng', -24.2544, 25.8517, 'village', ['Main Road', 'Kgosing']],
  ['Kopong', 'kweneng', -24.4732, 25.8945, 'village', ['Main Road', 'Kopong Junction']],

  // Kgatleng
  ['Mochudi', 'kgatleng', -24.3833, 26.15, 'town', ['Phuthadikobo', 'Main Mall', 'Matsha', 'Mochudi Industrial', 'Morema Ward']],
  ['Oodi', 'kgatleng', -24.5672, 26.0384, 'village', ['Main Road', 'Weaving Centre Road']],
  ['Artesia', 'kgatleng', -24.0124, 26.3196, 'village', ['Main Road', 'Artesia Station']],
  ['Bokaa', 'kgatleng', -24.4261, 26.0169, 'village', ['Main Road', 'Bokaa Ward']],

  // Southern
  ['Kanye', 'southern', -24.9833, 25.3333, 'town', ['Mmathethe Road', 'Main Mall', 'Kanye Industrial', 'Dikgatlhong', 'Moshaneng Road']],
  ['Jwaneng', 'southern', -24.6, 24.7167, 'town', ['Jwaneng Mall', 'Industrial Area', 'Jwaneng Central', 'Residential Area']],
  ['Goodhope', 'southern', -25.4729, 25.4367, 'village', ['Main Road', 'Goodhope Station']],
  ['Moshupa', 'southern', -24.7667, 25.4167, 'town', ['Main Road', 'Moshupa Industrial']],
  ['Mabutsane', 'southern', -24.3893, 23.575, 'village', ['Main Road', 'Ward 1']],
  ['Sekoma', 'southern', -24.5125, 23.9293, 'village', ['Main Road', 'Sekoma Junction']],
  ['Ramatlabama', 'southern', -25.6362, 25.5509, 'village', ['Border Road', 'Main Road']],
  ['Mmathethe', 'southern', -25.32, 25.2712, 'village', ['Main Road']],

  // Kgalagadi
  ['Tsabong', 'kgalagadi', -26.0167, 22.4, 'town', ['Main Road', 'Tsabong Industrial', 'Government Enclave']],
  ['Kang', 'kgalagadi', -23.6723, 22.7908, 'village', ['Main Road', 'Kang Junction']],
  ['Hukuntsi', 'kgalagadi', -23.9833, 21.7667, 'village', ['Main Road', 'Hukuntsi Centre']],
  ['Werda', 'kgalagadi', -25.2667, 23.2667, 'village', ['Main Road']],
  ['Bokspits', 'kgalagadi', -26.8972, 20.6906, 'settlement', ['Main Road']],
  ['Tshane', 'kgalagadi', -24.0167, 21.88, 'settlement', ['Main Road']],

  // Ghanzi
  ['Ghanzi', 'ghanzi', -21.7, 21.65, 'town', ['Main Road', 'Ghanzi Industrial', 'Sunrise Ward', 'Government Enclave'], 'The Kalahari’s cattle and farming capital, on the Trans-Kalahari route to Namibia.'],
  ['Charles Hill', 'ghanzi', -22.2796, 20.0739, 'settlement', ['Main Road']],
  ['Kuke', 'ghanzi', -21.0509, 22.4043, 'settlement', ['Main Road']],

  // North-West
  ['Maun', 'north-west', -19.9833, 23.4167, 'town', ['Sedie Ward', 'Maun Main Mall', 'Matlapana', 'Boseja', 'Airport Road', 'Maun Industrial', 'Disaneng'], 'Gateway to the Okavango Delta and Botswana’s safari-logistics capital.'],
  ['Shakawe', 'north-west', -18.3667, 21.85, 'village', ['Main Road', 'Shakawe Central']],
  ['Gumare', 'north-west', -19.3667, 22.1833, 'village', ['Main Road', 'Gumare Mall']],
  ['Sehithwa', 'north-west', -20.4667, 22.7167, 'village', ['Main Road', 'Sehithwa Junction']],
  ['Tsau', 'north-west', -20.1664, 22.4519, 'village', ['Main Road']],
  ['Seronga', 'north-west', -18.8167, 22.4167, 'village', ['Main Road']],
  ['Toteng', 'north-west', -20.3667, 22.95, 'village', ['Main Road', 'Toteng Junction']],
  ['Nokaneng', 'north-west', -19.6667, 22.2, 'village', ['Main Road']],

  // Chobe
  ['Kasane', 'chobe', -17.8, 25.15, 'town', ['Kasane Main Road', 'Kasane Industrial', 'Kazungula Road', 'Chobe Safari Strip', 'Kasane Mall'], 'Botswana’s safari gateway on the Chobe River, a few kilometres from four international borders.'],
  ['Kazungula', 'chobe', -17.8039, 25.2411, 'village', ['Border Post Road', 'Main Road']],
  ['Pandamatenga', 'chobe', -18.5333, 25.6167, 'village', ['Main Road', 'Farms Road']],

  // North-East
  ['Francistown', 'north-east', -21.17, 27.5083, 'city', ['Blue Jacket Street', 'Francistown Industrial', 'Light Industrial', 'Tati River Mall', 'Monarch', 'Gerald Estates', 'Nyangabgwe Road', 'Phase 4'], 'Botswana’s second city and the commercial centre of the north-east.'],
  ['Masunga', 'north-east', -20.6245, 27.4488, 'town', ['Main Road', 'Masunga Industrial', 'Government Enclave']],
  ['Matsiloje', 'north-east', -21.3019, 27.8837, 'village', ['Main Road']],
  ['Tati Siding', 'north-east', -21.2833, 27.4667, 'village', ['Main Road', 'Tati Siding Junction']],
  ['Tshesebe', 'north-east', -20.7265, 27.5852, 'village', ['Main Road']],

  // Central
  ['Palapye', 'central', -22.55, 27.13, 'town', ['Palapye Industrial', 'Main Mall', 'Botswana International University Road', 'Serule Road', 'Palapye Ward 3']],
  ['Serowe', 'central', -22.3833, 26.7167, 'town', ['Serowe Main Mall', 'Mmashoro Road', 'Serowe Industrial', 'Ward 7', 'Phokoje']],
  ['Mahalapye', 'central', -23.1, 26.8142, 'town', ['Mahalapye Main Mall', 'Mahalapye Industrial', 'Xhosa Ward', 'Station Road']],
  ['Selebi-Phikwe', 'central', -21.9783, 27.8431, 'town', ['Selebi-Phikwe Industrial', 'Botshabelo', 'Phikwe Mall', 'Sefhophe Road']],
  ['Orapa', 'central', -21.3339, 25.3647, 'town', ['Orapa Town Centre', 'Orapa Industrial']],
  ['Letlhakane', 'central', -21.4167, 25.5833, 'town', ['Main Road', 'Letlhakane Industrial', 'Letlhakane Mall']],
  ['Tutume', 'central', -20.4885, 27.0368, 'village', ['Main Road', 'Tutume Mall']],
  ['Bobonong', 'central', -21.9667, 28.4333, 'village', ['Main Road', 'Bobonong Mall']],
  ['Tonota', 'central', -21.4333, 27.4667, 'town', ['Tonota Main Road', 'Tonota Industrial']],
  ['Nata', 'central', -20.2167, 26.1833, 'village', ['Main Road', 'Nata Junction']],
  ['Gweta', 'central', -20.2, 25.2667, 'village', ['Main Road', 'Gweta Junction']],
  ['Rakops', 'central', -21.0167, 24.4, 'village', ['Main Road']],
  ['Sowa', 'central', -20.5667, 26.2167, 'town', ['Sowa Town Centre', 'Soda Ash Road']],
  ['Mmadinare', 'central', -21.8833, 27.75, 'village', ['Main Road', 'Mmadinare Mall']],
  ['Shoshong', 'central', -23.0347, 26.5174, 'village', ['Main Road']],
  ['Mopipi', 'central', -21.1833, 24.8667, 'village', ['Main Road']],
  ['Lerala', 'central', -22.7847, 27.7611, 'village', ['Main Road']],
  ['Maunatlala', 'central', -22.597, 27.6301, 'village', ['Main Road']],

  // Additional settlements (coordinates verified against OSM / GeoNames / Wikidata)
  ['Ramokgonami', 'central', -22.8633, 27.4199, 'village', ['Main Road']],
  ['Maitengwe', 'central', -20.1275, 27.2203, 'village', ['Main Road']],
  ['Sefhophe', 'central', -22.1838, 27.9667, 'village', ['Main Road']],
  ['Mathangwane', 'central', -20.9969, 27.3387, 'village', ['Main Road']],
  ['Mmashoro', 'central', -21.8683, 26.4401, 'village', ['Main Road']],
  ['Dukwi', 'central', -20.5951, 26.5341, 'village', ['Main Road']],
  ['Pilane', 'kgatleng', -24.4058, 26.0863, 'village', ['Main Road']],
  ['Rasesa', 'kgatleng', -24.3729, 26.0735, 'village', ['Main Road']],
  ['Mmankgodi', 'kweneng', -24.7284, 25.6452, 'village', ['Main Road']],
  ['Tsetsebjwe', 'central', -22.4137, 28.3955, 'village', ['Main Road']],
]

export const TOWNS: Town[] = TOWN_ROWS.map(([name, region, lat, lng, localityType, areas, description]) => ({
  id: `twn-${slugify(name)}`,
  slug: slugify(name),
  name,
  regionId: `reg-${region}`,
  lat,
  lng,
  localityType,
  description,
  areas: areas ?? ['Main Road'],
  enabled: true,
}))

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
