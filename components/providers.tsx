'use client'

import { useEffect } from 'react'
import { dismissNotice, hydrateStore, installCrossTabSync } from '@/lib/store/store'
import { useAppState } from '@/lib/store/hooks'
import { ToastProvider, useToast } from '@/components/ui/toast'

function StoreBootstrap({ children }: { children: React.ReactNode }) {
  const { notice } = useAppState()
  const toast = useToast()

  useEffect(() => {
    hydrateStore()
    return installCrossTabSync()
  }, [])

  useEffect(() => {
    if (notice) {
      toast.info(`Saved demo changes were reset. ${notice}`)
      dismissNotice()
    }
  }, [notice, toast])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <StoreBootstrap>{children}</StoreBootstrap>
    </ToastProvider>
  )
}
