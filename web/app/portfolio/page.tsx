"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Wallet,
  Clock,
  ChevronRight,
} from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { ASSETS } from "@/lib/assets"
import { getStockLogoUrl, cn } from "@/lib/utils"

// ── Static placeholder holdings (will be replaced with on-chain data) ──
const HOLDINGS = [
  { ticker: "AAPL", qty: 12.5, avgCost: 218.30 },
  { ticker: "NVDA", qty: 45, avgCost: 122.50 },
  { ticker: "TSLA", qty: 8, avgCost: 255.00 },
  { ticker: "AMZN", qty: 15, avgCost: 195.60 },
  { ticker: "META", qty: 5, avgCost: 570.00 },
  { ticker: "GOOG", qty: 20, avgCost: 165.80 },
]

const RECENT_ACTIVITY = [
  { type: "buy" as const, ticker: "NVDA", qty: 10, price: 131.29, time: "2h ago" },
  { type: "buy" as const, ticker: "AAPL", qty: 5, price: 227.48, time: "1d ago" },
  { type: "sell" as const, ticker: "TSLA", qty: 3, price: 280.10, time: "2d ago" },
  { type: "buy" as const, ticker: "GOOG", qty: 8, price: 168.50, time: "3d ago" },
]

const ALLOC_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4",
]

