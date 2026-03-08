"use client"

import { useAccount, useReadContracts } from "wagmi"
import { erc20Abi } from "viem"
import { baseSepolia, arbitrumSepolia, avalancheFuji } from "wagmi/chains"

const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [arbitrumSepolia.id]: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  [avalancheFuji.id]: "0x5425890298aed601595a70AB815c96711a31Bc65",
}

export interface UsdcBalance {
  chainId: number
  chainName: string
  balance: number
  address: `0x${string}`
  icon: string
}

const CHAINS = [
  { id: baseSepolia.id, name: "Base", icon: "/chains/base.svg" },
  { id: arbitrumSepolia.id, name: "Arbitrum", icon: "/chains/arbitrum.png" },
  { id: avalancheFuji.id, name: "Avalanche", icon: "/chains/avalanche.png" },
]

export function useUsdcBalances() {
  const { address } = useAccount()

  const contracts = CHAINS.map((chain) => ({
    address: USDC_ADDRESSES[chain.id],
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [address!] as const,
    chainId: chain.id,
  }))

  const { data, isLoading, refetch } = useReadContracts({
    contracts: address ? contracts : [],
    query: { enabled: !!address },
  })

  const balances: UsdcBalance[] = CHAINS.map((chain, i) => {
    const raw = data?.[i]?.result as bigint | undefined
    return {
      chainId: chain.id,
      chainName: chain.name,
      balance: raw ? Number(raw) / 1e6 : 0,
      address: USDC_ADDRESSES[chain.id],
      icon: chain.icon,
    }
  })

  const totalUsdc = balances.reduce((s, b) => s + b.balance, 0)

  return { balances, totalUsdc, isLoading, refetch }
}
