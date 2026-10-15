"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Calculator, Check, Percent } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { MOCK_CLIENT, MOCK_CLIENT_PACKS } from "@/lib/mock/data"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { formatPts, formatUsd } from "@/lib/domain/format"
import { bonusFromSale } from "@/lib/domain/pricing"

export default function ClienteBonoPage() {
  const { clients } = useAdminSettings()
  const client = clients.find((c) => c.id === MOCK_CLIENT.id) ?? { ...MOCK_CLIENT, customPacks: MOCK_CLIENT_PACKS }
  const [loading, setLoading] = useState(true)

  // Campo "Mi % de bono" precargado con client.bonusPct * 100 (0.85)
  const [bonusInput, setBonusInput] = useState<string>((Math.round(client.bonusPct * 10000) / 100).toString())
  // Campo "Monto de la venta (USD)" precargado con 20000
  const [saleInput, setSaleInput] = useState<string>("20000")

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
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  // Validación de Mi % de bono (número 0–100, paso 0,01)
  const normalizedBonus = bonusInput.trim().replace(",", ".")
  const parsedBonus = parseFloat(normalizedBonus)
  const isBonusValid = !isNaN(parsedBonus) && parsedBonus >= 0 && parsedBonus <= 100 && normalizedBonus !== ""

  // Validación y cálculo del monto de venta
  const normalizedSale = saleInput.trim().replace(",", ".")
  const parsedSale = parseFloat(normalizedSale)
  const isSaleValid = !isNaN(parsedSale) && parsedSale >= 0 && normalizedSale !== ""

  // Conversión cuidando el redondeo a centavos
  const saleCents = isSaleValid ? Math.round(parsedSale * 100) : 0
  const bonusPctFraction = isBonusValid ? parsedBonus / 100 : client.bonusPct

  // Cálculo de bono con la función de dominio
  const calculation = bonusFromSale(saleCents, bonusPctFraction, client.usdPerPoint)

  const handleSaveBonus = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isBonusValid) return
    toast.success("Bono actualizado correctamente")
  }

  return (
    <div className="space-y-8">
      {/* Título y descripción */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Mi bono</h2>
        <p className="text-sm text-muted-foreground">
          Configura tu porcentaje de fidelización y simula los puntos que generará cada venta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuración de % de bono */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Configurar mi bono</CardTitle>
            </div>
            <CardDescription>
              Este porcentaje define cuánto dinero de cada venta destinas a premiar con puntos a tus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSaveBonus} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bonusPct">Mi % de bono</Label>
                <div className="relative">
                  <Input
                    id="bonusPct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={bonusInput}
                    onChange={(e) => setBonusInput(e.target.value)}
                    className={!isBonusValid ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="0.85"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                {!isBonusValid ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Ingresa un porcentaje válido entre 0 y 100 % (ej. 0,85).
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: 0,85 % significa $0,85 de bono por cada $100 de venta.
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Este porcentaje es tuyo y lo puedes cambiar cuando quieras. No cambia el precio de tus puntos: ese lo fija Regala.
              </p>

              <Button type="submit" disabled={!isBonusValid}>
                <Check className="mr-2 h-4 w-4" /> Guardar porcentaje
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Calculadora */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Calculadora de bono</CardTitle>
            </div>
            <CardDescription>
              Comprueba cuántos puntos recibirá un cliente según el monto de su compra y tu bono actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="saleAmount">Monto de la venta (USD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="saleAmount"
                  type="number"
                  min="0"
                  step="any"
                  value={saleInput}
                  onChange={(e) => setSaleInput(e.target.value)}
                  className="pl-7"
                  placeholder="20000"
                />
              </div>
              {!isSaleValid && (
                <p className="text-xs text-destructive">
                  Ingresa un monto de venta válido mayor o igual a 0.
                </p>
              )}
            </div>

            {/* Muestra SOLO Bono en dólares y Puntos a repartir */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Bono en dólares
                </span>
                <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {isBonusValid && isSaleValid ? formatUsd(calculation.bonusCents) : "—"}
                </div>
              </div>

              <div className="rounded-lg border bg-primary/5 p-4">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  Puntos a repartir
                </span>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-primary">
                  {isBonusValid && isSaleValid ? formatPts(calculation.points) : "—"}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Usa el resultado como <strong>Valor de comisión ($)</strong> en tu planilla de reparto.{" "}
              <Link href="/cliente/repartir" className="text-primary underline hover:text-primary/80 font-medium">
                Ir a Repartir
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
