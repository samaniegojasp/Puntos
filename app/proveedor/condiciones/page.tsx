"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, Clock, FileText, Mail, Percent, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MOCK_PROVIDER_TERMS } from "@/lib/mock/data"
import { formatDate, formatPct } from "@/lib/domain/format"

export default function ProveedorCondicionesPage() {
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
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Condiciones comerciales</h2>
        <p className="text-sm text-muted-foreground">
          Términos de servicio, comisiones y reglas de caducidad acordadas con Regala
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Términos vigentes del convenio</CardTitle>
          </div>
          <CardDescription>
            Parámetros acordados para la emisión, consumo y liquidación de tus tarjetas de regalo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Descuento sobre valor facial */}
            <div className="rounded-xl border bg-muted/20 p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Percent className="h-3.5 w-3.5 text-primary" /> Descuento sobre valor facial
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {formatPct(MOCK_PROVIDER_TERMS.discountPct)}
              </p>
              <p className="text-xs text-muted-foreground">
                Porcentaje pactado sobre el valor facial de cada tarjeta emitida
              </p>
            </div>

            {/* Caducidad de la tarjeta */}
            <div className="rounded-xl border bg-muted/20 p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-primary" /> Plazo de caducidad
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {MOCK_PROVIDER_TERMS.cardValidDays} días
              </p>
              <p className="text-xs text-muted-foreground">
                Vigencia para que el canjeador utilice su saldo desde la emisión
              </p>
            </div>

            {/* Vigente desde */}
            <div className="rounded-xl border bg-muted/20 p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Vigente desde
              </span>
              <p className="text-2xl font-extrabold text-foreground">
                {formatDate(MOCK_PROVIDER_TERMS.effectiveFrom)}
              </p>
              <p className="text-xs text-muted-foreground">
                Fecha en la que entró en vigor el convenio comercial
              </p>
            </div>
          </div>

          {/* Nota de liquidación */}
          <div className="rounded-xl border bg-muted/30 p-5 space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5 text-primary" /> Nota de liquidación
            </span>
            <p className="text-sm font-medium text-foreground">
              {MOCK_PROVIDER_TERMS.settlementNote}
            </p>
          </div>

          {/* Mensaje de contacto y cambio de condiciones */}
          <div className="flex flex-col gap-3 rounded-lg bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between border border-primary/20">
            <p className="text-sm text-foreground">
              Estas condiciones las acordamos contigo. Para cambiarlas, escríbenos.
            </p>
            <Button variant="outline" asChild size="sm" className="shrink-0">
              <Link href="/contact">
                <Mail className="mr-2 h-4 w-4" /> Contactar a Regala
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
