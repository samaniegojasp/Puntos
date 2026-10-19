"use client"

import { useEffect, useState } from "react"
import { Check, Edit2, Info, Store } from "lucide-react"
import { toast } from "sonner"

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
import { formatPct, formatPts, formatUsd } from "@/lib/domain/format"
import {
  bestClientCentsPerPoint,
  cardMargin,
  productClientPriceCents,
  productCostCents,
  productPoints,
  productPriceCents,
  productTotalCostCents,
  referenceCentsPerPoint,
} from "@/lib/domain/pricing"
import EditableNumber from "@/components/panel/editable-number"
import { Slider } from "@/components/ui/slider"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import type { Provider } from "@/lib/domain/types"

export default function AdminProveedoresPage() {
  const { settings, providers, setProviders, products, publicPacks, clients } = useAdminSettings()
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

  const hasErrors =
    parsedDiscountPct < 0 ||
    parsedDiscountPct > 1 ||
    parsedDays <= 0

  // Productos de este proveedor para vista previa
  const providerProducts = editingProvider
    ? products.filter((prod) => prod.providerId === editingProvider.id)
    : []

  const refCents = referenceCentsPerPoint(publicPacks)
  const bestClient = bestClientCentsPerPoint({ publicPacks, clients })

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
                <Slider
                  id="discountPct"
                  min={0}
                  max={50}
                  step={0.5}
                  value={[Math.min(Math.max(parsedDiscountPct * 100, 0), 50)]}
                  onValueChange={(v) => setDiscountPctInput(String(v[0]))}
                  aria-label="Descuento sobre valor facial"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Mínimo 0 %</span>
                  <span>Máximo 50 %</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ejemplo: 17 % significa que Regala paga $8,30 por cada $10 de valor facial.
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
                        <TableHead className="text-right">Margen Cliente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerProducts.map((prod) => {
                        const cost = productCostCents(prod, candidateProvider)
                        const totalCost = productTotalCostCents(prod, candidateProvider)
                        const price = productPriceCents(prod, settings)
                        const pts = productPoints(prod, settings, refCents)
                        const margin = cardMargin(productClientPriceCents(prod, pts, bestClient.centsPerPoint), totalCost)
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
                            <TableCell className="text-right font-mono text-xs font-semibold text-muted-foreground">
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
