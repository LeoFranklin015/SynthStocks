"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount, useReadContracts } from "wagmi"
import {
  IDKitRequestWidget,
  deviceLegacy,
  type RpContext,
} from "@worldcoin/idkit"
import { toast } from "sonner"
import { CHAIN_CONTRACTS, EXCHANGE_ABI } from "@/lib/contracts"

// Check verification on Base Sepolia + Arbitrum Sepolia
const CHECK_CHAINS = CHAIN_CONTRACTS.filter(
  (c) => c.chainId === 84532 || c.chainId === 421614
)

export function VerificationGate() {
  const { address, isConnected } = useAccount()
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [rpContext, setRpContext] = useState<RpContext | null>(null)
  const [hasTriggered, setHasTriggered] = useState(false)
  const [allowlisting, setAllowlisting] = useState(false)

  const appId = process.env.NEXT_PUBLIC_WLD_APP_ID ?? ""
  const rpId = process.env.NEXT_PUBLIC_WLD_RP_ID ?? ""
  const action = process.env.NEXT_PUBLIC_WLD_ACTION ?? "verify-human"

  // Read verifiedUsers on both chains
  const { data: verificationResults } = useReadContracts({
    contracts: CHECK_CHAINS.map((c) => ({
      address: c.exchange,
      abi: EXCHANGE_ABI,
      functionName: "verifiedUsers" as const,
      args: [address!] as const,
      chainId: c.chainId,
    })),
    query: { enabled: !!address && isConnected },
  })

  const isVerifiedOnAny = verificationResults?.some(
    (r) => r.status === "success" && r.result === true
  )

  // Auto-trigger verification when connected + not verified
  useEffect(() => {
    if (!isConnected || !address) {
      setHasTriggered(false)
      return
    }
    if (verificationResults === undefined) return // still loading
    if (isVerifiedOnAny) return // already verified
    if (hasTriggered) return // already triggered this session
    if (!appId || !rpId) return // no config

    setHasTriggered(true)
    startVerification()
  }, [isConnected, address, verificationResults, isVerifiedOnAny, hasTriggered, appId, rpId])

  const startVerification = useCallback(async () => {
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        toast.error("Failed to start verification")
        return
      }

      const rpSig = await res.json()

      setRpContext({
        rp_id: rpId,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      })

      setWidgetOpen(true)
    } catch {
      toast.error("Failed to start verification")
    }
  }, [action, rpId])

  const handleVerify = useCallback(async (result: unknown) => {
    const response = await fetch("/api/verify-proof", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rp_id: rpId,
        idkitResponse: result,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.detail ?? data?.error ?? "Verification failed")
    }
  }, [rpId])

  const onSuccess = useCallback(async (result: Record<string, unknown>) => {
    const responses = (result.responses as Array<Record<string, unknown>>) ?? []
    const firstResponse = responses[0]

    let nullifier = ""
    if (firstResponse) {
      if (typeof firstResponse.nullifier === "string") {
        nullifier = firstResponse.nullifier
      } else if (Array.isArray(firstResponse.session_nullifier) && firstResponse.session_nullifier[0]) {
        nullifier = firstResponse.session_nullifier[0]
      }
    }

    if (address && nullifier) {
      setAllowlisting(true)
      toast.info("Allowlisting on-chain...")
      try {
        await fetch("/api/allowlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ walletAddress: address, nullifierHash: nullifier }),
        })
        toast.success("Verified! You can now trade.")
      } catch {
        toast.error("On-chain allowlisting failed")
      } finally {
        setAllowlisting(false)
      }
    } else {
      toast.success("Verified!")
    }
  }, [address])

  if (!rpContext && !allowlisting) return null

  return (
    <>
      <IDKitRequestWidget
        open={widgetOpen}
        onOpenChange={setWidgetOpen}
        app_id={appId as `app_${string}`}
        action={action}
        rp_context={rpContext!}
        preset={deviceLegacy()}
        allow_legacy_proofs
        handleVerify={handleVerify as any}
        onSuccess={onSuccess as any}
      />

      {allowlisting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/95 px-10 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/10 border-t-white" />
            <p className="text-[14px] font-medium text-white">Verifying on-chain...</p>
            <p className="text-[12px] text-white/40">Allowlisting on Base Sepolia & Arbitrum Sepolia</p>
          </div>
        </div>
      )}
    </>
  )
}
