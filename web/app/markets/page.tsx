"use client"

import { PortfolioNavbar } from "@/components/PortfolioNavbar"
import { MarketTickerBar } from "@/components/markets/MarketTickerBar"
import { AssetColumns } from "@/components/markets/AssetColumns"
import { ProductGrid } from "@/components/markets/ProductGrid"
import { useStockQuotes } from "@/hooks/useStockQuotes"
import { Toaster } from "sonner"

export default function MarketsPage() {
  const { assets, loading, error, refetch } = useStockQuotes()

  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <Toaster theme="dark" position="bottom-right" />
      <main className="pt-16 pb-16">
        <MarketTickerBar />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <AssetColumns assets={assets} loading={loading} />
          <ProductGrid assets={assets} loading={loading} error={error} onRefetch={refetch} />
        </div>
      </main>
    </div>
  )
}
