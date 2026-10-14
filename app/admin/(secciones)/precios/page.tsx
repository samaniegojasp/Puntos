"use client"

import { useEffect, useState } from "react"
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
  MOCK_SETTINGS,
  MOCK_STANDARD_PACKS,
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
import type { PointsPack, Product, Provider } from "@/lib/domain/types"

export default function AdminPreciosPage() {
  const [loading, setLoading] = useState(true)

  // Estado local para productos y paquetes
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [standardPacks] = useState<PointsPack[]>(MOCK_STANDARD_PACKS)
  const [publicPacks, setPublicPacks] = useState<PointsPack[]>(MOCK_PUBLIC_PACKS)
  const [clients] = useState(MOCK_CLIENTS_ADMIN)
  const [settings] = useState(MOCK_SETTINGS)

  // Selector de tabla de paquetes
  const [selectedPackTable, setSelectedPackTable] = useState<string>("standard")

  // Estado del caso con error
  const [isErrorCaseActive, setIsErrorCaseActive] = useState(false)

  // Modal para editar producto
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [marginPctInput, setMarginPctInput] = useState("15")
  const [costOverrideInput, setCostOverrideInput] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Referencia común para cálculos de puntos
  const refCents = referenceCentsPerPoint(standardPacks)
  const providerOf = (id: string): Provider =>
    MOCK_PROVIDERS.find((x) => x.id === id) ?? {
      id,
      name: "—",
      discountPct: 0,
      cardValidDays: 180,
      active: true,
    }

  // Evaluación global de reglas de precios
  const currentIssues = validatePricing({
    settings,
    providers: MOCK_PROVIDERS,
    products,
    standardPacks,
    publicPacks,
    clients,
  })

  // Manejo del botón "Probar un caso con error"
  const handleToggleErrorCase = () => {
    if (!isErrorCaseActive) {
      // Subir puntos del primer paquete público a 2.500 para romper regla 2
      setPublicPacks((prev) => [
        { ...prev[0], points: 2500 },
        ...prev.slice(1),
      ])
      setIsErrorCaseActive(true)
      toast.info("Caso de error activado: Canjeador paga menos que Cliente a $10")
    } else {
      setPublicPacks(MOCK_PUBLIC_PACKS)
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
    setDialogOpen(true)
  }

  const parsedMarginPct = (parseFloat(marginPctInput.replace(",", ".")) || 0) / 100
  const parsedCostOverride = costOverrideInput.trim()
    ? Math.round((parseFloat(costOverrideInput.replace(",", ".")) || 0) * 100)
    : undefined

  const candidateProduct: Product = editingProduct
    ? {
        ...editingProduct,
        marginPct: parsedMarginPct,
        costCentsOverride: parsedCostOverride,
      }
    : (products[0] ?? MOCK_PRODUCTS[0])

  const simulatedProducts = editingProduct
    ? products.map((p) => (p.id === editingProduct.id ? candidateProduct : p))
    : products

  const dialogIssues = validatePricing({
    settings,
    providers: MOCK_PROVIDERS,
    products: simulatedProducts,
    standardPacks,
    publicPacks,
    clients,
  })

  const dialogErrors = dialogIssues.filter((i) => i.severity === "error")
  const dialogWarnings = dialogIssues.filter((i) => i.severity === "warning")
  const canSaveProduct = dialogErrors.length === 0 && parsedMarginPct >= 0

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !canSaveProduct) return

    setProducts(simulatedProducts)
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
            <div className="w-full sm:w-72">
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
              <Label htmlFor="marginPct">Margen comercial (%)</Label>
              <div className="relative">
                <Input
                  id="marginPct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={marginPctInput}
                  onChange={(e) => setMarginPctInput(e.target.value)}
                  required
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                  %
                </span>
              </div>
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
