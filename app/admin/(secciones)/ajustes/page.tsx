"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Check, RefreshCw, RotateCcw, Settings, Sliders } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import EditableNumber from "@/components/panel/editable-number"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MOCK_SETTINGS,
} from "@/lib/mock/data"
import { formatPct, formatPts } from "@/lib/domain/format"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { pointsPrice, productPoints, productPriceCents, referenceCentsPerPoint } from "@/lib/domain/pricing"
import { rescaleForFactor } from "@/lib/domain/points-factor"
import { adminConfigured, verifyAdmin } from "@/lib/admin-auth"
import type { AdminSettings } from "@/lib/domain/types"

export default function AdminAjustesPage() {
  const [loading, setLoading] = useState(true)
  const {
    settings: current,
    setSettings,
    providers,
    products,
    clients,
    setClients,
    publicPacks,
    setPublicPacks,
    standardPacks,
    setStandardPacks,
  } = useAdminSettings()

  // Estado del factor de conversión
  const currentFactor = current.pointsFactor ?? 1
  const [factorInput, setFactorInput] = useState<string>(String(currentFactor))
  const [factorDialogOpen, setFactorDialogOpen] = useState(false)
  const [adminPass, setAdminPass] = useState("")
  const [passError, setPassError] = useState("")
  const [factorBusy, setFactorBusy] = useState(false)

  useEffect(() => {
    setFactorInput(String(current.pointsFactor ?? 1))
  }, [current.pointsFactor])

  const parsedFactor = parseInt(factorInput.trim(), 10)
  const isFactorInteger = String(parsedFactor) === factorInput.trim()
  const isFactorInRange = parsedFactor >= 1 && parsedFactor <= 1000
  const isFactorValid = factorInput.trim() !== "" && isFactorInteger && isFactorInRange
  const factorError = !factorInput.trim()
    ? "Ingresa un número entero."
    : !isFactorInteger
    ? "El factor debe ser un número entero."
    : !isFactorInRange
    ? "El factor debe estar entre 1 y 1.000."
    : null
  const factorHasChanged = isFactorValid && parsedFactor !== currentFactor

  const smallestPublic = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
  const smallestPoints = smallestPublic ? smallestPublic.points : 1000 * currentFactor
  const previewPoints = isFactorValid ? Math.round((smallestPoints * parsedFactor) / currentFactor) : null

  // Estado del formulario de ajustes
  const [exchangeFeePctInput, setExchangeFeePctInput] = useState((current.exchangeFeePct * 100).toString())
  const [exchangeWindowDaysInput, setExchangeWindowDaysInput] = useState(current.exchangeWindowDays.toString())
  const [pendingGrantDaysInput, setPendingGrantDaysInput] = useState(current.pendingGrantDays.toString())
  const [multiple, setMultiple] = useState<number>(current.pointsMultiple)
  const [customMinInput, setCustomMinInput] = useState(String(current.customMinUsd ?? 1))
  const [customMaxInput, setCustomMaxInput] = useState(String(current.customMaxUsd ?? 500))
  const [customPpd, setCustomPpd] = useState<number>(current.customPointsPerUsd ?? 100)
  const [redeemSurchargeInput, setRedeemSurchargeInput] = useState((((current.redeemSurchargePct ?? 0.03) * 100)).toString())
  const [cardDenomMinInput, setCardDenomMinInput] = useState(String(current.cardDenomMinUsd ?? 5))
  const [cardDenomMaxInput, setCardDenomMaxInput] = useState(String(current.cardDenomMaxUsd ?? 500))

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Parseo de campos con normalización de comas y redondeo limpio a fracciones
  const rawExchangeFee = parseFloat(exchangeFeePctInput.replace(",", "."))
  const rawWindowDays = parseInt(exchangeWindowDaysInput, 10)
  const rawGrantDays = parseInt(pendingGrantDaysInput, 10)
  const rawRedeemSurcharge = parseFloat(redeemSurchargeInput.replace(",", "."))
  const rawCustomMin = parseInt(customMinInput, 10)
  const rawCustomMax = parseInt(customMaxInput, 10)

  // Validaciones individuales
  const errors: string[] = []

  if (isNaN(rawExchangeFee) || rawExchangeFee < 0 || rawExchangeFee > 100) {
    errors.push("El recargo por cambio de tarjeta debe ser un porcentaje entre 0 y 100 %.")
  }

  if (isNaN(rawWindowDays) || rawWindowDays < 0) {
    errors.push("El plazo para cambiar tarjetas vencidas debe ser un número entero mayor o igual a 0.")
  }

  if (isNaN(rawCustomMin) || rawCustomMin < 1 || isNaN(rawCustomMax) || rawCustomMax < 1) {
    errors.push("Los montos de la compra a tu medida deben ser dólares enteros de al menos $1.")
  }

  if (isNaN(rawRedeemSurcharge) || rawRedeemSurcharge < 0) {
    errors.push("El recargo al canjear debe ser un porcentaje mayor o igual a 0 %.")
  }

  if (isNaN(rawGrantDays) || rawGrantDays < 1) {
    errors.push("Los días para repartos pendientes deben ser al menos 1.")
  }

  const rawDenomMin = parseInt(cardDenomMinInput, 10)
  const rawDenomMax = parseInt(cardDenomMaxInput, 10)
  const isDenomMinInt = String(rawDenomMin) === cardDenomMinInput.trim()
  const isDenomMaxInt = String(rawDenomMax) === cardDenomMaxInput.trim()
  if (
    !isDenomMinInt ||
    !isDenomMaxInt ||
    rawDenomMin % 5 !== 0 ||
    rawDenomMax % 5 !== 0 ||
    rawDenomMin < 5 ||
    rawDenomMin >= rawDenomMax ||
    rawDenomMax > 500
  ) {
    errors.push("Los valores de las tarjetas deben ser enteros múltiplos de 5 con 5 ≤ mín < máx ≤ 500.")
  }

  // Fracciones redondeadas para evitar números flotantes largos
  const parsedExchangeFeeFraction = !isNaN(rawExchangeFee) ? Math.round(rawExchangeFee * 1000) / 100000 : 0.1
  const parsedWindowDays = !isNaN(rawWindowDays) ? Math.max(0, rawWindowDays) : 30
  const parsedGrantDays = !isNaN(rawGrantDays) ? Math.max(1, rawGrantDays) : 90
  const parsedRedeemSurcharge = !isNaN(rawRedeemSurcharge) ? Math.round(rawRedeemSurcharge * 1000) / 100000 : 0.03

  const candidateSettings: AdminSettings = {
    ...current,
    exchangeFeePct: parsedExchangeFeeFraction,
    exchangeWindowDays: parsedWindowDays,
    pendingGrantDays: parsedGrantDays,
    redeemSurchargePct: parsedRedeemSurcharge,
    pointsMultiple: multiple,
    customMinUsd: !isNaN(rawCustomMin) ? rawCustomMin : 1,
    customMaxUsd: !isNaN(rawCustomMax) ? rawCustomMax : 500,
    customPointsPerUsd: customPpd,
    cardDenomMinUsd: isDenomMinInt && rawDenomMin % 5 === 0 ? rawDenomMin : 5,
    cardDenomMaxUsd: isDenomMaxInt && rawDenomMax % 5 === 0 ? rawDenomMax : 500,
  }

  const f = current.pointsFactor ?? 1

  const smallestPublicPpd = (() => {
    const sp = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
    return sp ? sp.points / (sp.usdCents / 100) : 100 * f
  })()

  const canSave = errors.length === 0

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return

    setSettings(candidateSettings)
    toast.success("Ajustes del sistema guardados con éxito")
  }

  const handleReset = () => {
    const factorVigente = current.pointsFactor ?? 1
    setExchangeFeePctInput((MOCK_SETTINGS.exchangeFeePct * 100).toString())
    setExchangeWindowDaysInput(MOCK_SETTINGS.exchangeWindowDays.toString())
    setPendingGrantDaysInput(MOCK_SETTINGS.pendingGrantDays.toString())
    setRedeemSurchargeInput((((MOCK_SETTINGS.redeemSurchargePct ?? 0.03) * 100)).toString())
    setMultiple(MOCK_SETTINGS.pointsMultiple)
    setCustomMinInput(String(MOCK_SETTINGS.customMinUsd ?? 1))
    setCustomMaxInput(String(MOCK_SETTINGS.customMaxUsd ?? 500))
    setCustomPpd((MOCK_SETTINGS.customPointsPerUsd ?? 100) * factorVigente)
    setCardDenomMinInput(String(MOCK_SETTINGS.cardDenomMinUsd ?? 5))
    setCardDenomMaxInput(String(MOCK_SETTINGS.cardDenomMaxUsd ?? 500))
    setSettings({
      ...MOCK_SETTINGS,
      customPointsPerUsd: (MOCK_SETTINGS.customPointsPerUsd ?? 100) * factorVigente,
      pointsFactor: factorVigente,
      cardDenomMinUsd: MOCK_SETTINGS.cardDenomMinUsd ?? 5,
      cardDenomMaxUsd: MOCK_SETTINGS.cardDenomMaxUsd ?? 500,
    })
    toast.info("Ajustes restablecidos a sus valores originales")
  }

  const handleConfirmFactor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (factorBusy) return
    setFactorBusy(true)
    setPassError("")

    const ok = await verifyAdmin(adminPass)
    if (!ok) {
      await new Promise((r) => setTimeout(r, 1000))
      setPassError("Clave incorrecta.")
      setFactorBusy(false)
      return
    }

    const rescaled = rescaleForFactor(
      {
        settings: current,
        publicPacks,
        standardPacks,
        clients,
      },
      currentFactor,
      parsedFactor,
    )

    setSettings(rescaled.settings)
    setPublicPacks(rescaled.publicPacks)
    setStandardPacks(rescaled.standardPacks)
    setClients(rescaled.clients)

    const newCustomPpd = rescaled.settings.customPointsPerUsd ?? 100 * parsedFactor
    setCustomPpd(newCustomPpd)

    setFactorBusy(false)
    setFactorDialogOpen(false)
    toast.success("Factor de conversión actualizado")
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

      {/* Factor de conversión */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Factor de conversión</CardTitle>
          </div>
          <CardDescription>
            Multiplica la conversión de dólares a puntos en toda la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="factorInput">Factor de conversión (1–1.000)</Label>
            <Input
              id="factorInput"
              type="number"
              min={1}
              max={1000}
              step={1}
              value={factorInput}
              onChange={(e) => setFactorInput(e.target.value)}
            />
            {factorError && <p className="text-xs text-destructive">{factorError}</p>}
          </div>

          <p className="text-sm text-muted-foreground">
            Hoy: ${smallestPublic.usdCents / 100} = {formatPts(smallestPoints)} pts → con factor {isFactorValid ? parsedFactor : "N"}:{" "}
            {previewPoints !== null ? formatPts(previewPoints) : "—"} pts
          </p>

          <p className="text-xs text-muted-foreground">
            En producción, cambiar el factor exige convertir todos los saldos; lo hará el servidor. En este prototipo los saldos de ejemplo no cambian.
          </p>

          <div>
            <Button
              type="button"
              disabled={!adminConfigured || !factorHasChanged || !isFactorValid}
              onClick={() => {
                setAdminPass("")
                setPassError("")
                setFactorDialogOpen(true)
              }}
            >
              {!adminConfigured ? "Configura la clave de administrador en /admin" : "Guardar factor"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={factorDialogOpen} onOpenChange={setFactorDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Clave de administrador</DialogTitle>
            <DialogDescription>
              Introduce la clave de administrador para aplicar el factor {parsedFactor}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmFactor} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminPass">Clave de administrador</Label>
              <Input
                id="adminPass"
                type="password"
                autoComplete="current-password"
                placeholder="Clave de administrador"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                disabled={factorBusy}
                autoFocus
              />
              {passError && <p className="text-xs text-destructive whitespace-pre-wrap">{passError}</p>}
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFactorDialogOpen(false)}
                disabled={factorBusy}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={factorBusy || !adminPass.trim()}>
                {factorBusy ? "Verificando…" : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

              {/* Recargo al canjear */}
              <div className="space-y-2">
                <Label htmlFor="redeemSurcharge">Recargo al canjear (%)</Label>
                <div className="relative">
                  <Input
                    id="redeemSurcharge"
                    type="number"
                    step="0.1"
                    min="0"
                    value={redeemSurchargeInput}
                    onChange={(e) => setRedeemSurchargeInput(e.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se suma al valor facial: con 3 %, una tarjeta de $10 cuesta 1.030 pts del Canjeador. Sugerido: entre 2 y 5 %.
                </p>
              </div>

              {/* Compra a tu medida del Canjeador */}
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold">Compra a tu medida (Clientes y Nosotros)</h4>
                  <p className="text-xs text-muted-foreground">
                    Además de los paquetes, los Clientes y Nosotros pueden comprar el monto en dólares enteros que elijan. Su precio nunca puede ser más barato que el del paquete más pequeño del Canjeador.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customMin">Monto mínimo (USD)</Label>
                    <Input id="customMin" type="number" min="1" step="1" value={customMinInput} onChange={(e) => setCustomMinInput(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customMax">Monto máximo (USD)</Label>
                    <Input id="customMax" type="number" min="1" step="1" value={customMaxInput} onChange={(e) => setCustomMaxInput(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="customPpd">Puntos por cada dólar</Label>
                    <EditableNumber
                      label="Puntos por cada dólar de la compra a tu medida"
                      display={new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(customPpd)}
                      initial={String(customPpd)}
                      suffix="pts/$"
                      decimals
                      onCommit={(v) => setCustomPpd(Math.round(v * 10) / 10)}
                    />
                  </div>
                  <Slider
                    id="customPpd"
                    min={50 * f}
                    max={Math.max(50 * f + 1, Math.floor(smallestPublicPpd))}
                    step={1}
                    value={[Math.min(Math.max(Math.round(customPpd), 50 * f), Math.max(50 * f + 1, Math.floor(smallestPublicPpd)))]}
                    onValueChange={(v) => setCustomPpd(v[0])}
                    aria-label="Puntos por cada dólar de la compra a tu medida"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Mínimo {50 * f} pts/$</span>
                    <span>Máximo {new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(smallestPublicPpd)} pts/$ (el del paquete más pequeño)</span>
                  </div>
                </div>
              </div>

              {/* Valores de las tarjetas del catálogo */}
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold">Valores de las tarjetas del catálogo</h4>
                  <p className="text-xs text-muted-foreground">
                    La barra de cada valor en Catálogo va de 5 en 5 entre estos límites.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cardDenomMin">Valor mínimo (USD)</Label>
                    <Input
                      id="cardDenomMin"
                      type="number"
                      min={5}
                      max={500}
                      step={5}
                      value={cardDenomMinInput}
                      onChange={(e) => setCardDenomMinInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardDenomMax">Valor máximo (USD)</Label>
                    <Input
                      id="cardDenomMax"
                      type="number"
                      min={5}
                      max={500}
                      step={5}
                      value={cardDenomMaxInput}
                      onChange={(e) => setCardDenomMaxInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Múltiplo de puntos de las tarjetas */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label id="multipleLabel">Redondeo de los puntos de las tarjetas</Label>
                  <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-labelledby="multipleLabel">
                    {[10, 50, 100].map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={multiple === m}
                        onClick={() => setMultiple(m)}
                        className={
                          "rounded px-3 py-1 text-xs font-medium transition-colors " +
                          (multiple === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        De {m} en {m}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  El precio en puntos de cada tarjeta se sube al siguiente múltiplo de este valor. Con un múltiplo menor, el precio sigue más de cerca al costo y hay menos saltos en las barras de margen y descuento; con uno mayor, los precios son más fáciles de recordar. Vale para compras nuevas; lo ya pagado no cambia.
                </p>
                <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Así quedarían: </span>
                  {products
                    .filter((p) => p.active)
                    .map((p) => {
                      const pts = productPoints(p, { ...candidateSettings, pointsMultiple: multiple }, referenceCentsPerPoint(publicPacks))
                      return `${p.storeName} $${p.faceCents / 100} → ${new Intl.NumberFormat("es-EC").format(pts)} pts`
                    })
                    .join(" · ")}
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
