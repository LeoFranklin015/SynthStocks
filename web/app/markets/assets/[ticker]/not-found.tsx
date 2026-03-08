import Link from "next/link"
import { PortfolioNavbar } from "@/components/PortfolioNavbar"

export default function AssetNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Asset not found
        </h1>
        <p className="text-muted-foreground mb-6">
          The asset you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/markets"
          className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors"
        >
          Back to Markets
        </Link>
      </main>
    </div>
  )
}
