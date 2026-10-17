"use client"

import { useEffect, useState } from "react"
import { DollarSign } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import KpiCard from "@/components/panel/kpi-card"
import { MOCK_PROVIDER_KPIS, MOCK_SETTLEMENTS } from "@/lib/mock/data"
import { formatUsd } from "@/lib/domain/format"
import type { SettlementStatus } from "@/lib/domain/types"

const SETTLEMENT_STATUS_MAP: Record<SettlementStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-900" },
  invoiced: { label: "Facturada", className: "border-sky-200 bg-sky-50 text-sky-800" },
  paid: { label: "Pagada", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-")
  if (!year || !month) return period
  const date = new Date(Number(year), Number(month) - 1, 1)
  const s = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function ProveedorLiquidacionPage() {
  const [loading, setLoading] = useState(true)

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
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Filtrar solo liquidaciones del proveedor Fybeca (p-fybeca)
  const settlements = MOCK_SETTLEMENTS.filter((s) => s.providerId === "p-fybeca")

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Liquidaciones</h2>
        <p className="text-sm text-muted-foreground">
          Historial y detalle de pagos periódicos por consumos de tus tarjetas de regalo
        </p>
      </div>

      {/* Dos KpiCards: Pendiente y Pagada */}
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Liquidación pendiente"
          value={formatUsd(MOCK_PROVIDER_KPIS.settlementPendingCents)}
          hint="Consumos del mes en curso por liquidar"
        />
        <KpiCard
          label="Liquidación pagada"
          value={formatUsd(MOCK_PROVIDER_KPIS.settlementPaidCents)}
          hint="Total histórico transferido a tu cuenta"
        />
      </div>

      {/* Tabla de liquidaciones mensuales */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Periodos de liquidación</CardTitle>
          </div>
          <CardDescription>
            Se te paga por cada consumo registrado en Caja, liquidado cada mes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Consumos</TableHead>
                  <TableHead className="text-right">Monto liquidado</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Referencia de factura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((item) => {
                  const statusInfo = SETTLEMENT_STATUS_MAP[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {formatPeriod(item.period)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.consumptions}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {formatUsd(item.amountCents)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {item.invoiceRef ? item.invoiceRef : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
