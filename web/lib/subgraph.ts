const SUBGRAPH_URLS: Record<number, string> = {
  84532: "https://api.studio.thegraph.com/query/1743917/synth-token-base/version/latest",      // Base Sepolia
  421614: "https://api.studio.thegraph.com/query/1743917/synth-token-arb/version/latest",      // Arbitrum Sepolia
  43113: "https://api.studio.thegraph.com/query/1743917/synth-token-avax/version/latest",      // Avalanche Fuji
}

export const SUPPORTED_CHAIN_IDS = Object.keys(SUBGRAPH_URLS).map(Number)

export function getSubgraphUrl(chainId: number): string | null {
  return SUBGRAPH_URLS[chainId] ?? null
}

export async function querySubgraph<T = unknown>(
  chainId: number,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const url = getSubgraphUrl(chainId)
  if (!url) throw new Error(`No subgraph for chain ${chainId}`)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data as T
}
