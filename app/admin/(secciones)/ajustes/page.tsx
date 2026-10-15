"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, Check, RefreshCw, RotateCcw, Settings, Sliders } from "lucide-react"
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
  MOCK_CLIENTS_ADMIN,
  MOCK_PRODUCTS,
  MOCK_PROVIDERS,
  MOCK_PUBLIC_PACKS,
  MOCK_SETTINGS,
} from "@/lib/mock/data"
import { formatPct, formatPts } from "@/lib/domain/format"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { pointsPrice, productPriceCents, referenceCentsPerPoint, validatePricing } from "@/lib/domain/pricing"
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
  const [minMarginPctInput, setMinMarginPctInput] = useState((current.minMarginPct * 100).toString())
  const [exchangeFeePctInput, setExchangeFeePctInput] = useState((current.exchangeFeePct * 100).toString())
  const [exchangeWindowDaysInput, setExchangeWindowDaysInput] = useState(current.exchangeWindowDays.toString())
  const [pendingGrantDaysInput, setPendingGrantDaysInput] = useState(current.pendingGrantDays.toString())
  const [multiple, setMultiple] = useState<number>(current.pointsMultiple)
  const [customMinInput, setCustomMinInput] = useState(String(current.customMinUsd ?? 1))
  const [customMaxInput, setCustomMaxInput] = useState(String(current.customMaxUsd ?? 500))
  const [customPpd, setCustomPpd] = useState<number>(current.customPointsPerUsd ?? 100)
  const [benefitInput, setBenefitInput] = useState((((current.clientBenefitPct ?? 0.01) * 100)).toString())
  // Los límites se guardan siempre como USD por punto; aquí se pueden ver y editar en cualquiera de las dos unidades.
  type LimitUnit = "ppd" | "price"
  const fmtPrice = (n: number | undefined) => (n === undefined ? "" : n.toFixed(5))
  const fmtPpd = (n: number | undefined) => (n === undefined ? "" : String(Math.round((1 / n) * 100) / 100))
  const [limitUnit, setLimitUnit] = useState<LimitUnit>("ppd")
  // lo = límite inferior de la cantidad mostrada; hi = límite superior (en puntos por dólar, el inferior es el precio máximo)
  const [limitLoInput, setLimitLoInput] = useState(fmtPpd(current.pricePerPointMax))
  const [limitHiInput, setLimitHiInput] = useState(fmtPpd(current.pricePerPointMin))
  // Último texto escrito por la persona y su unidad: al volver a esa unidad se restaura tal cual (sin redondeos acumulados)
  const typedRef = useRef<{ unit: LimitUnit; lo: string; hi: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Parseo de campos con normalización de comas y redondeo limpio a fracciones
  const rawMinMargin = parseFloat(minMarginPctInput.replace(",", "."))
  const rawExchangeFee = parseFloat(exchangeFeePctInput.replace(",", "."))
  const rawWindowDays = parseInt(exchangeWindowDaysInput, 10)
  const rawGrantDays = parseInt(pendingGrantDaysInput, 10)
  const rawBenefit = parseFloat(benefitInput.replace(",", "."))
  const rawCustomMin = parseInt(customMinInput, 10)
  const rawCustomMax = parseInt(customMaxInput, 10)

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

  if (isNaN(rawCustomMin) || rawCustomMin < 1 || isNaN(rawCustomMax) || rawCustomMax < 1) {
    errors.push("Los montos de la compra a tu medida deben ser dólares enteros de al menos $1.")
  }

  if (isNaN(rawBenefit) || rawBenefit < 0 || rawBenefit > 50) {
    errors.push("El beneficio mínimo del Cliente debe ser un porcentaje entre 0 y 50 %.")
  }

  if (isNaN(rawGrantDays) || rawGrantDays < 1) {
    errors.push("Los días para repartos pendientes deben ser al menos 1.")
  }

  // Límites opcionales del precio por punto (vacío = sin límite adicional)
  const parseQty = (raw: string): number | undefined | "invalid" => {
    const t = raw.trim().replace(",", ".")
    if (!t) return undefined
    const n = Number(t)
    const max = limitUnit === "price" ? 100 : 100000
    return Number.isFinite(n) && n > 0 && n < max ? n : "invalid"
  }
  const loQty = parseQty(limitLoInput)
  const hiQty = parseQty(limitHiInput)
  const round5 = (n: number) => Math.round(n * 100000) / 100000
  // Precio por punto equivalente (USD). En puntos por dólar el límite inferior es el precio máximo.
  const toPrice = (q: number | undefined | "invalid"): number | undefined =>
    typeof q === "number" ? round5(limitUnit === "price" ? q : 1 / q) : undefined
  const priceMin = limitUnit === "price" ? toPrice(loQty) : toPrice(hiQty)
  const priceMax = limitUnit === "price" ? toPrice(hiQty) : toPrice(loQty)
  const unitLabel = limitUnit === "price" ? "precio por punto" : "puntos por dólar"
  if (loQty === "invalid" || hiQty === "invalid") {
    errors.push(
      limitUnit === "price"
        ? "Los límites del precio por punto deben ser números mayores que 0 (USD, hasta 5 decimales) o quedar vacíos."
        : "Los límites de puntos por dólar deben ser números mayores que 0 o quedar vacíos.",
    )
  } else if (typeof loQty === "number" && typeof hiQty === "number" && loQty > hiQty) {
    errors.push(`El mínimo de ${unitLabel} no puede ser mayor que el máximo.`)
  }
  const fmtEq = (n: number) => new Intl.NumberFormat("es-EC", { maximumFractionDigits: limitUnit === "price" ? 1 : 5 }).format(n)

  // Cambia de unidad convirtiendo lo que ya escribiste (el límite inferior y el superior se intercambian)
  const switchUnit = (next: LimitUnit) => {
    if (next === limitUnit) return
    const conv = (raw: string) => {
      const q = parseQty(raw)
      if (typeof q !== "number") return raw.trim() ? raw : ""
      return next === "price" ? fmtPrice(round5(1 / q)) : String(Math.round((1 / q) * 100) / 100)
    }
    const typed = typedRef.current
    const restore = typed !== null && typed.unit === next
    const newLo = restore ? typed.lo : conv(typed ? typed.hi : limitHiInput)
    const newHi = restore ? typed.hi : conv(typed ? typed.lo : limitLoInput)
    setLimitUnit(next)
    setLimitLoInput(newLo)
    setLimitHiInput(newHi)
  }

  // Fracciones redondeadas para evitar números flotantes largos
  const parsedMinMarginFraction = !isNaN(rawMinMargin) ? Math.round(rawMinMargin * 1000) / 100000 : 0.05
  const parsedExchangeFeeFraction = !isNaN(rawExchangeFee) ? Math.round(rawExchangeFee * 1000) / 100000 : 0.1
  const parsedWindowDays = !isNaN(rawWindowDays) ? Math.max(0, rawWindowDays) : 30
  const parsedGrantDays = !isNaN(rawGrantDays) ? Math.max(1, rawGrantDays) : 90

  const candidateSettings: AdminSettings = {
    ...current,
    minMarginPct: parsedMinMarginFraction,
    exchangeFeePct: parsedExchangeFeeFraction,
    exchangeWindowDays: parsedWindowDays,
    pendingGrantDays: parsedGrantDays,
    pointsMultiple: multiple,
    customMinUsd: !isNaN(rawCustomMin) ? rawCustomMin : 1,
    customMaxUsd: !isNaN(rawCustomMax) ? rawCustomMax : 500,
    customPointsPerUsd: customPpd,
    clientBenefitPct: !isNaN(rawBenefit) ? Math.round(rawBenefit * 1000) / 100000 : 0.01,
    pricePerPointMin: priceMin,
    pricePerPointMax: priceMax,
  }

  // Validación con validatePricing usando los ajustes candidatos
  const pricingIssues = validatePricing({
    settings: candidateSettings,
    providers,
    products,
    standardPacks,
    publicPacks,
    clients,
  })

  const f = current.pointsFactor ?? 1

  const smallestPublicPpd = (() => {
    const sp = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
    return sp ? sp.points / (sp.usdCents / 100) : 100 * f
  })()

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
    const factorVigente = current.pointsFactor ?? 1
    setMinMarginPctInput((MOCK_SETTINGS.minMarginPct * 100).toString())
    setExchangeFeePctInput((MOCK_SETTINGS.exchangeFeePct * 100).toString())
    setExchangeWindowDaysInput(MOCK_SETTINGS.exchangeWindowDays.toString())
    setPendingGrantDaysInput(MOCK_SETTINGS.pendingGrantDays.toString())
    setBenefitInput(((MOCK_SETTINGS.clientBenefitPct ?? 0.01) * 100).toString())
    setMultiple(MOCK_SETTINGS.pointsMultiple)
    setCustomMinInput(String(MOCK_SETTINGS.customMinUsd ?? 1))
    setCustomMaxInput(String(MOCK_SETTINGS.customMaxUsd ?? 500))
    setCustomPpd((MOCK_SETTINGS.customPointsPerUsd ?? 100) * factorVigente)
    setLimitUnit("ppd")
    setLimitLoInput(fmtPpd(MOCK_SETTINGS.pricePerPointMax))
    setLimitHiInput(fmtPpd(MOCK_SETTINGS.pricePerPointMin))
    setSettings({ ...MOCK_SETTINGS, customPointsPerUsd: (MOCK_SETTINGS.customPointsPerUsd ?? 100) * factorVigente, pointsFactor: factorVigente })
    typedRef.current = null
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
        providers,
        products,
      },
      currentFactor,
      parsedFactor,
    )

    const issues = validatePricing(rescaled)
    const errs = issues.filter((i) => i.severity === "error")
    if (errs.length > 0) {
      setPassError(errs.map((i) => i.message).join("\n"))
      setFactorBusy(false)
      return
    }

    setSettings(rescaled.settings)
    setPublicPacks(rescaled.publicPacks)
    setStandardPacks(rescaled.standardPacks)
    setClients(rescaled.clients)

    const newCustomPpd = rescaled.settings.customPointsPerUsd ?? 100 * parsedFactor
    setCustomPpd(newCustomPpd)
    if (limitUnit === "price") {
      setLimitLoInput(fmtPrice(rescaled.settings.pricePerPointMin))
      setLimitHiInput(fmtPrice(rescaled.settings.pricePerPointMax))
    } else {
      setLimitLoInput(fmtPpd(rescaled.settings.pricePerPointMax))
      setLimitHiInput(fmtPpd(rescaled.settings.pricePerPointMin))
    }
    typedRef.current = null

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
            Multiplica la conversión de dólares a puntos en toda la plataforma manteniendo las reglas de precios.
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
            Hoy: $10 = {formatPts(smallestPoints)} pts → con factor {isFactorValid ? parsedFactor : "N"}:{" "}
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

              {/* Beneficio mínimo del Cliente */}
              <div className="space-y-2">
                <Label htmlFor="clientBenefit">Beneficio mínimo del Cliente (%)</Label>
                <div className="relative">
                  <Input
                    id="clientBenefit"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada tramo de un Cliente debe dar al menos este % más de puntos por dólar que el Canjeador. Así quien recibe un bono ve que le rinde más (con 1 %, una tarjeta que cuesta 1.000 pts equivale a unos 990 pts del Cliente).
                </p>
              </div>

              {/* Límites del precio por punto */}
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-xl">
                    <h4 className="text-sm font-semibold">Rango del precio por punto de los clientes (opcional)</h4>
                    <p className="text-xs text-muted-foreground">
                      Estos límites estrechan la barra de Clientes. Solo pueden achicar el rango que ya imponen las reglas del sistema (margen mínimo y &ldquo;el Canjeador paga más&rdquo;); nunca ampliarlo. Déjalos vacíos para usar solo las reglas.
                    </p>
                  </div>
                  <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="Unidad de los límites">
                    {([
                      ["ppd", "Puntos por dólar"],
                      ["price", "Precio por punto"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={limitUnit === value}
                        onClick={() => switchUnit(value)}
                        className={
                          "rounded px-3 py-1 text-xs font-medium transition-colors " +
                          (limitUnit === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="limitLo">
                      {limitUnit === "price" ? "Precio mínimo por punto (USD)" : "Mínimo de puntos por dólar"}
                    </Label>
                    <Input
                      id="limitLo"
                      type="text"
                      inputMode="decimal"
                      placeholder={limitUnit === "price" ? "Ej. 0.00780" : "Ej. 111"}
                      value={limitLoInput}
                      onChange={(e) => {
                        setLimitLoInput(e.target.value)
                        typedRef.current = { unit: limitUnit, lo: e.target.value, hi: limitHiInput }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {typeof loQty === "number"
                        ? limitUnit === "price"
                          ? `Equivale a ${fmtEq(1 / loQty)} puntos por dólar como máximo.`
                          : `Equivale a un precio máximo de $${(1 / loQty).toFixed(5)} por punto.`
                        : "Sin límite."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limitHi">
                      {limitUnit === "price" ? "Precio máximo por punto (USD)" : "Máximo de puntos por dólar"}
                    </Label>
                    <Input
                      id="limitHi"
                      type="text"
                      inputMode="decimal"
                      placeholder={limitUnit === "price" ? "Ej. 0.00900" : "Ej. 128"}
                      value={limitHiInput}
                      onChange={(e) => {
                        setLimitHiInput(e.target.value)
                        typedRef.current = { unit: limitUnit, lo: limitLoInput, hi: e.target.value }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {typeof hiQty === "number"
                        ? limitUnit === "price"
                          ? `Equivale a ${fmtEq(1 / hiQty)} puntos por dólar como mínimo.`
                          : `Equivale a un precio mínimo de $${(1 / hiQty).toFixed(5)} por punto.`
                        : "Sin límite."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compra a tu medida del Canjeador */}
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold">Compra a tu medida del Canjeador</h4>
                  <p className="text-xs text-muted-foreground">
                    Además de los paquetes, el Canjeador puede comprar el monto en dólares enteros que elija (por ejemplo, para completar lo que le falta). Su precio nunca puede ser más barato que el del paquete más pequeño del Canjeador.
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
                      const prov = providers.find((x) => x.id === p.providerId)
                      const pts = prov
                        ? pointsPrice(productPriceCents(p, prov), referenceCentsPerPoint(publicPacks), multiple)
                        : 0
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
