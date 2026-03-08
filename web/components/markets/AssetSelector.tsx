"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { ASSETS, type AssetData } from "@/lib/assets"
import { cn, getStockLogoUrl } from "@/lib/utils"
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

export type PaymentAsset = {
  ticker: string
  name: string
  price: number
  address: string
  icon?: string
  iconBg?: string
}

interface AssetSelectorProps {
  selectedAsset: PaymentAsset
  onSelectAsset: (asset: PaymentAsset) => void
  currentAssetTicker?: string // Prevent selecting the same asset user is buying
  unifiedBalances?: Array<{ asset: string; amount: string }>
}

export function AssetSelector({
  selectedAsset,
  onSelectAsset,
  currentAssetTicker,
  unifiedBalances = [],
}: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Build available assets list
  const availableAssets: PaymentAsset[] = [
    {
      ticker: "USDC",
      name: "USD Coin",
      price: 1,
      address: USDC_ADDRESS,
      icon: "$",
      iconBg: "bg-blue-500",
    },
    ...ASSETS.filter((asset) => asset.ticker !== currentAssetTicker).map((asset) => ({
      ticker: asset.ticker,
      name: asset.name,
      price: asset.price,
      address: asset.address || "",
      icon: asset.icon,
      iconBg: asset.iconBg,
    })),
  ]

  // Get balance for an asset
  const getBalance = (ticker: string) => {
    const balance = unifiedBalances.find((b) => b.asset.toLowerCase() === ticker.toLowerCase())
    return balance ? parseFloat(balance.amount) : 0
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#171717]/50 transition-colors"
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
            selectedAsset.ticker === "USDC" ? "bg-blue-500" : selectedAsset.iconBg
          )}
        >
          {selectedAsset.ticker === "USDC" ? (
            "$"
          ) : (
            <img
              src={getStockLogoUrl(selectedAsset.ticker)}
              alt={selectedAsset.ticker}
              className="w-6 h-6 object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                e.currentTarget.nextElementSibling?.classList.remove("hidden")
              }}
            />
          )}
          <span
            className={cn(
              "hidden w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
              selectedAsset.iconBg
            )}
          >
            {selectedAsset.icon?.slice(0, 1)}
          </span>
        </div>
        <span className="text-sm font-medium text-[#ededed]">{selectedAsset.ticker}</span>
        <ChevronDown className="w-4 h-4 text-[#737373]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-[#737373] px-3 py-2 font-medium">
              Select Payment Asset
            </div>
            {availableAssets.map((asset) => {
              const balance = getBalance(asset.ticker)
              return (
                <button
                  key={asset.ticker}
                  type="button"
                  onClick={() => {
                    onSelectAsset(asset)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#171717]/50 transition-colors",
                    selectedAsset.ticker === asset.ticker && "bg-[#171717]"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                      asset.ticker === "USDC" ? "bg-blue-500" : asset.iconBg
                    )}
                  >
                    {asset.ticker === "USDC" ? (
                      "$"
                    ) : (
                      <img
                        src={getStockLogoUrl(asset.ticker)}
                        alt={asset.ticker}
                        className="w-8 h-8 object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                          e.currentTarget.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    )}
                    <span
                      className={cn(
                        "hidden w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                        asset.iconBg
                      )}
                    >
                      {asset.icon?.slice(0, 1)}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-[#ededed]">{asset.ticker}</div>
                    <div className="text-xs text-[#737373] truncate">{asset.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#ededed]">
                      ${asset.price.toFixed(2)}
                    </div>
                    {balance > 0 && (
                      <div className="text-xs text-[#737373]">{balance.toFixed(4)}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
