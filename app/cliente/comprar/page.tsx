"use client"

import { useEffect, useState } from "react"
import { CreditCard, Gem, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPts, formatUsd } from "@/lib/domain/format"
import { useAdminSettings, useCurrentClient } from "@/lib/mock/admin-settings"
import { PurchaseDialog } from "@/components/panel/purchase-dialog"
import type { PointsPack } from "@/lib/domain/types"

export default function ClienteComprarPage() {
  const [loading, setLoading] = useState(true)
  const { standardPacks } = useAdminSettings()
  const { client, bag, addToBag } = useCurrentClient()
  const [selectedPack, setSelectedPack] = useState<PointsPack | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const packs = client.packMode === "custom" ? client.customPacks : standardPacks
  const maxPoints = Math.max(...packs.map((p) => p.points))

  return (
    <div className="space-y-8">
      {/* Título y descripción */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Comprar puntos</h2>
        <p className="text-sm text-muted-foreground">
          Recarga tu bolsa corporativa para seguir repartiendo puntos a tus clientes
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu bolsa actual: <strong className="text-foreground">{formatPts(bag)} pts</strong>
        </p>
      </div>

      {/* Mensaje de seguridad */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Pagarás en la página segura de la pasarela. Regala no ve los datos de tu tarjeta.
          </p>
        </CardContent>
      </Card>

      {/* Lista de paquetes de puntos */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => {
          const badgeText = pack.badge ?? (pack.points === maxPoints ? "Mejor valor" : undefined)

          return (
            <Card key={pack.id} className="relative flex flex-col justify-between overflow-hidden">
              {badgeText && (
                <div className="absolute right-4 top-4">
                  <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary font-medium">
                    {badgeText}
                  </Badge>
                </div>
              )}
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                  <Gem className="h-5 w-5" />
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    {formatPts(pack.points)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">puntos</span>
                  </CardTitle>
                </div>
                <CardDescription>Para recargar tu bolsa corporativa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-extrabold text-foreground">
                  {formatUsd(pack.usdCents)}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedPack(pack)
                    setDialogOpen(true)
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Pagar con la pasarela
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {selectedPack && (
        <PurchaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          usd={selectedPack.usdCents / 100}
          points={selectedPack.points}
          onApproved={() => {
            addToBag(selectedPack.points)
            toast.success(`+${formatPts(selectedPack.points)} puntos en tu bolsa`)
          }}
        />
      )}
    </div>
  )
}
