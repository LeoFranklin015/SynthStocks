"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Radio } from "lucide-react"
import { Sparkline } from "./Sparkline"
import { cn, getStockLogoUrl } from "@/lib/utils"

import type { AssetData } from "@/lib/assets"

export type AssetCardProps = AssetData

export function AssetCard({
  asset,
  variant = "grid",
  index = 0,
}: {
  asset: AssetData & {
    price: number
    change24h: number
    change24hPercent: number
    sparklineData: number[]
    isLive?: boolean
    high24h?: number
    low24h?: number
  }
  variant?: "grid" | "list"
  index?: number
}) {
  const positive = asset.change24h >= 0
  const isLive = "isLive" in asset && asset.isLive

  return (
    <Link href={`/markets/assets/${asset.ticker}`}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className={cn(
        "group relative rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-lg hover:border-border/80 transition-all duration-300 overflow-hidden cursor-pointer",
        variant === "list" && "flex flex-row items-center gap-6"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          variant === "list" && "flex-row flex-1 items-center"
        )}
      >
        {/* Top: Icon, Ticker, Name, Live badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted overflow-hidden">
              <img
                src={getStockLogoUrl(asset.ticker)}
                alt={asset.ticker}
                className="w-10 h-10 object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {asset.ticker}
                </p>
                {isLive && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 text-[10px] font-medium">
                    <Radio className="w-2.5 h-2.5" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <motion.p
            key={asset.price}
            initial={{ opacity: 0.7, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold text-foreground tracking-tight tabular-nums"
          >
            ${asset.price.toFixed(2)}
          </motion.p>
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              positive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {positive ? (
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 flex-shrink-0" />
            )}
            <span>
              {positive ? "+" : ""}${Math.abs(asset.change24h).toFixed(2)} (
              {positive ? "+" : ""}
              {asset.change24hPercent.toFixed(2)}%)
            </span>
            <span className="text-muted-foreground font-normal">24H</span>
          </div>
          {asset.high24h != null && asset.low24h != null && variant === "grid" && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Day: ${asset.low24h.toFixed(2)} – ${asset.high24h.toFixed(2)}
            </p>
          )}
        </div>

        {/* Sparkline */}
        <div
          className={cn(
            "w-full",
            variant === "grid" ? "h-16" : "h-12 w-32 flex-shrink-0"
          )}
        >
          <Sparkline
            data={asset.sparklineData}
            width={variant === "grid" ? 240 : 128}
            height={variant === "grid" ? 64 : 48}
            positive={positive}
          />
        </div>
      </div>
    </motion.div>
    </Link>
  )
}
