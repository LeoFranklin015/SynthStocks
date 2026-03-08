export type AssetData = {
  id: string
  ticker: string
  name: string
  price: number
  category: string
  categories: string[]
  marketCap?: string
  addedDate?: string
  address?: string
  chainId?: number
  icon?: string
  iconBg?: string
}

// Token address is the same on all chains (deployed via CREATE2)
export const ASSETS: AssetData[] = [
  {
    id: "nvda",
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 131.29,
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$3.22T",
    address: "0xE9fDDe38E64771468885c173878B211DA71d1078",
  },
  {
    id: "tsla",
    ticker: "TSLA",
    name: "Tesla Inc.",
    price: 271.34,
    category: "Consumer",
    categories: ["Consumer", "Growth"],
    marketCap: "$868B",
    address: "0xc60a1a5Af73F576FB4436C8BD0BD9E2379eae921",
  },
  {
    id: "amzn",
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    price: 205.74,
    category: "Consumer",
    categories: ["Consumer", "Large Cap", "Growth"],
    marketCap: "$2.16T",
    address: "0x76B096A372c7E87F58dd94ec75f79182DC5e864F",
  },
  {
    id: "meta",
    ticker: "META",
    name: "Meta Platforms",
    price: 596.25,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$1.51T",
    address: "0x6e0d008Be276eC5e9b91DCB56B55Ea6A15Be96b3",
  },
  {
    id: "aapl",
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 227.48,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$3.45T",
    address: "0x2149bD489aaC80CAD09108A4D137ECDE76a5245f",
  },
  {
    id: "goog",
    ticker: "GOOG",
    name: "Alphabet Inc.",
    price: 171.26,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$2.11T",
    address: "0x1b265F2268D26bb8Bb463DA9048148C4185021b3",
  },
]

export function getAssetByTicker(ticker: string): AssetData | undefined {
  return ASSETS.find((a) => a.ticker.toUpperCase() === ticker.toUpperCase())
}
