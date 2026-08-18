import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ProductCategory } from '@/types'

interface ScanFlowState {
  ocrText: string
  setOcrText: (text: string) => void
  category: ProductCategory | null
  setCategory: (category: ProductCategory) => void
  reset: () => void
}

const ScanFlowContext = createContext<ScanFlowState | null>(null)

export function ScanFlowProvider({ children }: { children: ReactNode }) {
  const [ocrText, setOcrText] = useState('')
  const [category, setCategory] = useState<ProductCategory | null>(null)

  const reset = () => {
    setOcrText('')
    setCategory(null)
  }

  return (
    <ScanFlowContext.Provider value={{ ocrText, setOcrText, category, setCategory, reset }}>
      {children}
    </ScanFlowContext.Provider>
  )
}

export function useScanFlow() {
  const ctx = useContext(ScanFlowContext)
  if (!ctx) throw new Error('useScanFlow must be used within a ScanFlowProvider')
  return ctx
}
