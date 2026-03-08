"use client"

import { useMemo, useRef, useCallback, useState, useEffect } from "react"
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

type YahooQuote = {
  symbol: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
}

// Fetch real quotes from Yahoo Finance
async function fetchYahooQuotes(symbols: string[]): Promise<Record<string, YahooQuote>> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    if (!res.ok) return {}
    const json = await res.json()
    const result: Record<string, YahooQuote> = {}
    for (const q of json?.quoteResponse?.result ?? []) {
      result[q.symbol] = {
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice,
        regularMarketChange: q.regularMarketChange,
        regularMarketChangePercent: q.regularMarketChangePercent,
        regularMarketDayHigh: q.regularMarketDayHigh,
        regularMarketDayLow: q.regularMarketDayLow,
      }
    }
    return result
  } catch {
    return {}
  }
}

// Generate sparkline from a base price
function generateSparkline(basePrice: number, change: number, ticker: string, points: number = 24): number[] {
  const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const data: number[] = []
  const startPrice = basePrice - change
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const x = Math.sin(seed + i * 13) * 10000
    const noise = ((x - Math.floor(x)) - 0.5) * basePrice * 0.01
    data.push(startPrice + change * progress + noise)
  }
  return data
}

export function useStockQuotes() {
  const symbols = useMemo(() => ASSETS.map((a) => a.ticker), [])
  const { prices, connected } = useFinnhubPrices(symbols)
  const [yahooQuotes, setYahooQuotes] = useState<Record<string, YahooQuote>>({})
  const [loading, setLoading] = useState(true)

  // Fetch Yahoo Finance quotes on mount
  useEffect(() => {
    fetchYahooQuotes(symbols).then((quotes) => {
      setYahooQuotes(quotes)
      setLoading(false)
    })
  }, [symbols])

  // Track price history for sparklines
  const historyRef = useRef<Record<string, number[]>>({})

  const updateHistory = useCallback(
    (ticker: string, price: number) => {
      if (!historyRef.current[ticker]) {
        historyRef.current[ticker] = []
      }
      const hist = historyRef.current[ticker]
      hist.push(price)
      if (hist.length > 30) hist.shift()
    },
    []
  )

  const assets: AssetWithQuote[] = useMemo(() => {
    return ASSETS.map((asset) => {
      const livePrice = prices[asset.ticker]
      const yahoo = yahooQuotes[asset.ticker]

      // Priority: live WS price > Yahoo quote > static price
      const currentPrice = livePrice?.price ?? yahoo?.regularMarketPrice ?? asset.price
      const isLive = !!livePrice

      if (isLive) {
        updateHistory(asset.ticker, currentPrice)
      }

      // Use real Yahoo change data, or compute from live price
      const change24h = yahoo?.regularMarketChange ?? (currentPrice - asset.price)
      const change24hPercent = yahoo?.regularMarketChangePercent ?? (asset.price ? (change24h / asset.price) * 100 : 0)

      const sparklineData =
        historyRef.current[asset.ticker]?.length > 2
          ? historyRef.current[asset.ticker]
          : generateSparkline(currentPrice, change24h, asset.ticker)

      const high24h = yahoo?.regularMarketDayHigh ?? Math.max(...sparklineData)
      const low24h = yahoo?.regularMarketDayLow ?? Math.min(...sparklineData)

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
  }, [prices, yahooQuotes, updateHistory])

  return {
    assets,
    loading,
    error: connected ? null : (!process.env.NEXT_PUBLIC_FINNHUB_API_KEY ? "No Finnhub API key — showing static prices." : null),
    refetch: () => {
      fetchYahooQuotes(symbols).then(setYahooQuotes)
    },
  }
}
