"use client"

import { useEffect, useState } from "react"
import { AlertCircle, AlertTriangle, Check, Edit2, Info, Store } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MOCK_PUBLIC_PACKS,
  MOCK_STANDARD_PACKS,
} from "@/lib/mock/data"
import { formatDate, formatPct, formatPts, formatUsd } from "@/lib/domain/format"
import {
  marginAtPack,
  pointsPrice,
  productCostCents,
  productPriceCents,
  referenceCentsPerPoint,
  validatePricing,
} from "@/lib/domain/pricing"
import EditableNumber from "@/components/panel/editable-number"
import { Slider } from "@/components/ui/slider"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import type { Provider } from "@/lib/domain/types"

export default function AdminProveedoresPage() {
  const { settings, providers, setProviders, products, clients } = useAdminSettings()
  const [loading, setLoading] = useState(true)

  // Diálogo de edición
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  // Campos de edición
  const [discountPctInput, setDiscountPctInput] = useState("17")
  const [cardValidDaysInput, setCardValidDaysInput] = useState("180")
  const [active, setActive] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleOpenEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setDiscountPctInput((provider.discountPct * 100).toString())
    setCardValidDaysInput(provider.cardValidDays.toString())
    setActive(provider.active)
    setDialogOpen(true)
  }

  // Descuento y días parseados
  const parsedDiscountPct = (parseFloat(discountPctInput.replace(",", ".")) || 0) / 100
  const parsedDays = parseInt(cardValidDaysInput, 10) || 180

  const candidateProvider: Provider = editingProvider
    ? {
        ...editingProvider,
        discountPct: parsedDiscountPct,
        cardValidDays: parsedDays,
        active,
      }
    : {
        id: "p-temp",
        name: "Temporal",
        discountPct: parsedDiscountPct,
        cardValidDays: parsedDays,
        active,
      }

  // Simulación para validatePricing
  const simulatedProviders = editingProvider
    ? providers.map((p) => (p.id === editingProvider.id ? candidateProvider : p))
    : [...providers, candidateProvider]

  // Los productos de este proveedor se validan como activos aunque hoy estén ocultos
  const validationProducts = products.map((p) =>
    editingProvider && p.providerId === editingProvider.id ? { ...p, active: true } : p,
  )

  const issues = validatePricing({
    settings,
    providers: simulatedProviders,
    products: validationProducts,
    standardPacks: MOCK_STANDARD_PACKS,
    publicPacks: MOCK_PUBLIC_PACKS,
    clients: clients,
  })

  // Rango del descuento válido para este proveedor, calculado con las mismas reglas (sin fórmulas propias).
  // Abajo: el precio no puede superar el valor facial (regla 4) y el paquete debe alcanzar (regla 1).
  // Arriba: el margen mínimo por tramo (regla 3).
  const DISCOUNT_UNIT = 1000 // décimas de punto porcentual (0,1 %)
  const DISCOUNT_CAP_UNITS = 500 // tope de la demo: ningún descuento por encima de 50 %
  const discountBounds = (() => {
    if (!editingProvider) return null
    const tags = products.filter((p) => p.providerId === editingProvider.id).map(
      (p) => `${p.storeName} $${(p.faceCents / 100).toFixed(2)}`,
    )
    if (!tags.length) return null
    const mine = (msg: string) => tags.some((t) => msg.includes(t))
    const at = (units: number) =>
      validatePricing({
        settings,
        providers: providers.map((p) =>
          p.id === editingProvider.id ? { ...p, discountPct: units / DISCOUNT_UNIT } : p,
        ),
        products: validationProducts,
        standardPacks: MOCK_STANDARD_PACKS,
        publicPacks: MOCK_PUBLIC_PACKS,
        clients: clients,
      })
    const countLow = (u: number) => at(u).filter((i) => (i.rule === 1 || i.rule === 4) && mine(i.message)).length
    const countHigh = (u: number) => at(u).filter((i) => i.rule === 3 && mine(i.message)).length
    const baseLow = countLow(DISCOUNT_CAP_UNITS)
    const baseHigh = countHigh(0)
    let a = 0
    let b = DISCOUNT_CAP_UNITS
    while (a < b) {
      const m = Math.floor((a + b) / 2)
      if (countLow(m) <= baseLow) b = m
      else a = m + 1
    }
    const min = a
    a = 0
    b = DISCOUNT_CAP_UNITS
    while (a < b) {
      const m = Math.ceil((a + b) / 2)
      if (countHigh(m) <= baseHigh) a = m
      else b = m - 1
    }
    const max = a
    return min <= max ? { min, max } : null
  })()

  const errorIssues = issues.filter((i) => i.severity === "error")
  const warningIssues = issues.filter((i) => i.severity === "warning")
  const hasErrors =
    errorIssues.length > 0 ||
    parsedDiscountPct < 0 ||
    parsedDiscountPct > 1 ||
    parsedDays <= 0

  // Productos de este proveedor para vista previa
  const providerProducts = editingProvider
    ? products.filter((prod) => prod.providerId === editingProvider.id)
    : []

  const refCents = referenceCentsPerPoint(MOCK_PUBLIC_PACKS)
  const std10Pack =
    MOCK_STANDARD_PACKS.find((p) => p.usdCents === 1000) ?? MOCK_STANDARD_PACKS[0]

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProvider || hasErrors) return

    setProviders((prev) =>
      prev.map((p) => (p.id === editingProvider.id ? candidateProvider : p))
    )
    toast.success(`Condiciones de ${editingProvider.name} actualizadas`)
    setDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Proveedores y convenios</h2>
        <p className="text-sm text-muted-foreground">
          Porcentajes de descuento acordados, vigencia de tarjetas y reglas de liquidación
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Convenios con marcas asociadas</CardTitle>
          </div>
          <CardDescription>
            {providers.length} proveedores registrados en la red Regala
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Store className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold">No hay proveedores registrados</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Descuento acordado</TableHead>
                    <TableHead className="text-center">Caducidad</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-foreground">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-primary">
                        {formatPct(p.discountPct)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {p.cardValidDays} días
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            p.active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }
                        >
                          {p.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <Edit2 className="mr-1 h-3.5 w-3.5" /> Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Editar Proveedor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar proveedor: {editingProvider?.name}</DialogTitle>
            <DialogDescription>
              Ajusta el porcentaje de descuento y las condiciones de vigencia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="discountPct">Descuento sobre valor facial</Label>
                  <EditableNumber
                    label="Descuento sobre valor facial"
                    display={new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(parsedDiscountPct * 100)}
                    initial={String(Math.round(parsedDiscountPct * 10000) / 100)}
                    suffix="%"
                    decimals
                    allowZero
                    onCommit={(v) => setDiscountPctInput(String(Math.round(v * 100) / 100))}
                  />
                </div>
                {discountBounds ? (
                  <>
                    <Slider
                      id="discountPct"
                      min={discountBounds.min}
                      max={discountBounds.max}
                      step={1}
                      value={[
                        Math.min(
                          Math.max(Math.round(parsedDiscountPct * DISCOUNT_UNIT), discountBounds.min),
                          discountBounds.max,
                        ),
                      ]}
                      onValueChange={(v) => setDiscountPctInput(String(v[0] / 10))}
                      aria-label="Descuento sobre valor facial"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Mínimo {new Intl.NumberFormat("es-EC").format(discountBounds.min / 10)} %</span>
                      <span>Máximo {new Intl.NumberFormat("es-EC").format(discountBounds.max / 10)} %</span>
                    </div>
                    {(parsedDiscountPct * DISCOUNT_UNIT < discountBounds.min - 1e-9 ||
                      parsedDiscountPct * DISCOUNT_UNIT > discountBounds.max + 1e-9) && (
                      <p className="text-[11px] text-destructive">
                        El valor actual está fuera del rango permitido. Mueve la barra para corregirlo.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-destructive">
                    Con los productos y paquetes actuales no existe un descuento que cumpla las reglas para este proveedor.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Ejemplo: 17 % significa que Regala paga $8,30 por cada $10 de valor facial. Los límites salen de las reglas: abajo, que el precio no supere el valor facial; arriba, el margen mínimo.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="cardValidDays">Caducidad por defecto de las tarjetas</Label>
                  <EditableNumber
                    label="Caducidad de las tarjetas"
                    display={String(parsedDays > 0 ? parsedDays : "—")}
                    initial={String(parsedDays > 0 ? parsedDays : 180)}
                    suffix="días"
                    onCommit={(v) => setCardValidDaysInput(String(v))}
                  />
                </div>
                <Slider
                  id="cardValidDays"
                  min={30}
                  max={730}
                  step={1}
                  value={[Math.min(Math.max(parsedDays > 0 ? parsedDays : 180, 30), 730)]}
                  onValueChange={(v) => setCardValidDaysInput(String(v[0]))}
                  aria-label="Caducidad de las tarjetas en días"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Mínimo 30 días</span>
                  <span>Máximo 730 días</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Días de validez desde la emisión. Cada tarjeta puede tener la suya propia en Precios.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="activeProvSwitch" className="text-sm font-medium">Proveedor activo</Label>
                <p className="text-xs text-muted-foreground">Permite emitir nuevas tarjetas de esta marca</p>
              </div>
              <Switch
                id="activeProvSwitch"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1 border">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" /> Nota de vigencia
              </p>
              <p>
                Las condiciones nuevas aplican solo a tarjetas emitidas después.
              </p>
            </div>

            {/* Vista previa de productos con el nuevo descuento */}
            {providerProducts.length > 0 && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
                <h4 className="text-sm font-semibold text-foreground">
                  Vista previa de impacto en productos de {editingProvider?.name}
                </h4>
                <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarjeta</TableHead>
                        <TableHead className="text-right">Costo nuevo</TableHead>
                        <TableHead className="text-right">Precio USD</TableHead>
                        <TableHead className="text-right">Puntos</TableHead>
                        <TableHead className="text-right">Margen tramo $10</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerProducts.map((prod) => {
                        const cost = productCostCents(prod, candidateProvider)
                        const price = productPriceCents(prod, candidateProvider)
                        const pts = pointsPrice(price, refCents, settings.pointsMultiple)
                        const margin = marginAtPack(pts, std10Pack, cost)
                        const isMarginLow = margin.marginPct < settings.minMarginPct

                        return (
                          <TableRow key={prod.id}>
                            <TableCell className="font-medium text-xs">
                              {prod.storeName} {formatUsd(prod.faceCents)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatUsd(cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                              {formatUsd(price)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-primary font-bold">
                              {formatPts(pts)} pts
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-xs font-semibold ${
                                isMarginLow ? "text-destructive font-bold" : "text-emerald-700"
                              }`}
                            >
                              {formatPct(margin.marginPct)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Avisos de validatePricing */}
            {errorIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Problemas que bloquean el guardado (Reglas del sistema)</AlertTitle>
                <AlertDescription className="space-y-1 mt-2">
                  {errorIssues.map((issue, i) => (
                    <p key={i} className="text-xs">
                      • {issue.message}
                    </p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {warningIssues.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="font-semibold text-amber-900">Avisos del sistema</AlertTitle>
                <AlertDescription className="space-y-1 mt-2 text-xs text-amber-800">
                  {warningIssues.map((issue, i) => (
                    <p key={i}>• {issue.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={hasErrors}>
                <Check className="mr-2 h-4 w-4" /> Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
