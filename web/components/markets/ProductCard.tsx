"use client"

import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProductCardProps = {
  id: string
  name: string
  ticker: string
  description: string
  apy: string
  category: "General Access" | "Qualified Access"
  networks: string[]
  tvl?: string
  gradient: string
}

export function ProductCard({
  product,
  variant = "grid",
}: {
  product: ProductCardProps
  variant?: "grid" | "list"
}) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300",
        variant === "list" && "flex flex-row items-center gap-6"
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between",
          variant === "list" ? "flex-shrink-0 flex-col gap-2" : "mb-4"
        )}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 ${product.gradient}`}
        >
          {product.ticker.slice(0, 2)}
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${
            product.category === "General Access"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {product.category}
        </span>
      </div>

      <div className={cn("min-w-0", variant === "list" && "flex-1")}>
        <div className={cn(variant === "list" && "flex items-center gap-4 mb-2")}>
          <h3 className="text-lg font-semibold text-white">{product.name}</h3>
          <p className="text-sm text-zinc-500">{product.ticker}</p>
        </div>
        <p
          className={cn(
            "text-sm text-zinc-400 leading-relaxed",
            variant === "grid" ? "mb-5 line-clamp-2" : "mb-3 line-clamp-1"
          )}
        >
          {product.description}
        </p>
        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            variant === "grid" ? "mb-5" : "mb-0"
          )}
        >
          {product.networks.map((network) => (
            <span
              key={network}
              className="text-xs px-2 py-0.5 rounded bg-white/5 text-zinc-500"
            >
              {network}
            </span>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between flex-shrink-0",
          variant === "list" && "flex-col sm:flex-row gap-2 sm:gap-6"
        )}
      >
        <div>
          <p className="text-xs text-zinc-500">Current APY</p>
          <p className="text-lg font-semibold text-emerald-400">{product.apy}</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors group-hover:bg-blue-500/20 group-hover:text-blue-400"
        >
          Invest
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}
