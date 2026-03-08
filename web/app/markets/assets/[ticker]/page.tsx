"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { PortfolioNavbar } from "@/components/PortfolioNavbar"
import { AssetDetailView } from "@/components/markets/AssetDetailView"
import { getAssetByTicker } from "@/lib/assets"
import { Toaster } from "sonner"

type Props = {
  params: Promise<{ ticker: string }>
}

export default function AssetPage({ params }: Props) {
  const { ticker } = use(params)
  const asset = getAssetByTicker(ticker)

  if (!asset) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <Toaster theme="dark" position="bottom-right" />
      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <AssetDetailView asset={asset} />
      </main>
    </div>
  )
}
