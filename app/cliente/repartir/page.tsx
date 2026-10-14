"use client"

import { Clock, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClienteRepartirPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Repartir puntos</h2>
        <p className="text-sm text-muted-foreground">
          Entrega de puntos en lote a clientes mediante archivo Excel
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Reparto en lote</CardTitle>
          </div>
          <CardDescription>
            Carga masiva de beneficiarios para descontar de tu bolsa corporativa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-base font-semibold">Próximamente</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta funcionalidad estará disponible en la siguiente fase (D4).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
