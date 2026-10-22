'use client'

import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type * as Leaflet from 'leaflet'
import { Maximize2, RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BOTSWANA_CENTER } from '@/lib/geo'
import { cn } from '@/lib/utils'
import type { Business } from '@/lib/types'

const PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'

/** The minimum a map pin needs — lets forms preview a position before a business exists. */
export type MapPoint = Pick<Business, 'id' | 'name' | 'lat' | 'lng'>

export interface BusinessMapProps {
  businesses: MapPoint[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Changing this value re-fits the view to the current markers (e.g. when filters change). */
  fitKey?: string
  /** A non-interactive preview (homepage, business profile): no panning, zooming or marker clicks. */
  interactive?: boolean
  cluster?: boolean
  maxFitZoom?: number
  className?: string
  /** Text for the bottom-left tag. Pass `null` to hide it. */
  tag?: string | null
}

type LeafletModule = typeof Leaflet

async function loadLeaflet(): Promise<LeafletModule> {
  const mod = (await import('leaflet')) as unknown as { default?: LeafletModule } & LeafletModule
  const L = (mod.default ?? mod) as LeafletModule
  // leaflet.markercluster is a UMD plugin that reads the global `L`.
  ;(window as unknown as { L: LeafletModule }).L = L
  await import('leaflet.markercluster')
  return L
}

export default function BusinessMap({ businesses, selectedId = null, onSelect, fitKey, interactive = true, cluster = true, maxFitZoom = 13, className, tag }: BusinessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const LRef = useRef<LeafletModule | null>(null)
  const groupRef = useRef<Leaflet.MarkerClusterGroup | Leaflet.LayerGroup | null>(null)
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map())
  const tilesRef = useRef<Leaflet.TileLayer | null>(null)
  const selectedRef = useRef<string | null>(selectedId)
  const onSelectRef = useRef(onSelect)
  const [ready, setReady] = useState(false)
  const [tilesFailed, setTilesFailed] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // ── create the map once ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let ro: ResizeObserver | null = null
    ;(async () => {
      const L = await loadLeaflet()
      if (cancelled || !containerRef.current) return
      LRef.current = L
      const map = L.map(containerRef.current, {
        center: BOTSWANA_CENTER,
        zoom: 6,
        minZoom: 5,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        maxBounds: [
          [-29, 18],
          [-16, 31],
        ],
        maxBoundsViscosity: 0.8,
      })
      if (interactive) L.control.zoom({ position: 'topright' }).addTo(map)

      let loaded = 0
      let errors = 0
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      })
      tiles.on('tileload', () => {
        loaded++
        setTilesFailed(false)
      })
      tiles.on('tileerror', () => {
        errors++
        if (errors >= 4 && loaded === 0) setTilesFailed(true)
      })
      tiles.addTo(map)
      tilesRef.current = tiles

