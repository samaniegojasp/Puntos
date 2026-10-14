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
  MOCK_CLIENTS_ADMIN,
  MOCK_PRODUCTS,
  MOCK_PROVIDERS,
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
import { useAdminSettings } from "@/lib/mock/admin-settings"
import type { Provider } from "@/lib/domain/types"

export default function AdminProveedoresPage() {
  const { settings } = useAdminSettings()
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)

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

  const issues = validatePricing({
    settings,
    providers: simulatedProviders,
    products: MOCK_PRODUCTS,
    standardPacks: MOCK_STANDARD_PACKS,
    publicPacks: MOCK_PUBLIC_PACKS,
    clients: MOCK_CLIENTS_ADMIN,
  })

  const errorIssues = issues.filter((i) => i.severity === "error")
  const warningIssues = issues.filter((i) => i.severity === "warning")
  const hasErrors =
    errorIssues.length > 0 ||
    parsedDiscountPct < 0 ||
    parsedDiscountPct > 1 ||
    parsedDays <= 0

  // Productos de este proveedor para vista previa
  const providerProducts = editingProvider
    ? MOCK_PRODUCTS.filter((prod) => prod.providerId === editingProvider.id)
    : []

  const refCents = referenceCentsPerPoint(MOCK_STANDARD_PACKS)
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
                <Label htmlFor="discountPct">Descuento sobre valor facial (%)</Label>
                <div className="relative">
                  <Input
                    id="discountPct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountPctInput}
                    onChange={(e) => setDiscountPctInput(e.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ejemplo: 17 % significa que Regala paga $8,30 por cada $10 de valor facial.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardValidDays">Caducidad de las tarjetas (días)</Label>
                <Input
                  id="cardValidDays"
                  type="number"
                  min="30"
                  step="1"
                  value={cardValidDaysInput}
                  onChange={(e) => setCardValidDaysInput(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Días de validez para el canjeador desde la emisión.
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
