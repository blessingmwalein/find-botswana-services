'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { BusinessMapProps } from './business-map'

// Leaflet touches `window`, so the map is only ever loaded in the browser.
const BusinessMap = dynamic(() => import('./business-map'), {
  ssr: false,
  loading: () => <div aria-hidden className="absolute inset-0 animate-pulse bg-sage" />,
})

export function MapView(props: BusinessMapProps) {
  return (
    <div className={cn('relative', props.className)}>
      <BusinessMap {...props} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
