"use client"

import { useState } from "react"
import { Gift } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { THEMES, formatPoints, pointsFor, type Store } from "@/lib/catalog"
import { usePoints } from "@/lib/points-store"

/** Cara visual de la tarjeta (proporción de tarjeta física). */
export function GiftCardFace({ store, usd, className }: { store: Store; usd: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[1.586] overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-lg",
        THEMES[store.theme],
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent" />
      <div className="flex items-start justify-between">
        <span className="text-lg font-extrabold leading-tight">{store.name}</span>
        <Gift className="h-5 w-5 opacity-80" aria-hidden />
      </div>
      <div className="absolute bottom-4 left-4 h-6 w-9 rounded-md bg-yellow-200/70" aria-hidden />
      <span className="absolute bottom-3 right-4 text-3xl font-extrabold">${usd}</span>
    </div>
  )
}

/** Tarjeta del catálogo: selector de denominación + botón de canje. */
export function GiftCardTile({ store }: { store: Store }) {
  const [usd, setUsd] = useState(store.denoms[0])
  const { addToCart } = usePoints()
  const points = pointsFor(usd)

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border bg-card p-3 transition-all hover:-translate-y-1 hover:shadow-xl">
      <GiftCardFace store={store} usd={usd} className="transition-transform group-hover:scale-[1.02]" />
      <div className="flex flex-1 flex-col gap-3 px-1">
        <div>
          <Badge variant="outline" className="mb-1">{store.category}</Badge>
          <h3 className="font-semibold">{store.name}</h3>
          <p className="text-sm text-muted-foreground">{store.description}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Valor de la tarjeta">
          {store.denoms.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === usd}
              onClick={() => setUsd(d)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                d === usd ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary",
              )}
            >
              ${d}
            </button>
          ))}
        </div>
        <Button
          className="mt-auto w-full"
          onClick={() => {
            addToCart(store.id, usd)
            toast.success(`${store.name} $${usd} añadida al carrito`)
          }}
        >
          Canjear por {formatPoints(points)} puntos
        </Button>
      </div>
    </div>
  )
}
