"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Radio } from "lucide-react"
import type { AssetWithQuote } from "@/hooks/useStockQuotes"
import { cn, getStockLogoUrl } from "@/lib/utils"

function ColumnItem({
  asset,
  type,
}: {
  asset: AssetWithQuote
  type: "gainers" | "trending" | "newlyAdded"
}) {
  const positive = asset.change24h >= 0

  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border/60 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted overflow-hidden">
        <img
          src={getStockLogoUrl(asset.ticker)}
          alt={asset.ticker}
          className="w-9 h-9 object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">
          {asset.ticker}
        </p>
        <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-foreground">
          ${asset.price.toFixed(2)}
        </p>
        {type === "gainers" && (
          <p
            className={cn(
              "flex items-center justify-end gap-0.5 text-xs font-medium",
              positive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {positive ? "+" : ""}
            {asset.change24hPercent.toFixed(2)}%
          </p>
        )}
        {type === "trending" && asset.marketCap && (
          <p className="text-xs text-muted-foreground">{asset.marketCap}</p>
        )}
        {type === "newlyAdded" && (
          <p className="text-xs text-muted-foreground">
            {asset.addedDate ?? `${asset.category} Stock`}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function Column({
  title,
  items,
  type,
  delay = 0,
}: {
  title: string
  items: AssetWithQuote[]
  type: "gainers" | "trending" | "newlyAdded"
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex-1 min-w-0 rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {items.some((a) => a.isLive) && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <Radio className="w-3 h-3" />
              Live
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-400 font-medium">24H</span>
      </div>
      <div className="space-y-1">
        {items.map((asset) => (
          <ColumnItem key={asset.id} asset={asset} type={type} />
        ))}
      </div>
    </motion.div>
  )
}

type AssetColumnsProps = {
  assets: AssetWithQuote[]
  loading?: boolean
}

export function AssetColumns({ assets, loading }: AssetColumnsProps) {
  const topGainers = [...assets]
    .filter((a) => a.change24hPercent > 0)
    .sort((a, b) => b.change24hPercent - a.change24hPercent)
    .slice(0, 5)

  const trending = assets.length >= 9
    ? [assets[0], assets[1], assets[6], assets[7], assets[8]]
    : assets.slice(0, 5)

  const newlyAdded = assets.filter((a) => a.addedDate).slice(0, 5)

  if (loading && assets.every((a) => !a.isLive)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <Column
        title="Top Gainers"
        items={topGainers}
        type="gainers"
        delay={0.1}
      />
      <Column
        title="Trending"
        items={trending}
        type="trending"
        delay={0.15}
      />
      <Column
        title="Newly Added"
        items={newlyAdded}
        type="newlyAdded"
        delay={0.2}
      />
    </div>
  )
}
