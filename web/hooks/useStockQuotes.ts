"use client"

import { useMemo, useRef, useCallback } from "react"
import { ASSETS, type AssetData } from "@/lib/assets"
import { useFinnhubPrices } from "./useFinnhubPrices"

export type AssetWithQuote = AssetData & {
  price: number
  change24h: number
  change24hPercent: number
  sparklineData: number[]
  isLive: boolean
  high24h?: number
  low24h?: number
}

// Generate fake sparkline from a base price with some noise
function generateSparkline(basePrice: number, change: number, points: number = 24): number[] {
  const data: number[] = []
  const startPrice = basePrice - change
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const noise = (Math.random() - 0.5) * basePrice * 0.01
    data.push(startPrice + change * progress + noise)
  }
  return data
}

export function useStockQuotes() {
  const symbols = useMemo(() => ASSETS.map((a) => a.ticker), [])
  const { prices, connected } = useFinnhubPrices(symbols)

  // Track price history for sparklines
  const historyRef = useRef<Record<string, number[]>>({})

  const updateHistory = useCallback(
    (ticker: string, price: number) => {
      if (!historyRef.current[ticker]) {
        historyRef.current[ticker] = []
      }
      const hist = historyRef.current[ticker]
      hist.push(price)
      // Keep last 30 points
      if (hist.length > 30) hist.shift()
    },
    []
  )

  const assets: AssetWithQuote[] = useMemo(() => {
    return ASSETS.map((asset) => {
      const livePrice = prices[asset.ticker]
      const currentPrice = livePrice?.price ?? asset.price
      const isLive = !!livePrice

      if (isLive) {
        updateHistory(asset.ticker, currentPrice)
      }

      // Calculate change from base price
      const change24h = currentPrice - asset.price
      const change24hPercent = asset.price ? (change24h / asset.price) * 100 : 0

      // Use live history or generate sparkline
      const sparklineData =
        historyRef.current[asset.ticker]?.length > 2
          ? historyRef.current[asset.ticker]
          : generateSparkline(currentPrice, change24h)

      const high24h = Math.max(...sparklineData)
      const low24h = Math.min(...sparklineData)

      return {
        ...asset,
        price: currentPrice,
        change24h,
        change24hPercent,
        sparklineData,
        isLive,
        high24h,
        low24h,
      }
    })
  }, [prices, updateHistory])

  return {
    assets,
    loading: false,
    error: connected ? null : (!process.env.NEXT_PUBLIC_FINNHUB_API_KEY ? "No Finnhub API key — showing static prices." : null),
    refetch: () => {},
  }
}
