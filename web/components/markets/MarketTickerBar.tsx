"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Radio } from "lucide-react"
import { useStockQuotes, type AssetWithQuote } from "@/hooks/useStockQuotes"
import { cn, getStockLogoUrl } from "@/lib/utils"

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return price.toFixed(2)
}

function TickerItem({ asset }: { asset: AssetWithQuote }) {
  const isPositive = asset.change24hPercent >= 0

  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 min-w-[200px] cursor-default">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted overflow-hidden">
        <img
          src={getStockLogoUrl(asset.ticker)}
          alt={asset.ticker}
          className="w-8 h-8 object-cover"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {asset.ticker}
        </span>
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
          {asset.name}
        </span>
      </div>
      <div className="flex flex-col items-end ml-auto">
        <span className="text-sm font-semibold text-foreground tabular-nums">
          ${formatPrice(asset.price)}
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? "+" : ""}
          {asset.change24hPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

function TickerSkeleton() {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border min-w-[200px]">
      <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
      <div className="flex flex-col gap-1">
        <div className="w-12 h-4 bg-muted rounded animate-pulse" />
        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex flex-col items-end ml-auto gap-1">
        <div className="w-16 h-4 bg-muted rounded animate-pulse" />
        <div className="w-12 h-3 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

export function MarketTickerBar() {
  const { assets, loading } = useStockQuotes()

  // Filter to only show assets with valid prices
  const validAssets = assets.filter((a) => a.price > 0)

  // Show loading state
  if (loading && validAssets.length === 0) {
    return (
      <div className="relative overflow-hidden border-b border-border bg-background/80">
        <div className="flex gap-6 py-4 px-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TickerSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Don't render if no valid assets
  if (validAssets.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden border-b border-border bg-background/80">
      {/* Live indicator */}
      {validAssets.some((a) => a.isLive) && (
        <div className="absolute top-2 right-4 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
          <Radio className="w-3 h-3 animate-pulse" />
          Live
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background via-background/95 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background via-background/95 to-transparent z-10 pointer-events-none" />

      {/* Scrolling ticker */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-6 py-4 animate-ticker"
        style={{ width: "max-content" }}
      >
        {/* Duplicate assets for seamless scrolling */}
        {[...validAssets, ...validAssets].map((asset, i) => (
          <TickerItem key={`${asset.id}-${i}`} asset={asset} />
        ))}
      </motion.div>
    </div>
  )
}
