"use client"

import { Clock, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminAjustesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Ajustes del sistema</h2>
        <p className="text-sm text-muted-foreground">
          Parámetros globales de margen, recargos y vigencia de tarjetas
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configuración de Regala</CardTitle>
          </div>
          <CardDescription>
            Reglas de negocio y constantes del motor de puntos
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
