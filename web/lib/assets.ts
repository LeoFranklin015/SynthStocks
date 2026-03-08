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

export const ASSETS: AssetData[] = [
  {
    id: "aapl",
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 227.48,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$3.45T",
  },
  {
    id: "amzn",
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    price: 205.74,
    category: "Consumer",
    categories: ["Consumer", "Large Cap", "Growth"],
    marketCap: "$2.16T",
  },
  {
    id: "goog",
    ticker: "GOOG",
    name: "Alphabet Inc.",
    price: 171.26,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$2.11T",
  },
  {
    id: "msft",
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: 412.89,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$3.07T",
  },
  {
    id: "tsla",
    ticker: "TSLA",
    name: "Tesla Inc.",
    price: 271.34,
    category: "Consumer",
    categories: ["Consumer", "Growth"],
    marketCap: "$868B",
  },
  {
    id: "nvda",
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 131.29,
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$3.22T",
  },
  {
    id: "meta",
    ticker: "META",
    name: "Meta Platforms",
    price: 596.25,
    category: "Technology",
    categories: ["Technology", "Large Cap"],
    marketCap: "$1.51T",
  },
  {
    id: "nflx",
    ticker: "NFLX",
    name: "Netflix Inc.",
    price: 968.44,
    category: "Consumer",
    categories: ["Consumer", "Growth"],
    marketCap: "$418B",
  },
  {
    id: "amd",
    ticker: "AMD",
    name: "Advanced Micro Devices",
    price: 116.52,
    category: "Technology",
    categories: ["Technology", "Growth"],
    marketCap: "$189B",
  },
  {
    id: "jpm",
    ticker: "JPM",
    name: "JPMorgan Chase",
    price: 245.78,
    category: "Financials",
    categories: ["Financials", "Large Cap", "Value"],
    marketCap: "$709B",
  },
  {
    id: "pfe",
    ticker: "PFE",
    name: "Pfizer Inc.",
    price: 25.31,
    category: "Healthcare",
    categories: ["Value"],
    marketCap: "$143B",
    addedDate: "Mar 2026",
  },
  {
    id: "intc",
    ticker: "INTC",
    name: "Intel Corp.",
    price: 23.45,
    category: "Technology",
    categories: ["Technology", "Value"],
    marketCap: "$101B",
    addedDate: "Mar 2026",
  },
  {
    id: "sofi",
    ticker: "SOFI",
    name: "SoFi Technologies",
    price: 14.82,
    category: "Financials",
    categories: ["Financials", "Growth"],
    marketCap: "$16.2B",
    addedDate: "Feb 2026",
  },
  {
    id: "open",
    ticker: "OPEN",
    name: "Opendoor Technologies",
    price: 1.78,
    category: "Real Estate",
    categories: ["Growth"],
    marketCap: "$1.2B",
    addedDate: "Feb 2026",
  },
]

export function getAssetByTicker(ticker: string): AssetData | undefined {
  return ASSETS.find((a) => a.ticker.toUpperCase() === ticker.toUpperCase())
}
