"use client"

import { useEffect, useState } from "react"
import {
  Edit2,
  Package,
  Tag,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPct, formatPts, formatUsd, formatUsdPerPoint } from "@/lib/domain/format"
import {
  bestClientCentsPerPoint,
  cardMargin,
  centsPerPoint,
  productClientPriceCents,
  productCostCents,
  productPoints,
  productPriceCents,
  productTotalCostCents,
  referenceCentsPerPoint,
} from "@/lib/domain/pricing"
import EditableNumber from "@/components/panel/editable-number"
import PacksEditor from "@/components/panel/packs-editor"
import { Slider } from "@/components/ui/slider"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import type { PointsPack, Product, Provider } from "@/lib/domain/types"

export default function AdminPreciosPage() {
  const [loading, setLoading] = useState(true)

  // Estado local para productos y paquetes
  const { settings, providers, products, setProducts, clients, publicPacks, setPublicPacks, standardPacks, setStandardPacks } = useAdminSettings()

  // Selector de tabla de paquetes
  const [selectedPackTable, setSelectedPackTable] = useState<string>("standard")
  const [packsDialogOpen, setPacksDialogOpen] = useState(false)
  const [standardDialogOpen, setStandardDialogOpen] = useState(false)

  // Modal para editar producto
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [costOverrideInput, setCostOverrideInput] = useState("")
  // Caducidad propia de la tarjeta (días); vacío = usa la del Proveedor
  const [cardDaysInput, setCardDaysInput] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Referencia común para cálculos de puntos
  const refCents = referenceCentsPerPoint(publicPacks)
  const bestClient = bestClientCentsPerPoint({ standardPacks, clients })
  const clientRefCents = bestClient.centsPerPoint
  const providerOf = (id: string): Provider =>
    providers.find((x) => x.id === id) ?? {
      id,
      name: "—",
      discountPct: 0,
      cardValidDays: 180,
      active: true,
    }


  // Modal de edición de producto
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod)
    setCostOverrideInput(
      prod.costCentsOverride != null ? (prod.costCentsOverride / 100).toString() : ""
    )
    setCardDaysInput(prod.cardValidDays != null ? String(prod.cardValidDays) : "")
    setDialogOpen(true)
  }

  const parsedCostOverride = costOverrideInput.trim()
    ? Math.round((parseFloat(costOverrideInput.replace(",", ".")) || 0) * 100)
    : undefined

  const parsedCardDays = cardDaysInput.trim() ? parseInt(cardDaysInput, 10) || undefined : undefined
  const providerDays = editingProduct ? providerOf(editingProduct.providerId).cardValidDays : 180
  const candidateProduct: Product = editingProduct
    ? {
        ...editingProduct,
        costCentsOverride: parsedCostOverride,
        cardValidDays: parsedCardDays,
        // Se valida como si estuviera activo: un producto oculto hoy podría activarse mañana
        active: true,
      }
    : products[0]

  const simulatedProducts = editingProduct
    ? products.map((p) => (p.id === editingProduct.id ? candidateProduct : p))
    : products

  // Vista previa de lo que producen los cambios (y lo que hay guardado hoy)
  const preview = editingProduct
    ? (() => {
        const provider = providerOf(editingProduct.providerId)
        const calc = (prod: Product) => {
          const cost = productTotalCostCents(prod, provider)
          const priceGeneral = productPriceCents(prod, settings)
          const pts = productPoints(prod, settings, refCents)
          const marginGeneral = cardMargin(priceGeneral, cost)
          const priceClient = productClientPriceCents(prod, pts, clientRefCents)
          const marginClient = cardMargin(priceClient, cost)
          return {
            cost,
            priceGeneral,
            pts,
            marginGeneral,
            priceClient,
            marginClient,
          }
        }
        return { now: calc(editingProduct), next: calc(candidateProduct) }
      })()
    : null

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setProducts(simulatedProducts.map((p) => (p.id === editingProduct.id ? { ...p, active: editingProduct.active } : p)))
    toast.success(`Parámetros de ${editingProduct.storeName} actualizados`)
    setDialogOpen(false)
  }

  // Obtener lista de paquetes según el selector
  let activeDisplayPacks: PointsPack[] = standardPacks
  let activeTableTitle = "Paquetes estándar (clientes por defecto)"

  if (selectedPackTable === "public") {
    activeDisplayPacks = publicPacks
    activeTableTitle = "Paquetes públicos (canjeadores)"
  } else if (selectedPackTable.startsWith("client-")) {
    const clientId = selectedPackTable.replace("client-", "")
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      activeDisplayPacks = client.customPacks
      activeTableTitle = `Paquetes de ${client.name}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Encabezado y acciones de prueba */}
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Precios y fórmulas</h2>
          <p className="text-sm text-muted-foreground">
            Costos, precios en dólares, puntos y márgenes
          </p>
        </div>
      </div>

      {/* 1. Tabla de Productos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tarjetas virtuales y márgenes</CardTitle>
          </div>
          <CardDescription>
            Detalle de costo proveedor, transporte, margen comercial, precio de venta y puntos de canje
          </CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            Precio de Cliente automático: con el mejor precio por punto de un Cliente activo ({bestClient.label},{" "}
            {new Intl.NumberFormat("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(100 / bestClient.centsPerPoint)} pts/$).
            Se ve solo en administración.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Facial</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Transp.</TableHead>
                  <TableHead className="text-right">Canjeador General</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">Margen General</TableHead>
                  <TableHead className="text-right">Canjeador de Cliente</TableHead>
                  <TableHead className="text-right">Margen Cliente</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((prod) => {
                  const provider = providerOf(prod.providerId)
                  const cost = productCostCents(prod, provider)
                  const totalCost = productTotalCostCents(prod, provider)
                  const priceGen = productPriceCents(prod, settings)
                  const pts = productPoints(prod, settings, refCents)
                  const mGen = cardMargin(priceGen, totalCost)
                  const priceCli = productClientPriceCents(prod, pts, clientRefCents)
                  const mCli = cardMargin(priceCli, totalCost)

                  return (
                    <TableRow key={prod.id}>
                      <TableCell className="font-semibold text-foreground">
                        {prod.storeName}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          Caduca en {prod.cardValidDays ?? provider.cardValidDays} días
                          {prod.cardValidDays == null ? " (proveedor)" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {provider.name || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatUsd(prod.faceCents)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatUsd(cost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatUsd(prod.shippingCents)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center justify-end gap-1">
                            {prod.priceGeneralCents != null && (
                              <span className="font-bold text-primary" title="Precio fijado a mano">·</span>
                            )}
                            <EditableNumber
                              label={`Precio General de ${prod.storeName} $${prod.faceCents / 100}`}
                              display={new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(priceGen / 100)}
                              initial={(priceGen / 100).toFixed(2)}
                              suffix="USD"
                              decimals
                              onCommit={(val) => {
                                const valCents = Math.round(val * 100)
                                setProducts((prev) =>
                                  prev.map((p) => (p.id === prod.id ? { ...p, priceGeneralCents: valCents } : p))
                                )
                                toast.success(`Precio General de ${prod.storeName} actualizado`)
                              }}
                            />
                          </div>
                          {prod.priceGeneralCents != null ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setProducts((prev) =>
                                  prev.map((p) => (p.id === prod.id ? { ...p, priceGeneralCents: undefined } : p))
                                )
                                toast.success(`Precio General de ${prod.storeName} restablecido a automático`)
                              }}
                            >
                              Restablecer
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">automático</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-primary">
                        {formatPts(pts)} pts
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="block font-semibold">{formatUsd(mGen.marginCents)}</span>
                        <span className="block text-muted-foreground">{formatPct(mGen.marginPct)}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center justify-end gap-1">
                            {prod.priceClientCents != null && (
                              <span className="font-bold text-primary" title="Precio fijado a mano">·</span>
                            )}
                            <EditableNumber
                              label={`Precio de Cliente de ${prod.storeName} $${prod.faceCents / 100}`}
                              display={new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(priceCli / 100)}
                              initial={(priceCli / 100).toFixed(2)}
                              suffix="USD"
                              decimals
                              onCommit={(val) => {
                                const valCents = Math.round(val * 100)
                                setProducts((prev) =>
                                  prev.map((p) => (p.id === prod.id ? { ...p, priceClientCents: valCents } : p))
                                )
                                toast.success(`Precio de Cliente de ${prod.storeName} actualizado`)
                              }}
                            />
                          </div>
                          {prod.priceClientCents != null ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setProducts((prev) =>
                                  prev.map((p) => (p.id === prod.id ? { ...p, priceClientCents: undefined } : p))
                                )
                                toast.success(`Precio de Cliente de ${prod.storeName} restablecido a automático`)
                              }}
                            >
                              Restablecer
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">automático</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="block font-semibold">{formatUsd(mCli.marginCents)}</span>
                        <span className="block text-muted-foreground">{formatPct(mCli.marginPct)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditProduct(prod)}
                          aria-label={`Editar ${prod.storeName} ${formatUsd(prod.faceCents)}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tablas de Paquetes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Tablas de paquetes de puntos</CardTitle>
              </div>
              <CardDescription>{activeTableTitle}</CardDescription>
            </div>

            {/* Selector de tabla */}
            <div className="flex w-full flex-col gap-2 sm:w-72">
              <Select
                value={selectedPackTable}
                onValueChange={setSelectedPackTable}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Estándar (Clientes)</SelectItem>
                  <SelectItem value="public">Público (Canjeadores)</SelectItem>
                  {clients
                    .filter((c) => c.packMode === "custom")
                    .map((c) => (
                      <SelectItem key={c.id} value={`client-${c.id}`}>
                        Propio: {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedPackTable === "standard" && (
                <Button type="button" size="sm" variant="outline" onClick={() => setStandardDialogOpen(true)}>
                  <Edit2 className="mr-1 h-3.5 w-3.5" /> Editar paquetes estándar
                </Button>
              )}
              {selectedPackTable === "public" && (
                <Button type="button" size="sm" variant="outline" onClick={() => setPacksDialogOpen(true)}>
                  <Edit2 className="mr-1 h-3.5 w-3.5" /> Editar paquetes del Canjeador
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tramo (USD)</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">USD por punto</TableHead>
                  <TableHead className="text-right">Ahorro vs 1.er tramo</TableHead>
                  <TableHead className="text-center">Insignia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDisplayPacks.map((pack, idx) => {
                  const cpp = (centsPerPoint(pack)) / 100
                  const firstPack = activeDisplayPacks[0]
                  const firstCpp = firstPack ? (centsPerPoint(firstPack)) / 100 : 0
                  const savingPct = firstCpp > 0 ? (firstCpp - cpp) / firstCpp : 0

                  return (
                    <TableRow key={pack.id}>
                      <TableCell className="font-semibold font-mono">
                        {formatUsd(pack.usdCents)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {formatPts(pack.points)} pts
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatUsdPerPoint(cpp)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-emerald-700">
                        {idx === 0 || savingPct <= 0 ? "—" : formatPct(savingPct)}
                      </TableCell>
                      <TableCell className="text-center">
                        {pack.badge ? (
                          <Badge variant="secondary">{pack.badge}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PacksEditor
        open={packsDialogOpen}
        onOpenChange={setPacksDialogOpen}
        packs={publicPacks}
        pointsPerUsdBase={100 * (settings.pointsFactor ?? 1)}
        onSave={(next) => {
          setPublicPacks(next)
          toast.success("Paquetes del Canjeador actualizados")
        }}
      />

      <PacksEditor
        open={standardDialogOpen}
        onOpenChange={setStandardDialogOpen}
        title="Paquetes estándar (Clientes)"
        description="Lo que paga un Cliente sin tabla propia (USD → puntos)."
        packs={standardPacks}
        pointsPerUsdBase={100 * (settings.pointsFactor ?? 1)}
        onSave={(next) => {
          setStandardPacks(next)
          toast.success("Paquetes estándar actualizados")
        }}
      />

      {/* Dialog para Editar Producto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar producto: {editingProduct?.storeName}</DialogTitle>
            <DialogDescription>
              Sobreescribe el costo directo o ajusta la caducidad de esta tarjeta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="costOverride">
                Costo directo en USD (opcional, anula descuento de proveedor)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="costOverride"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Dejar vacío para usar descuento"
                  value={costOverrideInput}
                  onChange={(e) => setCostOverrideInput(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="cardDays">Caducidad de esta tarjeta</Label>
                <EditableNumber
                  label="Caducidad de esta tarjeta"
                  display={String(parsedCardDays ?? providerDays)}
                  initial={String(parsedCardDays ?? providerDays)}
                  suffix="días"
                  onCommit={(v) => setCardDaysInput(String(v))}
                />
              </div>
              <Slider
                id="cardDays"
                min={30}
                max={730}
                step={1}
                value={[Math.min(Math.max(parsedCardDays ?? providerDays, 30), 730)]}
                onValueChange={(v) => setCardDaysInput(String(v[0]))}
                aria-label="Caducidad de esta tarjeta en días"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Mínimo 30 días</span>
                <span>Máximo 730 días</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {parsedCardDays === undefined
                    ? `Usa la caducidad del Proveedor (${providerDays} días).`
                    : `Propia de esta tarjeta; el Proveedor tiene ${providerDays} días.`}
                </span>
                {parsedCardDays !== undefined && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setCardDaysInput("")}>
                    Usar la del Proveedor
                  </Button>
                )}
              </div>
            </div>

            {preview && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vista previa con estos cambios
                </p>
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-xs">
                  <span />
                  <span className="text-muted-foreground">Guardado hoy</span>
                  <span className="text-muted-foreground">Con estos cambios</span>

                  <span className="text-muted-foreground">Precio General</span>
                  <span className="font-mono">{formatUsd(preview.now.priceGeneral)}</span>
                  <span className="font-mono font-semibold">{formatUsd(preview.next.priceGeneral)}</span>

                  <span className="text-muted-foreground">Puntos de la tarjeta</span>
                  <span className="font-mono">{formatPts(preview.now.pts)}</span>
                  <span className="font-mono font-semibold text-primary">
                    {formatPts(preview.next.pts)}
                    {preview.next.pts !== preview.now.pts && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({preview.next.pts > preview.now.pts ? "+" : "−"}
                        {formatPts(Math.abs(preview.next.pts - preview.now.pts))})
                      </span>
                    )}
                  </span>

                  <span className="text-muted-foreground">Margen General</span>
                  <span className="font-mono">
                    {formatUsd(preview.now.marginGeneral.marginCents)} ({formatPct(preview.now.marginGeneral.marginPct)})
                  </span>
                  <span className="font-mono font-semibold">
                    {formatUsd(preview.next.marginGeneral.marginCents)} ({formatPct(preview.next.marginGeneral.marginPct)})
                  </span>

                  <span className="text-muted-foreground">Precio Cliente</span>
                  <span className="font-mono">{formatUsd(preview.now.priceClient)}</span>
                  <span className="font-mono font-semibold">{formatUsd(preview.next.priceClient)}</span>

                  <span className="text-muted-foreground">Margen Cliente</span>
                  <span className="font-mono">
                    {formatUsd(preview.now.marginClient.marginCents)} ({formatPct(preview.now.marginClient.marginPct)})
                  </span>
                  <span className="font-mono font-semibold">
                    {formatUsd(preview.next.marginClient.marginCents)} ({formatPct(preview.next.marginClient.marginPct)})
                  </span>
                </div>
                {preview.next.pts === preview.now.pts && (
                  <p className="text-[11px] text-muted-foreground">
                    Los puntos no cambian: se redondean hacia arriba a múltiplos de {settings.pointsMultiple}.
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
