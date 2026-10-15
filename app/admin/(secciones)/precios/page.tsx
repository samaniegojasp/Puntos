"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Info,
  Package,
  RotateCcw,
  ShieldAlert,
  Tag,
} from "lucide-react"
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
import {
  MOCK_CLIENTS_ADMIN,
  MOCK_PRODUCTS,
  MOCK_PROVIDERS,
  MOCK_PUBLIC_PACKS,
} from "@/lib/mock/data"
import { formatPct, formatPts, formatUsd, formatUsdPerPoint } from "@/lib/domain/format"
import {
  centsPerPoint,
  marginAtPack,
  pointsPrice,
  productCostCents,
  productPriceCents,
  referenceCentsPerPoint,
  validatePricing,
} from "@/lib/domain/pricing"
import EditableNumber from "@/components/panel/editable-number"
import PacksEditor from "@/components/panel/packs-editor"
import { Slider } from "@/components/ui/slider"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { rescaleForFactor } from "@/lib/domain/points-factor"
import type { PointsPack, Product, Provider } from "@/lib/domain/types"

export default function AdminPreciosPage() {
  const [loading, setLoading] = useState(true)

  // Estado local para productos y paquetes
  const { settings, providers, products, setProducts, clients, publicPacks, setPublicPacks, standardPacks, setStandardPacks } = useAdminSettings()

  // Selector de tabla de paquetes
  const [selectedPackTable, setSelectedPackTable] = useState<string>("standard")
  const [packsDialogOpen, setPacksDialogOpen] = useState(false)
  const [standardDialogOpen, setStandardDialogOpen] = useState(false)

  // Estado del caso con error
  const [isErrorCaseActive, setIsErrorCaseActive] = useState(false)

  // Modal para editar producto
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [marginPctInput, setMarginPctInput] = useState("15")
  const [costOverrideInput, setCostOverrideInput] = useState("")
  // Caducidad propia de la tarjeta (días); vacío = usa la del Proveedor
  const [cardDaysInput, setCardDaysInput] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Referencia común para cálculos de puntos
  const refCents = referenceCentsPerPoint(publicPacks)
  const providerOf = (id: string): Provider =>
    providers.find((x) => x.id === id) ?? {
      id,
      name: "—",
      discountPct: 0,
      cardValidDays: 180,
      active: true,
    }

  // Evaluación global de reglas de precios
  const currentIssues = validatePricing({
    settings,
    providers,
    products,
    standardPacks,
    publicPacks,
    clients,
  })

  // Manejo del botón "Probar un caso con error"
  const handleToggleErrorCase = () => {
    const f = settings.pointsFactor ?? 1
    if (!isErrorCaseActive) {
      // Subir puntos del primer paquete público a 1.300 * f (más puntos por dólar que el Cliente) para romper la regla 2
      setPublicPacks((prev) => [
        { ...prev[0], points: Math.round(1300 * f) },
        ...prev.slice(1),
      ])
      setIsErrorCaseActive(true)
      toast.info("Caso de error activado: Canjeador paga menos que Cliente a $10")
    } else {
      const rescaled = rescaleForFactor(
        { settings, publicPacks: MOCK_PUBLIC_PACKS, standardPacks, clients },
        1,
        f,
      )
      setPublicPacks(rescaled.publicPacks)
      setIsErrorCaseActive(false)
      toast.success("Catálogo de paquetes restaurado al estado original")
    }
  }

  // Modal de edición de producto
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod)
    setMarginPctInput((prod.marginPct * 100).toString())
    setCostOverrideInput(
      prod.costCentsOverride != null ? (prod.costCentsOverride / 100).toString() : ""
    )
    setCardDaysInput(prod.cardValidDays != null ? String(prod.cardValidDays) : "")
    setDialogOpen(true)
  }

  const parsedMarginPct = (parseFloat(marginPctInput.replace(",", ".")) || 0) / 100
  const parsedCostOverride = costOverrideInput.trim()
    ? Math.round((parseFloat(costOverrideInput.replace(",", ".")) || 0) * 100)
    : undefined

  const parsedCardDays = cardDaysInput.trim() ? parseInt(cardDaysInput, 10) || undefined : undefined
  const providerDays = editingProduct ? providerOf(editingProduct.providerId).cardValidDays : 180
  const candidateProduct: Product = editingProduct
    ? {
        ...editingProduct,
        marginPct: parsedMarginPct,
        costCentsOverride: parsedCostOverride,
        cardValidDays: parsedCardDays,
        // Se valida como si estuviera activo: un producto oculto hoy podría activarse mañana con un margen absurdo
        active: true,
      }
    : products[0]

  const simulatedProducts = editingProduct
    ? products.map((p) => (p.id === editingProduct.id ? candidateProduct : p))
    : products

  const dialogIssues = validatePricing({
    settings,
    providers,
    products: simulatedProducts,
    standardPacks,
    publicPacks,
    clients,
  })

  const dialogErrors = dialogIssues.filter((i) => i.severity === "error")
  const dialogWarnings = dialogIssues.filter((i) => i.severity === "warning")
  const canSaveProduct = dialogErrors.length === 0 && parsedMarginPct >= 0

  // Márgenes válidos para este producto, calculados con las mismas reglas (sin fórmulas propias).
  // Se prueba cada valor (de 0,1 en 0,1 %) porque el redondeo de los puntos a múltiplos de 100 hace que el resultado
  // no sea parejo: puede haber valores sueltos inválidos dentro del rango. La barra solo recorre los válidos.
  const MARGIN_UNIT = 1000 // décimas de punto porcentual (0,1 %)
  const MARGIN_CAP_UNITS = 2000 // hasta 200 %
  const editingId = editingProduct?.id
  const validMargins = useMemo(() => {
    if (!editingProduct) return null
    const face = `$${(editingProduct.faceCents / 100).toFixed(2)}`
    const tag = `${editingProduct.storeName} ${face}`
    const list: number[] = []
    for (let u = 0; u <= MARGIN_CAP_UNITS; u++) {
      const errs = validatePricing({
        settings,
        providers,
        products: products.map((p) =>
          p.id === editingProduct.id
            ? { ...editingProduct, marginPct: u / MARGIN_UNIT, costCentsOverride: parsedCostOverride, active: true }
            : p,
        ),
        standardPacks,
        publicPacks,
        clients,
      }).filter((i) => i.severity === "error" && i.message.includes(tag))
      if (errs.length === 0) list.push(u)
    }
    return list.length ? list : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, products, providers, clients, settings, standardPacks, publicPacks, parsedCostOverride])

  const marginUnit = Math.round(parsedMarginPct * MARGIN_UNIT)
  const marginIndex = validMargins
    ? validMargins.reduce((best, u, i) => (Math.abs(u - marginUnit) < Math.abs(validMargins[best] - marginUnit) ? i : best), 0)
    : 0
  const marginIsValid = validMargins ? validMargins.includes(marginUnit) : false
  const marginHasGaps = validMargins ? validMargins[validMargins.length - 1] - validMargins[0] + 1 !== validMargins.length : false

  // Vista previa de lo que produce el margen que se está editando (y lo que hay guardado hoy)
  const preview = editingProduct
    ? (() => {
        const provider = providerOf(editingProduct.providerId)
        const calc = (prod: Product) => {
          const cost = productCostCents(prod, provider)
          const price = productPriceCents(prod, provider)
          const pts = pointsPrice(price, refCents, settings.pointsMultiple)
          return {
            cost,
            price,
            pts,
            margins: standardPacks.slice(0, 3).map((pack) => ({ usd: pack.usdCents, ...marginAtPack(pts, pack, cost) })),
          }
        }
        return { now: calc(editingProduct), next: calc(candidateProduct) }
      })()
    : null

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !canSaveProduct) return

    // Se guarda con su estado original (activo/inactivo); la validación sí lo trató como activo
    setProducts(simulatedProducts.map((p) => (p.id === editingProduct.id ? { ...p, active: editingProduct.active } : p)))
    toast.success(`Parámetros de ${editingProduct.storeName} actualizados`)
    setDialogOpen(false)
  }

  // Errores de reglas con un conjunto de paquetes del Canjeador dado (para el editor de paquetes)
  const validatePublicPacks = useCallback(
    (packs: PointsPack[]) =>
      validatePricing({ settings, providers, products, standardPacks, publicPacks: packs, clients }).filter(
        (i) => i.severity === "error",
      ),
    [settings, providers, products, standardPacks, clients],
  )

  // Errores de reglas con un conjunto de paquetes estándar dado (para el editor de paquetes estándar)
  const validateStandardPacks = useCallback(
    (packs: PointsPack[]) =>
      validatePricing({ settings, providers, products, standardPacks: packs, publicPacks, clients }).filter(
        (i) => i.severity === "error",
      ),
    [settings, providers, products, publicPacks, clients],
  )

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Precios y fórmulas</h2>
          <p className="text-sm text-muted-foreground">
            Cálculo de costos, precios en dólares, puntos y auditoría de reglas de negocio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isErrorCaseActive ? "destructive" : "outline"}
            onClick={handleToggleErrorCase}
          >
            {isErrorCaseActive ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" /> Volver al estado original
              </>
            ) : (
              <>
                <ShieldAlert className="mr-2 h-4 w-4" /> Probar un caso con error
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 3. Panel "Reglas del sistema" */}
      <Card
        className={
          currentIssues.length === 0
            ? "border-emerald-200 bg-emerald-50/40"
            : currentIssues.some((i) => i.severity === "error")
            ? "border-destructive/30 bg-destructive/5"
            : "border-amber-200 bg-amber-50/40"
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {currentIssues.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <CardTitle className="text-lg">Reglas del sistema de precios</CardTitle>
          </div>
          <CardDescription>
            Auditoría en tiempo real de márgenes mínimos, consistencia de tramos y piso de tarjetas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentIssues.length === 0 ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Todas las reglas se cumplen
            </div>
          ) : (
            <div className="space-y-2">
              {currentIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-md p-2.5 text-xs ${
                    issue.severity === "error"
                      ? "bg-destructive/10 text-destructive font-medium"
                      : "bg-amber-100/60 text-amber-900"
                  }`}
                >
                  <span className="font-bold shrink-0 uppercase tracking-wider">
                    Regla {issue.rule} [{issue.severity}]:
                  </span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[850px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Facial</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Transp.</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                  <TableHead className="text-right">Precio USD</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-center" colSpan={3}>
                    Margen tramos estándar ($10 / $50 / $100)
                  </TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((prod) => {
                  const provider = providerOf(prod.providerId)
                  const cost = productCostCents(prod, provider)
                  const price = productPriceCents(prod, provider)
                  const pts = pointsPrice(price, refCents, settings.pointsMultiple)

                  // Margen en cada tramo estándar (10, 50, 100)
                  const m10 = marginAtPack(pts, standardPacks[0], cost)
                  const m50 = marginAtPack(pts, standardPacks[1], cost)
                  const m100 = marginAtPack(pts, standardPacks[2], cost)

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
                        {formatPct(prod.marginPct)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {formatUsd(price)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-primary">
                        {formatPts(pts)} pts
                      </TableCell>

                      {/* Margen tramo $10 */}
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          m10.marginPct < settings.minMarginPct
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        }`}
                        title="Margen con paquete de $10"
                      >
                        {formatPct(m10.marginPct)}
                      </TableCell>

                      {/* Margen tramo $50 */}
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          m50.marginPct < settings.minMarginPct
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        }`}
                        title="Margen con paquete de $50"
                      >
                        {formatPct(m50.marginPct)}
                      </TableCell>

                      {/* Margen tramo $100 */}
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          m100.marginPct < settings.minMarginPct
                            ? "text-destructive font-bold"
                            : "text-muted-foreground"
                        }`}
                        title="Margen con paquete de $100"
                      >
                        {formatPct(m100.marginPct)}
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
        validate={validatePublicPacks}
        onSave={(next) => {
          setPublicPacks(next)
          setIsErrorCaseActive(false)
          toast.success("Paquetes del Canjeador actualizados")
        }}
      />

      <PacksEditor
        open={standardDialogOpen}
        onOpenChange={setStandardDialogOpen}
        title="Paquetes estándar (Clientes)"
        description="Lo que paga un Cliente sin tabla propia (USD → puntos). Cada barra solo permite valores que cumplen las reglas: el Canjeador debe pagar más por punto, el margen mínimo y el beneficio mínimo del Cliente."
        packs={standardPacks}
        validate={validateStandardPacks}
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
              Ajusta el margen comercial y opcionalmente sobreescribe el costo directo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="marginPct">Margen comercial</Label>
                <EditableNumber
                  label="Margen comercial"
                  display={new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(parsedMarginPct * 100)}
                  initial={String(Math.round(parsedMarginPct * 10000) / 100)}
                  suffix="%"
                  decimals
                  allowZero
                  onCommit={(v) => setMarginPctInput(String(Math.round(v * 100) / 100))}
                />
              </div>
              {validMargins ? (
                <>
                  <Slider
                    id="marginPct"
                    min={0}
                    max={Math.max(validMargins.length - 1, 0)}
                    step={1}
                    value={[marginIndex]}
                    onValueChange={(v) => setMarginPctInput(String(validMargins[v[0]] / 10))}
                    aria-label="Margen comercial"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Mínimo {new Intl.NumberFormat("es-EC").format(validMargins[0] / 10)} %</span>
                    <span>Máximo {new Intl.NumberFormat("es-EC").format(validMargins[validMargins.length - 1] / 10)} %</span>
                  </div>
                  {!marginIsValid && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-destructive">
                        El valor actual no cumple las reglas. Mueve la barra o usa el válido más cercano.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setMarginPctInput(String(validMargins[marginIndex] / 10))}
                      >
                        Usar {new Intl.NumberFormat("es-EC").format(validMargins[marginIndex] / 10)} %
                      </Button>
                    </div>
                  )}
                  {marginHasGaps && (
                    <p className="text-[11px] text-muted-foreground">
                      La barra salta algunos valores del medio que, por el redondeo de puntos, romperían una regla.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive">
                    Con este costo no existe ningún margen que cumpla las reglas, así que la barra no se puede mostrar.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Suele pasar cuando el costo queda muy cerca del valor facial: para ganar el margen mínimo en los paquetes grandes harían falta más puntos de los que el precio permite sin superar el valor facial.
                    {parsedCostOverride !== undefined
                      ? " Prueba quitando el costo directo o bajándolo."
                      : " Revisa el descuento del Proveedor en la pestaña Proveedores."}
                  </p>
                  {parsedCostOverride !== undefined && (
                    <Button type="button" size="sm" variant="outline" onClick={() => setCostOverrideInput("")}>
                      Quitar costo directo
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Los límites salen de las reglas: abajo, el margen mínimo en cada tramo; arriba, que el paquete de ese valor siga alcanzando para la tarjeta y que el precio no supere el valor facial.
              </p>
            </div>

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
                  Vista previa con este margen
                </p>
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-xs">
                  <span />
                  <span className="text-muted-foreground">Guardado hoy</span>
                  <span className="text-muted-foreground">Con este margen</span>
                  <span className="text-muted-foreground">Precio</span>
                  <span className="font-mono">{formatUsd(preview.now.price)}</span>
                  <span className="font-mono font-semibold">{formatUsd(preview.next.price)}</span>
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
                  {preview.next.margins.map((m, i) => (
                    <div key={m.usd} className="contents">
                      <span className="text-muted-foreground">Margen en tramo de {formatUsd(m.usd)}</span>
                      <span className="font-mono">{formatPct(preview.now.margins[i].marginPct)}</span>
                      <span
                        className={
                          "font-mono font-semibold " +
                          (m.marginPct < settings.minMarginPct ? "text-destructive" : "")
                        }
                      >
                        {formatPct(m.marginPct)}
                      </span>
                    </div>
                  ))}
                </div>
                {preview.next.pts === preview.now.pts && (
                  <p className="text-[11px] text-muted-foreground">
                    Los puntos no cambian: se redondean hacia arriba a múltiplos de {settings.pointsMultiple} y este margen no cruza al siguiente escalón.
                  </p>
                )}
              </div>
            )}

            {dialogErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No se puede guardar</AlertTitle>
                <AlertDescription className="space-y-1 mt-1 text-xs">
                  {dialogErrors.map((issue, i) => (
                    <p key={i}>• {issue.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {dialogWarnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900 font-semibold">Avisos</AlertTitle>
                <AlertDescription className="space-y-1 mt-1 text-xs text-amber-800">
                  {dialogWarnings.map((issue, i) => (
                    <p key={i}>• {issue.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSaveProduct}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