function enrichHoldings() {
  return HOLDINGS.map((h) => {
    const asset = ASSETS.find((a) => a.ticker === h.ticker)!
    const currentPrice = asset.price
    const value = h.qty * currentPrice
    const cost = h.qty * h.avgCost
    const pnl = value - cost
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0
    return { ...h, asset, currentPrice, value, cost, pnl, pnlPercent }
  }).sort((a, b) => b.value - a.value)
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<"holdings" | "activity">("holdings")
  const holdings = enrichHoldings()

  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  const totalCost = holdings.reduce((s, h) => s + h.cost, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const positive = totalPnl >= 0

  const allocData = holdings.map((h, i) => ({
    name: h.ticker,
    value: h.value,
    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
    percent: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
  }))

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-1">
              <Wallet className="w-5 h-5 text-[#737373]" />
              <p className="text-sm text-[#737373] font-medium tracking-wide uppercase">Portfolio</p>
            </div>
            <div className="flex items-baseline gap-5 mt-2">
              <h1 className="text-5xl font-bold text-[#ededed] tabular-nums tracking-tight">
                ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              <div className={cn(
                "flex items-center gap-1.5 text-base font-medium",
                positive ? "text-emerald-400" : "text-red-400"
              )}>
                {positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {positive ? "+" : ""}${Math.abs(totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {" "}({positive ? "+" : ""}{totalPnlPercent.toFixed(2)}%)
              </div>
            </div>
            <p className="text-xs text-[#737373] mt-2">Unrealized P&L across all positions</p>
          </motion.div>

          {/* ── Top Stats Row ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {[
              { label: "Total Invested", val: `$${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: "Current Value", val: `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: "Positions", val: String(holdings.length) },
              { label: "Best Performer", val: holdings.sort((a, b) => b.pnlPercent - a.pnlPercent)[0]?.ticker ?? "—" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] p-5"
              >
                <p className="text-xs text-[#737373] mb-1.5">{stat.label}</p>
                <p className="text-lg font-semibold text-[#ededed] tabular-nums">{stat.val}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Main Grid: Holdings + Allocation ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left: Holdings / Activity */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="xl:col-span-2"
            >
              <div className="rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-[#1e1e1e]">
                  {(["holdings", "activity"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex-1 py-4 text-sm font-medium transition-colors capitalize",
                        activeTab === tab
                          ? "text-[#ededed] border-b-2 border-[#ededed]"
                          : "text-[#737373] hover:text-[#ededed]"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "holdings" ? (
                  <div className="divide-y divide-[#1e1e1e]">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs text-[#737373] font-medium">
                      <div className="col-span-4">Asset</div>
                      <div className="col-span-2 text-right">Price</div>
                      <div className="col-span-2 text-right">Holdings</div>
                      <div className="col-span-2 text-right">Value</div>
                      <div className="col-span-2 text-right">P&L</div>
                    </div>

                    {holdings.map((h, i) => {
                      const pos = h.pnl >= 0
                      return (
                        <Link
                          key={h.ticker}
                          href={`/markets/assets/${h.ticker}`}
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: 0.08 * i }}
                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#171717]/50 transition-colors group cursor-pointer"
                          >
                            {/* Asset */}
                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-[#171717] overflow-hidden flex-shrink-0">
                                <img
                                  src={getStockLogoUrl(h.ticker)}
                                  alt={h.ticker}
                                  className="w-9 h-9 object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#ededed] truncate">{h.ticker}</p>
                                <p className="text-xs text-[#737373] truncate">{h.asset.name}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-[#737373] opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                            </div>

                            {/* Price */}
                            <div className="col-span-2 text-right">
                              <p className="text-sm text-[#ededed] tabular-nums font-medium">
                                ${h.currentPrice.toFixed(2)}
                              </p>
                            </div>

                            {/* Holdings */}
                            <div className="col-span-2 text-right">
                              <p className="text-sm text-[#ededed] tabular-nums">
                                {h.qty.toFixed(h.qty % 1 === 0 ? 0 : 2)}
                              </p>
                              <p className="text-[10px] text-[#737373]">shares</p>
                            </div>

                            {/* Value */}
                            <div className="col-span-2 text-right">
                              <p className="text-sm text-[#ededed] tabular-nums font-medium">
                                ${h.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>

                            {/* P&L */}
                            <div className="col-span-2 text-right">
                              <p className={cn(
                                "text-sm font-medium tabular-nums",
                                pos ? "text-emerald-400" : "text-red-400"
                              )}>
                                {pos ? "+" : ""}${Math.abs(h.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className={cn(
                                "text-[10px] font-medium",
                                pos ? "text-emerald-400/70" : "text-red-400/70"
                              )}>
                                {pos ? "+" : ""}{h.pnlPercent.toFixed(2)}%
                              </p>
                            </div>
                          </motion.div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-[#1e1e1e]">
                    {RECENT_ACTIVITY.map((tx, i) => (
                      <motion.div
                        key={`${tx.ticker}-${tx.time}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.08 * i }}
                        className="flex items-center gap-4 px-6 py-4"
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                          tx.type === "buy" ? "bg-emerald-500/15" : "bg-red-500/15"
                        )}>
                          <ArrowUpRight className={cn(
                            "w-4 h-4",
                            tx.type === "buy" ? "text-emerald-400" : "text-red-400 rotate-180"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#ededed] capitalize">{tx.type}</p>
                            <p className="text-sm text-[#737373]">{tx.ticker}</p>
                          </div>
                          <p className="text-xs text-[#737373]">
                            {tx.qty} shares @ ${tx.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-[#ededed] tabular-nums">
                            ${(tx.qty * tx.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-[#737373] flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {tx.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right: Allocation */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="xl:col-span-1 space-y-6"
            >
              {/* Donut chart */}
              <div className="rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] p-6">
                <h3 className="text-sm font-semibold text-[#ededed] mb-5">Allocation</h3>
                <div className="w-full aspect-square max-w-[220px] mx-auto mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="90%"
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {allocData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div className="bg-[#0c0c0c] px-3 py-2 rounded-lg shadow-lg border border-[#1e1e1e]">
                              <p className="text-xs font-medium text-[#ededed]">
                                {payload[0].name}: {(payload[0].payload as { percent: number }).percent.toFixed(1)}%
                              </p>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  {allocData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-[#ededed] font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm text-[#737373] tabular-nums">{item.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="rounded-2xl bg-[#0c0c0c] border border-[#1e1e1e] p-6 space-y-4">
                <h3 className="text-sm font-semibold text-[#ededed] mb-2">Overview</h3>
                {[
                  ["Avg. Position Size", `$${(totalValue / holdings.length).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                  ["Largest Holding", `${allocData[0]?.name} (${allocData[0]?.percent.toFixed(1)}%)`],
                  ["Settlement", "Arbitrum Sepolia"],
                  ["Oracle", "Chainlink CCIP"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[#737373]">{label}</span>
                    <span className="text-[#ededed] font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
