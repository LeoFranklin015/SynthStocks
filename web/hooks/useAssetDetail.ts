"use client"

import { useMemo, useRef } from "react"
import { type AssetData } from "@/lib/assets"
import { useFinnhubPrices } from "./useFinnhubPrices"

export type AssetDetailData = AssetData & {
  price: number
  change24h: number
  change24hPercent: number
  sparklineData: number[]
  chartData: { time: number; value: number }[]
  isLive: boolean
  isLoading: boolean
}

// Deterministic seed-based pseudo-random so chart doesn't flicker on re-render
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateRealisticChart(
  ticker: string,
  basePrice: number,
  range: string
): { time: number; value: number }[] {
  const now = Date.now()
  const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0)

  const config: Record<string, { points: number; intervalMs: number; volatility: number }> = {
    "1D": { points: 78, intervalMs: 5 * 60 * 1000, volatility: 0.002 },
    "1W": { points: 35, intervalMs: 4 * 60 * 60 * 1000, volatility: 0.004 },
    "1M": { points: 30, intervalMs: 24 * 60 * 60 * 1000, volatility: 0.008 },
    "3M": { points: 90, intervalMs: 24 * 60 * 60 * 1000, volatility: 0.01 },
    "1Y": { points: 52, intervalMs: 7 * 24 * 60 * 60 * 1000, volatility: 0.015 },
    ALL: { points: 60, intervalMs: 30 * 24 * 60 * 60 * 1000, volatility: 0.02 },
  }

  const { points, intervalMs, volatility } = config[range] ?? config["1M"]
  const data: { time: number; value: number }[] = []

  // Walk backward from current price
  let price = basePrice
  const prices: number[] = [price]
  for (let i = 1; i < points; i++) {
    const r = seededRandom(seed + i * 7 + range.charCodeAt(0)) - 0.48
    price = price / (1 + r * volatility)
    prices.unshift(price)
  }

  for (let i = 0; i < points; i++) {
    data.push({
      time: now - (points - 1 - i) * intervalMs,
      value: prices[i],
    })
  }

  return data
}

export function useAssetDetail(asset: AssetData, range: string = "1M"): AssetDetailData {
  const { prices } = useFinnhubPrices([asset.ticker])
  const liveTradesRef = useRef<{ time: number; value: number }[]>([])

  // Append live WS trades
  const livePrice = prices[asset.ticker]
  if (livePrice) {
    const last = liveTradesRef.current[liveTradesRef.current.length - 1]
    if (!last || last.time !== livePrice.timestamp) {
      liveTradesRef.current.push({ time: livePrice.timestamp, value: livePrice.price })
      if (liveTradesRef.current.length > 500) liveTradesRef.current.shift()
    }
  }

  return useMemo(() => {
    const currentPrice = livePrice?.price ?? asset.price
    const isLive = !!livePrice

    // Generate base chart from static price, then append any live trades
    const baseChart = generateRealisticChart(asset.ticker, currentPrice, range)
    const chartData = isLive
      ? [...baseChart, ...liveTradesRef.current]
      : baseChart

    const openPrice = chartData[0]?.value ?? asset.price
    const change24h = currentPrice - openPrice
    const change24hPercent = openPrice ? (change24h / openPrice) * 100 : 0
    const sparklineData = chartData.map((d) => d.value)

    return {
      ...asset,
      price: currentPrice,
      change24h,
      change24hPercent,
      sparklineData,
      chartData,
      isLive,
      isLoading: false,
    }
  }, [asset, livePrice, range])
}
