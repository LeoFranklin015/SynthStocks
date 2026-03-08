"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const links = [
  { name: "Markets", href: "/markets" },
  { name: "Trade", href: "/trade" },
  { name: "Portfolio", href: "/portfolio" },
]

export function PortfolioNavbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-[15px] font-semibold text-white tracking-tight"
            >
              SynthStocks
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                    pathname?.startsWith(link.href)
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/"
            className="text-[13px] text-white/50 hover:text-white/80 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </nav>
  )
}
