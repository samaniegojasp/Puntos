"use client"

import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { GiftCardFace } from "@/components/gift-card"
import { formatPoints, packForPoints, usdForPoints } from "@/lib/catalog"
import { useCanBuyCustom, useCardPoints, usePublicOffer } from "@/lib/mock/admin-settings"
import { useCatalog } from "@/lib/catalog-store"
import { usePoints } from "@/lib/points-store"

export default function CartPage() {
  const { cart, cartTotal, balance, available, locked, ready, setQty, clearCart } = usePoints()
  const cardPoints = useCardPoints()
  const { custom, packs } = usePublicOffer()
  const canCustom = useCanBuyCustom()
  const { findStore } = useCatalog()
  // Cliente y Nosotros compran el monto exacto a tu medida; el Canjeador, el paquete fijo que cubre lo que falta.
  const suggested = packForPoints(Math.max(0, cartTotal - available), packs)

  if (!ready) {
    return (
      <div className="container px-4 py-12 text-center text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="container px-4 py-12 text-center">
        <h1 className="mb-4 text-2xl font-semibold">Tu carrito está vacío</h1>
        <p className="mb-8 text-muted-foreground">
          Aún no has añadido gift cards a tu carrito.
        </p>
        <Button asChild>
          <Link href="/shop">Ver gift cards</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <nav className="mb-2 flex items-center text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-primary">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">Carrito</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight">Carrito</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-4 sm:p-6 divide-y">
            {cart.map((item) => {
              const store = findStore(item.storeId)
              if (!store) return null
              const unitPoints = cardPoints(item.usd, item.storeId)
              const itemTotalPoints = unitPoints * item.qty

              return (
                <div
                  key={`${item.storeId}-${item.usd}`}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <GiftCardFace store={store} usd={item.usd} compact className="w-28 shrink-0" />
                    <div>
                      <h3 className="font-semibold">
                        {store.name} · ${item.usd}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatPoints(unitPoints)} pts c/u
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={item.qty <= 1}
                        onClick={() => setQty(item.storeId, item.usd, item.qty - 1)}
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="h-3 w-3" />
                        <span className="sr-only">Disminuir cantidad</span>
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty(item.storeId, item.usd, item.qty + 1)}
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="sr-only">Aumentar cantidad</span>
                      </Button>
                    </div>

                    <div className="min-w-[80px] text-right font-semibold whitespace-nowrap">
                      {formatPoints(itemTotalPoints)} pts
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setQty(item.storeId, item.usd, 0)}
                      aria-label="Eliminar ítem"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar ítem</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <Button variant="outline" asChild>
              <Link href="/shop">Seguir explorando</Link>
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={clearCart}
            >
              Vaciar carrito
            </Button>
          </div>
        </div>

        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Resumen</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tu saldo</span>
                  <span className="font-medium">{formatPoints(balance)} pts</span>
                </div>
                {locked > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatPoints(locked)} pts bloqueados hasta tu primera recarga
                  </p>
                )}
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPoints(cartTotal)} pts</span>
                </div>
              </div>

              {cartTotal > available ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                    Te faltan {formatPoints(cartTotal - available)} pts
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/recargar?faltan=${cartTotal - available}`}>
                      {canCustom ? (
                        <>Comprar los {formatPoints(cartTotal - available)} pts que faltan (${usdForPoints(cartTotal - available, custom)})</>
                      ) : (
                        <>
                          Recargar el paquete de ${suggested.usd} ({formatPoints(suggested.points)} pts)
                          {suggested.points < cartTotal - available && " (no alcanza; puedes repetir)"}
                        </>
                      )}
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/recargar">Ver todos los paquetes</Link>
                  </Button>
                </div>
              ) : (
                <Button className="w-full" asChild>
                  <Link href="/checkout">
                    Canjear {formatPoints(cartTotal)} puntos
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
