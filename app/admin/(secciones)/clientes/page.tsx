"use client"

import { useEffect, useState } from "react"
import { AlertCircle, AlertTriangle, Building2, Check, Edit2, Info, Plus, Trash2 } from "lucide-react"
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
import { Slider } from "@/components/ui/slider"
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
  MOCK_SETTINGS,
  MOCK_STANDARD_PACKS,
} from "@/lib/mock/data"
import { formatPct, formatPts, formatUsd, formatUsdPerPoint } from "@/lib/domain/format"
import { validatePricing } from "@/lib/domain/pricing"
import type { ClientAdminRow, PointsPack } from "@/lib/domain/types"

export default function AdminClientesPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientAdminRow[]>(MOCK_CLIENTS_ADMIN)

  // Estado del modal de cliente (creación / edición)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientAdminRow | null>(null)

  // Campos del formulario
  const [name, setName] = useState("")
  const [usdPerPoint, setUsdPerPoint] = useState("0.00800")
  const [packMode, setPackMode] = useState<"standard" | "custom">("standard")
  const [customPacks, setCustomPacks] = useState<PointsPack[]>([])
  const [active, setActive] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleOpenCreate = () => {
    setEditingClient(null)
    setName("")
    setUsdPerPoint("0.00800")
    setPackMode("standard")
    setCustomPacks([
      { id: `pack-new-1`, usdCents: 10000, points: 12500 },
      { id: `pack-new-2`, usdCents: 20000, points: 26000 },
    ])
    setActive(true)
    setDialogOpen(true)
  }

  const handleOpenEdit = (client: ClientAdminRow) => {
    setEditingClient(client)
    setName(client.name)
    setUsdPerPoint(client.usdPerPoint.toFixed(5))
    setPackMode(client.packMode)
    setCustomPacks(client.customPacks.map((p) => ({ ...p })))
    setActive(client.active)
    setDialogOpen(true)
  }

  // Manejo de tramos propios
  const handleAddPack = () => {
    setCustomPacks((prev) => [
      ...prev,
      {
        id: `pack-${Date.now()}`,
        usdCents: 10000,
        points: 12000,
      },
    ])
  }

  const handleRemovePack = (idx: number) => {
    setCustomPacks((prev) => prev.filter((_, i) => i !== idx))
  }

  const handlePackChange = (idx: number, field: "usdCents" | "points", val: number) => {
    setCustomPacks((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      return updated
    })
  }

  // Validación en tiempo real con validatePricing
  const parsedUsdPerPoint = parseFloat(usdPerPoint) || 0.008
  const candidateClient: ClientAdminRow = {
    id: editingClient?.id ?? "c-temp",
    name: name.trim() || (editingClient?.name ?? "Cliente Temporal"),
    usdPerPoint: parsedUsdPerPoint,
    bonusPct: editingClient?.bonusPct ?? 0.0085,
    bagPoints: editingClient?.bagPoints ?? 0,
    packMode,
    customPacks: packMode === "custom" ? customPacks : [],
    active,
  }

  // Revisa las reglas del sistema con un conjunto de tramos propios dado
  const buildIssues = (packs: PointsPack[]) => {
    const cand: ClientAdminRow = { ...candidateClient, customPacks: packMode === "custom" ? packs : [] }
    const simulated = editingClient
      ? clients.map((c) => (c.id === editingClient.id ? cand : c))
      : [...clients, cand]
    return validatePricing({
      settings: MOCK_SETTINGS,
      providers: MOCK_PROVIDERS,
      products: MOCK_PRODUCTS,
      standardPacks: MOCK_STANDARD_PACKS,
      publicPacks: MOCK_PUBLIC_PACKS,
      clients: simulated,
    })
  }

  const issues = buildIssues(customPacks)

  // Rango de puntos válido para un tramo, calculado con las mismas reglas (sin fórmulas propias).
  // Regla 2 (el Canjeador paga más por punto): exige un mínimo de puntos.
  // Regla 3 (margen mínimo): exige un máximo de puntos.
  const POINTS_STEP = 50
  const POINTS_CAP = 5_000_000
  const pointsBounds = (idx: number): { min: number; max: number } | null => {
    const own = customPacks[idx]
    if (!own || own.usdCents <= 0) return null
    const tag = `tramo $${(own.usdCents / 100).toFixed(2)}:`
    const withPoints = (pts: number) =>
      customPacks.map((x, i) => (i === idx ? { ...x, points: pts } : x))
    const lowOk = (pts: number) => !buildIssues(withPoints(pts)).some((i) => i.rule === 2)
    const highOk = (pts: number) =>
      !buildIssues(withPoints(pts)).some((i) => i.rule === 3 && i.message.includes(tag))

    const maxK = Math.floor(POINTS_CAP / POINTS_STEP)
    // Menor valor que cumple la regla 2 (válido de ahí hacia arriba)
    if (!lowOk(maxK * POINTS_STEP) || !highOk(POINTS_STEP)) return null
    let a = 1
    let b = maxK
    while (a < b) {
      const m = Math.floor((a + b) / 2)
      if (lowOk(m * POINTS_STEP)) b = m
      else a = m + 1
    }
    const min = a * POINTS_STEP
    // Mayor valor que cumple la regla 3 (válido de ahí hacia abajo)
    a = 1
    b = maxK
    while (a < b) {
      const m = Math.ceil((a + b) / 2)
      if (highOk(m * POINTS_STEP)) a = m
      else b = m - 1
    }
    const max = a * POINTS_STEP
    return min <= max ? { min, max } : null
  }

  const errorIssues = issues.filter((i) => i.severity === "error")
  const warningIssues = issues.filter((i) => i.severity === "warning")
  const hasErrors = errorIssues.length > 0 || !name.trim() || parsedUsdPerPoint <= 0

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasErrors) return

    if (editingClient) {
      setClients((prev) => prev.map((c) => (c.id === editingClient.id ? candidateClient : c)))
      toast.success("Cliente actualizado con éxito")
    } else {
      const newClientWithId: ClientAdminRow = {
        ...candidateClient,
        id: `c-${Date.now()}`,
      }
      setClients((prev) => [...prev, newClientWithId])
      toast.success("Cliente creado con éxito")
    }

    setDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Clientes corporativos</h2>
          <p className="text-sm text-muted-foreground">
            Tarifas por punto, modos de paquetes y bolsas corporativas
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Listado de empresas clientes</CardTitle>
          </div>
          <CardDescription>
            {clients.length} empresas registradas en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold">No hay clientes registrados</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comienza creando el primer cliente corporativo.
              </p>
              <Button onClick={handleOpenCreate} size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Precio por punto</TableHead>
                    <TableHead className="text-right">Bono actual</TableHead>
                    <TableHead className="text-right">Puntos en bolsa</TableHead>
                    <TableHead className="text-center">Modo de paquetes</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-foreground">
                        {c.name}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-primary">
                        {formatUsdPerPoint(c.usdPerPoint)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatPct(c.bonusPct)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatPts(c.bagPoints)} pts
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={c.packMode === "custom" ? "default" : "secondary"}
                        >
                          {c.packMode === "custom" ? "Propio" : "Estándar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            c.active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }
                        >
                          {c.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(c)}
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

      {/* Dialog para Crear o Editar Cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? `Editar cliente: ${editingClient.name}` : "Nuevo cliente corporativo"}
            </DialogTitle>
            <DialogDescription>
              Configuración de tarifa de punto, modo de paquetes y estado comercial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre de la empresa</Label>
                <Input
                  id="clientName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Concesionaria Andina"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usdPerPoint">Precio por punto (USD, 5 decimales)</Label>
                <Input
                  id="usdPerPoint"
                  type="number"
                  step="0.00001"
                  min="0.00001"
                  value={usdPerPoint}
                  onChange={(e) => setUsdPerPoint(e.target.value)}
                  placeholder="0.00800"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ejemplo: 0.00800 significa $0,008 por punto.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="packMode">Modo de paquetes de compra</Label>
                <Select
                  value={packMode}
                  onValueChange={(val) => setPackMode(val as "standard" | "custom")}
                >
                  <SelectTrigger id="packMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Estándar (paquetes globales)</SelectItem>
                    <SelectItem value="custom">Propio (tramos a medida)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="activeSwitch" className="text-sm font-medium">Cliente activo</Label>
                  <p className="text-xs text-muted-foreground">Permite acceder al panel corporativo</p>
                </div>
                <Switch
                  id="activeSwitch"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            </div>

            {/* Aviso sobre el bono del cliente */}
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1 border">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Info className="h-4 w-4 text-primary" /> Bono configurado:{" "}
                <span className="font-mono text-primary font-bold">
                  {formatPct(editingClient?.bonusPct ?? 0.0085)}
                </span>
              </p>
              <p>
                El bono lo cambia el Cliente, no se edita aquí (solo se muestra).
              </p>
              <p className="text-[11px] text-muted-foreground">
                Un cambio de precio afecta solo a los puntos que este cliente compre después; los ya vendidos no cambian.
              </p>
              <p className="text-[11px] text-muted-foreground">
                validatePricing revisa únicamente los paquetes; el precio por punto de un cliente en modo estándar es informativo.
              </p>
            </div>

            {/* Editor de tramos si el modo es propio */}
            {packMode === "custom" && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    Tramos propios de paquetes (USD → Puntos)
                  </h4>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddPack}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Añadir tramo
                  </Button>
                </div>

                {customPacks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No hay tramos definidos. Añade al menos uno para este cliente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customPacks.map((pack, idx) => {
                      const usdAmount = pack.usdCents / 100
                      const cpp = pack.points > 0 ? (pack.usdCents / pack.points) / 100 : 0
                      const bounds = pointsBounds(idx)

                      return (
                        <div
                          key={pack.id || idx}
                          className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-3"
                        >
                          <div className="w-28 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Monto (USD)</Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={usdAmount}
                              onChange={(e) =>
                                handlePackChange(
                                  idx,
                                  "usdCents",
                                  Math.round((parseFloat(e.target.value) || 0) * 100)
                                )
                              }
                            />
                          </div>

                          <div className="min-w-[220px] flex-1 space-y-2">
                            <div className="flex items-baseline justify-between">
                              <Label className="text-[10px] text-muted-foreground">Puntos recibidos</Label>
                              <span className="font-mono text-sm font-semibold text-foreground">
                                {formatPts(pack.points)} pts
                              </span>
                            </div>
                            {bounds ? (
                              <>
                                <Slider
                                  min={bounds.min}
                                  max={bounds.max}
                                  step={POINTS_STEP}
                                  value={[Math.min(Math.max(pack.points, bounds.min), bounds.max)]}
                                  onValueChange={(v) => handlePackChange(idx, "points", v[0])}
                                  aria-label="Puntos recibidos"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span>Mínimo {formatPts(bounds.min)}</span>
                                  <span>Máximo {formatPts(bounds.max)}</span>
                                </div>
                                {(pack.points < bounds.min || pack.points > bounds.max) && (
                                  <p className="text-[11px] text-destructive">
                                    El valor actual está fuera del rango permitido. Mueve la barra para corregirlo.
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-[11px] text-destructive">
                                  Con los otros tramos y el monto actuales no existe un valor que cumpla las reglas. Corrige el monto o los demás tramos.
                                </p>
                                <Input
                                  type="number"
                                  min="100"
                                  step="50"
                                  value={pack.points}
                                  onChange={(e) =>
                                    handlePackChange(idx, "points", parseInt(e.target.value, 10) || 0)
                                  }
                                />
                              </>
                            )}
                          </div>

                          <div className="flex-1 min-w-[130px] space-y-1">
                            <Label className="text-[10px] text-muted-foreground">USD por punto</Label>
                            <div className="h-10 flex items-center font-mono text-sm font-medium text-foreground">
                              {cpp > 0 ? formatUsdPerPoint(cpp) : "—"}
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePack(idx)}
                            className="text-muted-foreground hover:text-destructive self-end"
                            title="Eliminar tramo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
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
                <Check className="mr-2 h-4 w-4" /> Guardar cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
