import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStockLogoUrl(ticker: string) {
  return `https://img.logokit.com/ticker/${ticker}?token=pk_frfbe2dd55bc04b3d4d1bc`
}
