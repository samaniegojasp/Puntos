"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GiftCardFace } from "@/components/gift-card"
import { findStore, formatPoints } from "@/lib/catalog"
import { usePoints } from "@/lib/points-store"

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order")
  const { orders, balance, ready } = usePoints()

  if (!ready) {
    return (
      <div className="container px-4 py-12 text-center text-muted-foreground">
        Cargando…
      </div>
    )
  }

  const order = orders.find((o) => o.id === orderId)

  if (!order) {
    return (
      <div className="container max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold">Orden no encontrada</h1>
        <p className="text-muted-foreground">
          No encontramos ninguna orden con ese identificador.
        </p>
        <Button asChild>
          <Link href="/shop">Ver gift cards</Link>
        </Button>
      </div>
    )
  }

  const copyCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success("Código copiado"))
      .catch(() => toast.error("No se pudo copiar"))
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
      {/* Encabezado */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">¡Canje exitoso!</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(order.date).toLocaleString("es-EC")}
        </p>
      </div>

      {/* Detalles de la orden */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Puntos usados</span>
            <span className="font-semibold">{formatPoints(order.points)} pts</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo restante</span>
            <span className="font-semibold text-primary">{formatPoints(balance)} pts</span>
          </div>
          {order.recipientEmail && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
              <p className="font-medium text-foreground">
                Enviaremos las gift cards a {order.recipientEmail}
              </p>
              {order.message && (
                <p className="italic text-muted-foreground">
                  &ldquo;{order.message}&rdquo;
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de códigos generados */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Tus códigos de gift card</h2>
        <div className="space-y-3">
          {order.codes.map((item, index) => {
            const store = findStore(item.storeId)
            return (
              <div
                key={`${item.code}-${index}`}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm"
              >
                {store && (
                  <GiftCardFace
                    store={store}
                    usd={item.usd}
                    className="w-28 shrink-0 p-2 text-xs"
                  />
                )}
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3">
                  <code className="rounded border bg-muted px-2.5 py-1 font-mono text-sm sm:text-base font-bold tracking-wider">
                    {item.code}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => copyCode(item.code)}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nota legal y botones finales */}
      <div className="space-y-4 text-center">
        <p className="text-xs text-muted-foreground">
          Códigos de demostración, no válidos en tienda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild>
            <Link href="/shop">Canjear más</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recargar">Recargar Puntos</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container px-4 py-12 text-center text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  )
}
