"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Calculator, Gem, History, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import KpiCard from "@/components/panel/kpi-card"
import { MOCK_CLIENT, MOCK_GRANTED } from "@/lib/mock/data"
import { formatPct, formatPts } from "@/lib/domain/format"

export default function ClienteResumenPage() {
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  const totalGranted = MOCK_GRANTED.reduce((sum, g) => sum + g.points, 0)
  const totalUsed = MOCK_GRANTED.reduce((sum, g) => sum + g.pointsUsed, 0)
  const totalUnused = totalGranted - totalUsed

  return (
    <div className="space-y-8">
      {/* Encabezado y acciones principales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Resumen de tu cuenta</h2>
          <p className="text-sm text-muted-foreground">
            {MOCK_CLIENT.name} · Estado de tu bolsa y entregas de puntos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/cliente/comprar">
              <Gem className="mr-2 h-4 w-4" /> Comprar puntos
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/cliente/repartir">
              <Send className="mr-2 h-4 w-4" /> Repartir puntos
            </Link>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI requeridas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Puntos en tu bolsa"
          value={formatPts(MOCK_CLIENT.bagPoints)}
          hint="Disponibles para repartir"
        />
        <KpiCard
          label="Puntos repartidos"
          value={formatPts(totalGranted)}
          hint={`Total histórico (${MOCK_GRANTED.length} entregas)`}
        />
        <KpiCard
          label="Puntos usados"
          value={formatPts(totalUsed)}
          hint="Canjeados por tus clientes"
        />
        <KpiCard
          label="Repartidos sin usar"
          value={formatPts(totalUnused)}
          hint="Saldo disponible en canjeadores"
        />
        <KpiCard
          label="Tu bono"
          value={formatPct(MOCK_CLIENT.bonusPct)}
          hint="Porcentaje actual sobre ventas"
        />
      </div>

      {/* Accesos rápidos a las funciones de cliente */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mi bono y calculadora</CardTitle>
            </div>
            <CardDescription>
              Configura tu porcentaje de fidelización por ventas y simula los puntos a entregar a tus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu porcentaje de bono actual es de{" "}
              <strong className="text-foreground">{formatPct(MOCK_CLIENT.bonusPct)}</strong>. Puedes modificarlo cuando
              quieras según tu estrategia comercial.
            </p>
            <Button variant="outline" asChild size="sm">
              <Link href="/cliente/bono">
                Ir a Mi bono <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Historial de entregas</CardTitle>
            </div>
            <CardDescription>
              Consulta el detalle de puntos repartidos a documentos específicos y descarga reportes en CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tienes registradas{" "}
              <strong className="text-foreground">{MOCK_GRANTED.length} entregas</strong> con un total de{" "}
              <strong className="text-foreground">{formatPts(totalGranted)} puntos</strong> repartidos.
            </p>
            <Button variant="outline" asChild size="sm">
              <Link href="/cliente/repartido">
                Ver lo repartido <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
