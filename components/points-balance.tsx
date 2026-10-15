"use client"

import Link from "next/link"
import { Gem, Plus } from "lucide-react"
import { usePoints } from "@/lib/points-store"
import { formatPoints } from "@/lib/catalog"

export default function PointsBalance() {
  const { balance, ready } = usePoints()
  return (
    <Link
      href="/recargar"
      title="Saldo demo de la tienda: se guarda solo en este navegador"
      aria-label={ready ? `Saldo demo de la tienda: ${formatPoints(balance)} puntos. Recargar` : "Recargar puntos"}
      className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-1 text-sm font-semibold tabular-nums transition-colors hover:bg-primary/20"
    >
      <Gem className="h-4 w-4 text-primary" aria-hidden />
      {ready ? <span key={balance} className="animate-in zoom-in-95">{formatPoints(balance)}</span> : <span className="h-4 w-10 animate-pulse rounded bg-muted" />}
      <span className="hidden text-xs text-muted-foreground sm:inline">pts</span>
      <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
        <Plus className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}