      groupRef.current = cluster
        ? L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 48,
            spiderfyOnMaxZoom: true,
            iconCreateFunction: (c) => {
              const n = c.getChildCount()
              const size = n < 10 ? 34 : n < 50 ? 42 : 50
              return L.divIcon({ html: `<div class="fb-cluster-dot" style="width:${size}px;height:${size}px">${n}</div>`, className: 'fb-cluster', iconSize: [size, size] })
            },
          })
        : L.layerGroup()
      groupRef.current.addTo(map)

      ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(containerRef.current)
      mapRef.current = map
      setReady(true)
    })()
    return () => {
      cancelled = true
      ro?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      groupRef.current = null
      markersRef.current.clear()
      setReady(false)
    }
    // The map is created once; interactive/cluster are treated as constants for a given instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const iconFor = (selected: boolean) => {
    const L = LRef.current!
    return L.divIcon({ html: `<div class="fb-pin-dot">${PIN_SVG}</div>`, className: `fb-pin${selected ? ' fb-pin-selected' : ''}`, iconSize: [30, 30], iconAnchor: [15, 15] })
  }

  const fit = () => {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return
    const points = businesses.map((b) => [b.lat, b.lng] as [number, number])
    if (!points.length) {
      map.setView(BOTSWANA_CENTER, 6)
      return
    }
    if (points.length === 1) {
      map.setView(points[0], Math.min(maxFitZoom, 13))
      return
    }
    map.fitBounds(L.latLngBounds(points).pad(0.18), { maxZoom: maxFitZoom, animate: true })
  }

  // ── sync markers with the business list ───────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current
    const group = groupRef.current
    if (!ready || !L || !group) return
    group.clearLayers()
    markersRef.current.clear()
    const markers: Leaflet.Marker[] = []
    for (const b of businesses) {
      const marker = L.marker([b.lat, b.lng], { icon: iconFor(b.id === selectedRef.current), title: b.name, alt: b.name, keyboard: interactive, interactive, riseOnHover: true })
      if (interactive) marker.on('click', () => onSelectRef.current?.(b.id))
      markersRef.current.set(b.id, marker)
      markers.push(marker)
    }
    if ('addLayers' in group) group.addLayers(markers)
    else markers.forEach((m) => group.addLayer(m))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, businesses])

  // ── fit view when the result set meaningfully changes ──────────────────────────────────
  useEffect(() => {
    if (ready) fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey])

  // ── highlight the selected marker and bring it into view ────────────────────────────────
  useEffect(() => {
    const prev = selectedRef.current
    selectedRef.current = selectedId
    if (!ready || !LRef.current) return
    if (prev && prev !== selectedId) markersRef.current.get(prev)?.setIcon(iconFor(false))
    if (!selectedId) return
    const marker = markersRef.current.get(selectedId)
    const map = mapRef.current
    const group = groupRef.current
    if (!marker || !map) return
    marker.setIcon(iconFor(true))
    marker.setZIndexOffset(1000)
    const reveal = () => {
      if (selectedRef.current !== selectedId) return
      if (group && 'zoomToShowLayer' in group) group.zoomToShowLayer(marker, () => map.panTo(marker.getLatLng(), { animate: true }))
      else map.panTo(marker.getLatLng(), { animate: true })
    }
    reveal()
    // A fit-to-results animation may still be running, after which clusters re-form around the marker.
    // Re-check once the map settles and bring the marker back out if it got swallowed.
    const recheck = () => {
      if (selectedRef.current !== selectedId || !group) return
      const visible = 'getVisibleParent' in group ? group.getVisibleParent(marker) : marker
      if (visible && visible !== marker) reveal()
    }
    const onSettle = () => setTimeout(recheck, 150)
    map.once('moveend', onSettle)
    const timer = setTimeout(recheck, 900)
    return () => {
      clearTimeout(timer)
      map.off('moveend', onSettle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready])

  const retryTiles = () => {
    setTilesFailed(false)
    tilesRef.current?.redraw()
  }

  return (
    <div className={cn('relative isolate overflow-hidden rounded-xl border border-[#c8ddcb] bg-sage', className)}>
      <div ref={containerRef} role="application" aria-label="Map of Botswana showing business locations" className="absolute inset-0" />
      {!ready && <div aria-hidden className="absolute inset-0 grid grid-cols-1 animate-pulse place-items-center text-xs text-ink-muted">Loading map…</div>}
      {tag !== null && ready && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-forest shadow-sm">{tag ?? `Illustrative locations · ${businesses.length} records`}</div>
      )}
      {interactive && ready && (
        <button type="button" onClick={fit} aria-label="Fit all locations in view" className="absolute right-[10px] top-[84px] z-[500] grid grid-cols-1 size-[30px] place-items-center rounded-[4px] border-2 border-[rgba(0,0,0,0.2)] bg-white text-forest hover:bg-[#f4f4f4]">
          <Maximize2 className="size-3.5" />
        </button>
      )}
      {tilesFailed && (
        <div role="alert" className="absolute inset-x-4 top-4 z-[600] flex items-start gap-3 rounded-lg border border-[#e5d3a8] bg-warn-bg px-4 py-3 text-xs text-warn shadow">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1 leading-5">
            <span className="font-semibold">Map tiles couldn’t be loaded.</span> You may be offline or the tile server is unreachable. Business locations are still plotted below.
          </p>
          <button type="button" onClick={retryTiles} className="flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      )}
    </div>
  )
}
