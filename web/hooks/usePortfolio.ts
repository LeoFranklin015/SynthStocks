"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount, useChainId } from "wagmi"
import { querySubgraph } from "@/lib/subgraph"
import { ASSETS, type AssetData } from "@/lib/assets"

// ── Subgraph response types ──

interface SubgraphPosition {
  id: string
  token: { id: string }
  balance: string
  totalBought: string
  totalSold: string
  totalVolumeUSDC: string
  flagged: boolean
}

interface SubgraphTrade {
  id: string
  type: "BUY" | "SELL"
  token: { id: string }
  usdcAmount: string
  tokenAmount: string
  timestamp: string
  transactionHash: string
}

interface SubgraphUser {
  id: string
  verified: boolean
  positions: SubgraphPosition[]
  trades: SubgraphTrade[]
}

// ── Exported types ──

export interface PortfolioPosition {
  asset: AssetData
  tokenAddress: string
  balance: number       // token balance (18 decimals → human)
  totalBought: number
  totalSold: number
  totalVolumeUSDC: number // USDC volume (6 decimals → human)
  flagged: boolean
  currentPrice: number
  value: number         // balance * currentPrice
}

export interface PortfolioTrade {
  id: string
  type: "BUY" | "SELL"
  asset: AssetData | undefined
  tokenAddress: string
  usdcAmount: number
  tokenAmount: number
  timestamp: number
  transactionHash: string
}

export interface PortfolioData {
  positions: PortfolioPosition[]
  trades: PortfolioTrade[]
  verified: boolean
  totalValue: number
  totalVolumeUSDC: number
  loading: boolean
  error: string | null
  refetch: () => void
}

const PORTFOLIO_QUERY = `
  query GetPortfolio($user: Bytes!) {
    user(id: $user) {
      id
      verified
      positions(where: { balance_gt: "0" }, orderBy: totalVolumeUSDC, orderDirection: desc) {
        id
        token { id }
        balance
        totalBought
        totalSold
        totalVolumeUSDC
        flagged
      }
      trades(first: 20, orderBy: timestamp, orderDirection: desc) {
        id
        type
        token { id }
        usdcAmount
        tokenAmount
        timestamp
        transactionHash
      }
    }
  }
`

function toHuman18(raw: string): number {
  const n = Number(raw)
  return n / 1e18
}

function toHuman6(raw: string): number {
  const n = Number(raw)
  return n / 1e6
}

function findAssetByAddress(address: string): AssetData | undefined {
  return ASSETS.find(
    (a) => a.address?.toLowerCase() === address.toLowerCase()
  )
}

export function usePortfolio(): PortfolioData {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [trades, setTrades] = useState<PortfolioTrade[]>([])
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolio = useCallback(async () => {
    if (!isConnected || !address) {
      setPositions([])
      setTrades([])
      setVerified(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await querySubgraph<{ user: SubgraphUser | null }>(
        chainId,
        PORTFOLIO_QUERY,
        { user: address.toLowerCase() }
      )

      if (!data.user) {
        setPositions([])
        setTrades([])
        setVerified(false)
        setLoading(false)
        return
      }

      setVerified(data.user.verified)

      const mappedPositions: PortfolioPosition[] = data.user.positions
        .map((p) => {
          const tokenAddr = p.token.id
          const asset = findAssetByAddress(tokenAddr)
          if (!asset) return null
          const balance = toHuman18(p.balance)
          const currentPrice = asset.price
          return {
            asset,
            tokenAddress: tokenAddr,
            balance,
            totalBought: toHuman18(p.totalBought),
            totalSold: toHuman18(p.totalSold),
            totalVolumeUSDC: toHuman6(p.totalVolumeUSDC),
            flagged: p.flagged,
            currentPrice,
            value: balance * currentPrice,
          }
        })
        .filter((p): p is PortfolioPosition => p !== null)
        .sort((a, b) => b.value - a.value)

      const mappedTrades: PortfolioTrade[] = data.user.trades.map((t) => ({
        id: t.id,
        type: t.type,
        asset: findAssetByAddress(t.token.id),
        tokenAddress: t.token.id,
        usdcAmount: toHuman6(t.usdcAmount),
        tokenAmount: toHuman18(t.tokenAmount),
        timestamp: Number(t.timestamp),
        transactionHash: t.transactionHash,
      }))

      setPositions(mappedPositions)
      setTrades(mappedTrades)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio")
    } finally {
      setLoading(false)
    }
  }, [address, isConnected, chainId])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const totalValue = positions.reduce((s, p) => s + p.value, 0)
  const totalVolumeUSDC = positions.reduce((s, p) => s + p.totalVolumeUSDC, 0)

  return {
    positions,
    trades,
    verified,
    totalValue,
    totalVolumeUSDC,
    loading,
    error,
    refetch: fetchPortfolio,
  }
}
