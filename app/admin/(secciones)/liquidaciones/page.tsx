"use client"

import { Clock, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminLiquidacionesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Liquidaciones globales</h2>
        <p className="text-sm text-muted-foreground">
          Facturación y pagos mensuales a proveedores de gift cards
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Liquidación a proveedores</CardTitle>
          </div>
          <CardDescription>
            Control de periodos, referencias de facturas y órdenes de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-base font-semibold">Próximamente</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta sección estará disponible en la fase D6b.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
