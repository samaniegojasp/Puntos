"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight, Clock, Gem, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MOCK_LEDGER, MOCK_LOTS } from "@/lib/mock/data"
import { formatDate, formatPts } from "@/lib/domain/format"
import type { LotOrigin } from "@/lib/domain/types"

function getOriginLabel(origin: LotOrigin, clientName?: string): string {
  switch (origin) {
    case "grant_client":
      return clientName || "Puntos de empresa"
    case "purchase_self":
      return "Comprados por mí"
    case "exchange":
      return "Cambio de tarjeta caducada"
    case "adjustment":
      return "Ajuste de sistema"
  }
}

export default function CuentaPuntosPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Ordenados del más antiguo al más nuevo por fecha de creación
  const sortedLots = [...MOCK_LOTS].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const totalPoints = sortedLots.reduce((sum, l) => sum + l.pointsRemaining, 0)
  const firstActiveLotId = sortedLots.find((l) => l.pointsRemaining > 0)?.id

  return (
    <div className="space-y-8">
      {/* Total grande */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Saldo disponible total</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {formatPts(totalPoints)}
              </span>
              <span className="text-xl font-medium text-primary">pts</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tus puntos se gastan del lote más antiguo al más nuevo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="lg">
              <Link href="/recargar">
                <Gem className="mr-2 h-4 w-4" /> Comprar puntos
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/shop">Canjear gift cards</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Lotes de Puntos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Mis lotes de puntos</CardTitle>
              <CardDescription>
                Detalle por origen y antigüedad. Se gasta primero el lote más antiguo.
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Orden: más antiguo a más nuevo
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {sortedLots.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Gem className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No tienes lotes de puntos activos</p>
              <p className="text-xs text-muted-foreground">
                Adquiere un paquete para comenzar a canjear.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/recargar">Comprar puntos</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Puntos iniciales</TableHead>
                    <TableHead className="text-right">Puntos restantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLots.map((lot) => {
                    const isFirstActive = lot.id === firstActiveLotId
                    const pct = lot.pointsInitial > 0
                      ? Math.round((lot.pointsRemaining / lot.pointsInitial) * 100)
                      : 0

                    return (
                      <TableRow key={lot.id}>
                        <TableCell className="align-middle">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {getOriginLabel(lot.origin, lot.originClientName)}
                              </span>
                              {isFirstActive && (
                                <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                                  Se usa primero
                                </Badge>
                              )}
                            </div>
                            {lot.note && (
                              <p className="text-xs text-muted-foreground">{lot.note}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(lot.createdAt)}
                        </TableCell>
                        <TableCell className="align-middle text-right text-sm tabular-nums text-muted-foreground">
                          {formatPts(lot.pointsInitial)} pts
                        </TableCell>
                        <TableCell className="align-middle text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold tabular-nums text-foreground">
                              {formatPts(lot.pointsRemaining)} pts
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 w-20" />
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla Historial con MOCK_LEDGER */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Historial de movimientos</CardTitle>
          </div>
          <CardDescription>
            Registro de entradas y salidas de puntos en tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {MOCK_LEDGER.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay movimientos registrados en tu historial.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Movimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_LEDGER.map((entry) => {
                    const isPositive = entry.delta > 0

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isPositive ? (
                              <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-600" />
                            )}
                            <span className="font-medium text-foreground">{entry.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isPositive ? (
                            <span className="font-semibold text-emerald-600 tabular-nums">
                              +{formatPts(entry.delta)} pts
                            </span>
                          ) : (
                            <span className="font-semibold text-rose-600 tabular-nums">
                              −{formatPts(Math.abs(entry.delta))} pts
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
