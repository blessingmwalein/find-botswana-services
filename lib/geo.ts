// Geographic helpers shared by the seed generator, search and map.

/** Bounding box that comfortably contains Botswana (used as a sanity check for coordinates). */
export const BOTSWANA_BOUNDS = { south: -26.95, north: -17.75, west: 19.95, east: 29.4 }

/** Default map view: centred on the country. */
export const BOTSWANA_CENTER: [number, number] = [-22.2, 23.9]

export function inBotswana(lat: number, lng: number): boolean {
  return (
    lat >= BOTSWANA_BOUNDS.south &&
    lat <= BOTSWANA_BOUNDS.north &&
    lng >= BOTSWANA_BOUNDS.west &&
    lng <= BOTSWANA_BOUNDS.east
  )
}

const R_EARTH_KM = 6371

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Move a point `distKm` along `bearingRad` (0 = north). Adequate for the short offsets used here. */
export function offsetPoint(lat: number, lng: number, distKm: number, bearingRad: number): [number, number] {
  const dLat = (distKm * Math.cos(bearingRad)) / 111.32
  const dLng = (distKm * Math.sin(bearingRad)) / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [lat + dLat, lng + dLng]
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
