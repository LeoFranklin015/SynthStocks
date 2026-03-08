"use client"

import { useEffect, useRef, useCallback, useState } from "react"

type TradeData = {
  p: number // price
  s: string // symbol
  t: number // timestamp
  v: number // volume
}

type PriceMap = Record<string, { price: number; timestamp: number; volume: number }>

const FINNHUB_WS_URL = "wss://ws.finnhub.io"

export function useFinnhubPrices(symbols: string[]) {
  const [prices, setPrices] = useState<PriceMap>({})
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const symbolsRef = useRef(symbols)
  symbolsRef.current = symbols

  const connect = useCallback(() => {
    const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY
    if (!token) {
      console.warn("NEXT_PUBLIC_FINNHUB_API_KEY not set — prices will use fallback data")
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${FINNHUB_WS_URL}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // Subscribe to all symbols
      symbolsRef.current.forEach((symbol) => {
        ws.send(JSON.stringify({ type: "subscribe", symbol }))
      })
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "trade" && Array.isArray(msg.data)) {
          setPrices((prev) => {
            const next = { ...prev }
            msg.data.forEach((trade: TradeData) => {
              next[trade.s] = {
                price: trade.p,
                timestamp: trade.t,
                volume: trade.v,
              }
            })
            return next
          })
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 5s
      reconnectTimer.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  // Subscribe to new symbols dynamically
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      symbols.forEach((symbol) => {
        wsRef.current!.send(JSON.stringify({ type: "subscribe", symbol }))
      })
    }
  }, [symbols])

  return { prices, connected }
}
