"use client"

import { useEffect, useState } from "react"
import { AlertCircle, AlertTriangle, Check, RefreshCw, RotateCcw, Settings, Sliders } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MOCK_CLIENTS_ADMIN,
  MOCK_PRODUCTS,
  MOCK_PROVIDERS,
  MOCK_PUBLIC_PACKS,
  MOCK_SETTINGS,
  MOCK_STANDARD_PACKS,
} from "@/lib/mock/data"
import { formatPct } from "@/lib/domain/format"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { validatePricing } from "@/lib/domain/pricing"
import type { AdminSettings } from "@/lib/domain/types"

export default function AdminAjustesPage() {
  const [loading, setLoading] = useState(true)
  const { settings: current, setSettings } = useAdminSettings()

  // Estado del formulario de ajustes
  const [minMarginPctInput, setMinMarginPctInput] = useState((current.minMarginPct * 100).toString())
  const [exchangeFeePctInput, setExchangeFeePctInput] = useState((current.exchangeFeePct * 100).toString())
  const [exchangeWindowDaysInput, setExchangeWindowDaysInput] = useState(current.exchangeWindowDays.toString())
  const [pendingGrantDaysInput, setPendingGrantDaysInput] = useState(current.pendingGrantDays.toString())
  const fmtPrice = (n: number | undefined) => (n === undefined ? "" : n.toFixed(5))
  const [priceMinInput, setPriceMinInput] = useState(fmtPrice(current.pricePerPointMin))
  const [priceMaxInput, setPriceMaxInput] = useState(fmtPrice(current.pricePerPointMax))

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Parseo de campos con normalización de comas y redondeo limpio a fracciones
  const rawMinMargin = parseFloat(minMarginPctInput.replace(",", "."))
  const rawExchangeFee = parseFloat(exchangeFeePctInput.replace(",", "."))
  const rawWindowDays = parseInt(exchangeWindowDaysInput, 10)
  const rawGrantDays = parseInt(pendingGrantDaysInput, 10)

  // Validaciones individuales
  const errors: string[] = []

  if (isNaN(rawMinMargin) || rawMinMargin < 0 || rawMinMargin > 100) {
    errors.push("El margen mínimo debe ser un porcentaje entre 0 y 100 %.")
  }

  if (isNaN(rawExchangeFee) || rawExchangeFee < 0 || rawExchangeFee > 100) {
    errors.push("El recargo por cambio de tarjeta debe ser un porcentaje entre 0 y 100 %.")
  }

  if (isNaN(rawWindowDays) || rawWindowDays < 0) {
    errors.push("El plazo para cambiar tarjetas vencidas debe ser un número entero mayor o igual a 0.")
  }

  if (isNaN(rawGrantDays) || rawGrantDays < 1) {
    errors.push("Los días para repartos pendientes deben ser al menos 1.")
  }

  // Límites opcionales del precio por punto (vacío = sin límite adicional)
  const parsePrice = (raw: string): number | undefined | "invalid" => {
    const t = raw.trim().replace(",", ".")
    if (!t) return undefined
    const n = Number(t)
    return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n * 100000) / 100000 : "invalid"
  }
  const priceMin = parsePrice(priceMinInput)
  const priceMax = parsePrice(priceMaxInput)
  if (priceMin === "invalid" || priceMax === "invalid") {
    errors.push("Los límites del precio por punto deben ser números mayores que 0 (USD, hasta 5 decimales) o quedar vacíos.")
  } else if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    errors.push("El precio mínimo por punto no puede ser mayor que el máximo.")
  }

  // Fracciones redondeadas para evitar números flotantes largos
  const parsedMinMarginFraction = !isNaN(rawMinMargin) ? Math.round(rawMinMargin * 1000) / 100000 : 0.05
  const parsedExchangeFeeFraction = !isNaN(rawExchangeFee) ? Math.round(rawExchangeFee * 1000) / 100000 : 0.1
  const parsedWindowDays = !isNaN(rawWindowDays) ? Math.max(0, rawWindowDays) : 30
  const parsedGrantDays = !isNaN(rawGrantDays) ? Math.max(1, rawGrantDays) : 90

  const candidateSettings: AdminSettings = {
    minMarginPct: parsedMinMarginFraction,
    exchangeFeePct: parsedExchangeFeeFraction,
    exchangeWindowDays: parsedWindowDays,
    pendingGrantDays: parsedGrantDays,
    pointsMultiple: MOCK_SETTINGS.pointsMultiple,
    pricePerPointMin: priceMin === "invalid" ? undefined : priceMin,
    pricePerPointMax: priceMax === "invalid" ? undefined : priceMax,
  }

  // Validación con validatePricing usando los ajustes candidatos
  const pricingIssues = validatePricing({
    settings: candidateSettings,
    providers: MOCK_PROVIDERS,
    products: MOCK_PRODUCTS,
    standardPacks: MOCK_STANDARD_PACKS,
    publicPacks: MOCK_PUBLIC_PACKS,
    clients: MOCK_CLIENTS_ADMIN,
  })

  const pricingErrors = pricingIssues.filter((i) => i.severity === "error")
  const pricingWarnings = pricingIssues.filter((i) => i.severity === "warning")

  const canSave = errors.length === 0 && pricingErrors.length === 0

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return

    setSettings(candidateSettings)
    toast.success("Ajustes del sistema guardados con éxito")
  }

  const handleReset = () => {
    setMinMarginPctInput((MOCK_SETTINGS.minMarginPct * 100).toString())
    setExchangeFeePctInput((MOCK_SETTINGS.exchangeFeePct * 100).toString())
    setExchangeWindowDaysInput(MOCK_SETTINGS.exchangeWindowDays.toString())
    setPendingGrantDaysInput(MOCK_SETTINGS.pendingGrantDays.toString())
    setPriceMinInput(fmtPrice(MOCK_SETTINGS.pricePerPointMin))
    setPriceMaxInput(fmtPrice(MOCK_SETTINGS.pricePerPointMax))
    setSettings(MOCK_SETTINGS)
    toast.info("Ajustes restablecidos a sus valores originales")
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[480px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Ajustes del sistema</h2>
        <p className="text-sm text-muted-foreground">
          Parámetros globales de margen comercial, recargos y vigencias de la plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Parámetros operativos y comerciales</CardTitle>
          </div>
          <CardDescription>
            Estas variables rigen el motor de fijación de precios, liquidaciones y caducidades de Regala.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* minMarginPct */}
              <div className="space-y-2">
                <Label htmlFor="minMargin">Margen mínimo (%)</Label>
                <div className="relative">
                  <Input
                    id="minMargin"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={minMarginPctInput}
                    onChange={(e) => setMinMarginPctInput(e.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ningún precio puede dejar menos margen que este.
                </p>
              </div>

              {/* exchangeFeePct */}
              <div className="space-y-2">
                <Label htmlFor="exchangeFee">Recargo por cambio de tarjeta vencida (%)</Label>
                <div className="relative">
                  <Input
                    id="exchangeFee"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={exchangeFeePctInput}
                    onChange={(e) => setExchangeFeePctInput(e.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se cobra al cambiar una tarjeta caducada por puntos.
                </p>
              </div>

              {/* exchangeWindowDays */}
              <div className="space-y-2">
                <Label htmlFor="exchangeWindow">Plazo para cambiar tarjeta vencida (días)</Label>
                <Input
                  id="exchangeWindow"
                  type="number"
                  step="1"
                  min="0"
                  value={exchangeWindowDaysInput}
                  onChange={(e) => setExchangeWindowDaysInput(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Días después de caducar en que aún se puede cambiar.
                </p>
              </div>

              {/* pendingGrantDays */}
              <div className="space-y-2">
                <Label htmlFor="pendingGrant">Vigencia de repartos no reclamados (días)</Label>
                <Input
                  id="pendingGrant"
                  type="number"
                  step="1"
                  min="1"
                  value={pendingGrantDaysInput}
                  onChange={(e) => setPendingGrantDaysInput(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Días para que un reparto no reclamado vuelva a la bolsa del cliente (por defecto 90).
                </p>
              </div>

              {/* Límites del precio por punto */}
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold">Rango del precio por punto de los clientes (USD, opcional)</h4>
                  <p className="text-xs text-muted-foreground">
                    Estos límites estrechan la barra de precio por punto en Clientes. Solo pueden achicar el rango que ya imponen las reglas del sistema (margen mínimo y &ldquo;el Canjeador paga más&rdquo;); nunca ampliarlo. Déjalos vacíos para usar solo las reglas.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="priceMin">Precio mínimo por punto</Label>
                    <Input
                      id="priceMin"
                      type="text"
                      inputMode="decimal"
                      placeholder="Ej. 0.00780"
                      value={priceMinInput}
                      onChange={(e) => setPriceMinInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceMax">Precio máximo por punto</Label>
                    <Input
                      id="priceMax"
                      type="text"
                      inputMode="decimal"
                      placeholder="Ej. 0.00900"
                      value={priceMaxInput}
                      onChange={(e) => setPriceMaxInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* pointsMultiple (solo lectura) */}
              <div className="space-y-2 sm:col-span-2 max-w-sm">
                <Label htmlFor="pointsMultiple">Múltiplo de puntos (constante del sistema)</Label>
                <Input
                  id="pointsMultiple"
                  value={MOCK_SETTINGS.pointsMultiple}
                  disabled
                  readOnly
                  className="bg-muted font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Todas las tarjetas de regalo se redondean obligatoriamente a este múltiplo.
                </p>
              </div>
            </div>

            {/* Errores de validación de formulario */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Valores inválidos en el formulario</AlertTitle>
                <AlertDescription className="space-y-1 mt-2 text-xs">
                  {errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Errores de pricing rules */}
            {pricingErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Estos ajustes rompen las reglas de precios del sistema</AlertTitle>
                <AlertDescription className="space-y-1 mt-2 text-xs">
                  {pricingErrors.map((issue, i) => (
                    <p key={i}>• {issue.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {pricingWarnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="font-semibold text-amber-900">Avisos del sistema de precios</AlertTitle>
                <AlertDescription className="space-y-1 mt-2 text-xs text-amber-800">
                  {pricingWarnings.map((issue, i) => (
                    <p key={i}>• {issue.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restablecer
              </Button>
              <Button type="submit" disabled={!canSave}>
                <Check className="mr-2 h-4 w-4" /> Guardar ajustes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
