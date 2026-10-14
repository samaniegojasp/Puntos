"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CreditCard, DollarSign, FileText, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import KpiCard from "@/components/panel/kpi-card"
import { MOCK_PROVIDER_KPIS } from "@/lib/mock/data"
import { formatUsd } from "@/lib/domain/format"

export default function ProveedorResumenPage() {
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
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Encabezado y acciones principales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Resumen general</h2>
          <p className="text-sm text-muted-foreground">
            Estado de tarjetas emitidas, consumos y liquidaciones pendientes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/proveedor/caja">
              <ShoppingCart className="mr-2 h-4 w-4" /> Ir a Caja
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/proveedor/tarjetas">
              <CreditCard className="mr-2 h-4 w-4" /> Ver tarjetas
            </Link>
          </Button>
        </div>
      </div>

      {/* 8 KpiCards requeridas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tarjetas emitidas"
          value={String(MOCK_PROVIDER_KPIS.issuedCount)}
          hint="Histórico total emitido"
        />
        <KpiCard
          label="Valor facial emitido"
          value={formatUsd(MOCK_PROVIDER_KPIS.issuedFaceCents)}
          hint="Monto total emitido"
        />
        <KpiCard
          label="Tarjetas vivas"
          value={String(MOCK_PROVIDER_KPIS.liveCards)}
          hint="Activas con saldo pendiente"
        />
        <KpiCard
          label="Saldo pendiente en ellas"
          value={formatUsd(MOCK_PROVIDER_KPIS.liveBalanceCents)}
          hint="Saldo aún disponible"
        />
        <KpiCard
          label="Consumido en 30 días"
          value={formatUsd(MOCK_PROVIDER_KPIS.consumedLast30dCents)}
          hint="Último periodo de cobros"
        />
        <KpiCard
          label="Liquidación pendiente"
          value={formatUsd(MOCK_PROVIDER_KPIS.settlementPendingCents)}
          hint="Por liquidar a tu favor"
        />
        <KpiCard
          label="Liquidación pagada"
          value={formatUsd(MOCK_PROVIDER_KPIS.settlementPaidCents)}
          hint="Transferido a tu cuenta"
        />
        <KpiCard
          label="Tarjetas por vencer"
          value={String(MOCK_PROVIDER_KPIS.expiringSoonCount)}
          hint="En los próximos 30 días"
        />
      </div>

      {/* Aviso informativo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">
              Cada consumo que registres en Caja se liquida a tu favor
            </h3>
            <p className="text-sm text-muted-foreground">
              Los consumos hechos en Caja viven solo en esa página y se pierden al navegar o recargar: es lo esperado en el prototipo.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/proveedor/caja">
              Abrir Caja <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Accesos directos a secciones */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Liquidaciones periódicas</CardTitle>
            </div>
            <CardDescription>
              Revisa el detalle de los periodos mensuales facturados y pagados a tu empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tienes una liquidación pendiente de{" "}
              <strong className="text-foreground">{formatUsd(MOCK_PROVIDER_KPIS.settlementPendingCents)}</strong>{" "}
              correspondiente al mes en curso.
            </p>
            <Button variant="outline" asChild size="sm">
              <Link href="/proveedor/liquidacion">
                Ver liquidaciones <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Condiciones comerciales</CardTitle>
            </div>
            <CardDescription>
              Consulta el descuento sobre valor facial y los plazos de vigencia acordados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Consulta las condiciones acordadas con Regala para la aceptación y liquidación de tus tarjetas virtuales.
            </p>
            <Button variant="outline" asChild size="sm">
              <Link href="/proveedor/condiciones">
                Ver condiciones <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
