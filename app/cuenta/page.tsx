"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CreditCard, Gem, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import KpiCard from "@/components/panel/kpi-card"
import StatusBadge from "@/components/panel/status-badge"
import { MOCK_CARDS, MOCK_LOTS, MOCK_NOW } from "@/lib/mock/data"
import { formatDate, formatPts, formatUsd } from "@/lib/domain/format"

export default function CuentaResumenPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  // 1. Cálculos de KPIs
  const totalPoints = MOCK_LOTS.reduce((sum, l) => sum + l.pointsRemaining, 0)
  const activeCards = MOCK_CARDS.filter((c) => c.status === "active")
  const totalActiveBalanceCents = activeCards.reduce((sum, c) => sum + c.balanceCents, 0)

  // Próxima caducidad de tarjetas activas
  const activeSortedByExpiry = [...activeCards].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  )

  const nextExpiringCard = activeSortedByExpiry[0]
  let nextExpiryText = "—"
  let nextExpiryHint: string | undefined

  if (nextExpiringCard) {
    const diffMs = new Date(nextExpiringCard.expiresAt).getTime() - MOCK_NOW.getTime()
    const diffDays = Math.ceil(diffMs / 86_400_000)
    if (diffDays > 0) {
      nextExpiryText = `en ${diffDays} días`
    } else if (diffDays === 0) {
      nextExpiryText = "hoy"
    } else {
      nextExpiryText = "caducada"
    }
    nextExpiryHint = nextExpiringCard.storeName
  }

  // 2. Tarjetas activas que caducan en <= 30 días
  const expiringSoon = activeCards.filter((c) => {
    const diffMs = new Date(c.expiresAt).getTime() - MOCK_NOW.getTime()
    const diffDays = Math.ceil(diffMs / 86_400_000)
    return diffDays > 0 && diffDays <= 30
  })

  return (
    <div className="space-y-8">
      {/* Botones de acción rápida */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Resumen general</h2>
          <p className="text-sm text-muted-foreground">Estado actual de tus puntos y tarjetas disponibles</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/recargar">
              <Gem className="mr-2 h-4 w-4" /> Comprar puntos
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/shop">
              <ShoppingBag className="mr-2 h-4 w-4" /> Ver gift cards
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 KpiCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Puntos totales"
          value={formatPts(totalPoints)}
          hint="En 4 lotes acumulados"
        />
        <KpiCard
          label="Tarjetas activas"
          value={String(activeCards.length)}
          hint="Disponibles para compras"
        />
        <KpiCard
          label="Saldo en tarjetas activas"
          value={formatUsd(totalActiveBalanceCents)}
          hint="En tiendas asociadas"
        />
        <KpiCard
          label="Próxima caducidad"
          value={nextExpiryText}
          hint={nextExpiryHint}
        />
      </div>

      {/* Bloque: Por caducar pronto (≤ 30 días) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Por caducar pronto</CardTitle>
          </div>
          <CardDescription>
            Tarjetas activas que vencen en los próximos 30 días. Recuerda usarlas antes de su fecha límite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiringSoon.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No tienes tarjetas por caducar pronto</p>
              <p className="text-xs text-muted-foreground">
                Ninguna de tus tarjetas activas vence en los próximos 30 días.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {expiringSoon.map((card) => {
                const diffMs = new Date(card.expiresAt).getTime() - MOCK_NOW.getTime()
                const diffDays = Math.ceil(diffMs / 86_400_000)
                const pct = Math.round((card.balanceCents / card.faceCents) * 100)

                return (
                  <div
                    key={card.id}
                    className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{card.storeName}</span>
                        <StatusBadge status={card.status} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Saldo:{" "}
                        <span className="font-semibold text-foreground">{formatUsd(card.balanceCents)}</span> de{" "}
                        {formatUsd(card.faceCents)}
                      </div>
                      <div className="w-48 pt-1">
                        <Progress value={pct} className="h-2" />
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                        Caduca en {diffDays} {diffDays === 1 ? "día" : "días"} ({formatDate(card.expiresAt)})
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/cuenta/tarjetas">
                          Ver tarjeta <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
