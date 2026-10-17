"use client"

import { useEffect, useState } from "react"
import { Building2, Check, Edit2, Info, Plus, Trash2 } from "lucide-react"
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
import { formatPct, formatPts, formatUsd, formatUsdPerPoint } from "@/lib/domain/format"
import EditableNumber from "@/components/panel/editable-number"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { clientPpdLimits } from "@/lib/domain/pricing"
import type { ClientAdminRow, PointsPack } from "@/lib/domain/types"

/** Puntos que recibe el cliente por cada dólar (inverso del precio por punto). */
const ptsPerUsd = (usdPerPoint: number) =>
  usdPerPoint > 0 ? new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(1 / usdPerPoint) : "—"

export default function AdminClientesPage() {
  const { settings, clients, setClients, products, providers, publicPacks } = useAdminSettings()
  const f = settings.pointsFactor ?? 1
  const limits = clientPpdLimits({ settings, providers, products, publicPacks })
  const mPct = (settings.minMarginPct ?? 0.02) * 100
  const formatPpdValue = (val: number) =>
    new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(val)

  const [loading, setLoading] = useState(true)

  // Estado del modal de cliente (creación / edición)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientAdminRow | null>(null)

  // Campos del formulario
  const [name, setName] = useState("")
  const [usdPerPoint, setUsdPerPoint] = useState(String(0.008 / f))
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
    setUsdPerPoint(String(0.008 / f))
    setPackMode("standard")
    setCustomPacks([
      { id: `pack-new-1`, usdCents: 10000, points: 12500 * f },
      { id: `pack-new-2`, usdCents: 20000, points: 26000 * f },
    ])
    setActive(true)
    setDialogOpen(true)
  }

  const handleOpenEdit = (client: ClientAdminRow) => {
    setEditingClient(client)
    setName(client.name)
    setUsdPerPoint(String(Number(client.usdPerPoint.toPrecision(6))))
    setPackMode(client.packMode)
    setCustomPacks(client.customPacks.map((p) => ({ ...p })))
    setActive(client.active)
    setDialogOpen(true)
  }

  const POINTS_STEP = 50 * f
  const pointsRangeForUsd = (usdCents: number) => {
    if (usdCents <= 0) return null
    const usd = usdCents / 100
    const rawMin = Math.ceil((usd * limits.min) / POINTS_STEP) * POINTS_STEP
    const rawMax = Math.floor((usd * limits.max) / POINTS_STEP) * POINTS_STEP
    const min = rawMin
    const max = rawMax < rawMin ? rawMin : rawMax
    return { min, max }
  }

  // Manejo de tramos propios
  const handleAddPack = () => {
    const fresh: PointsPack = { id: `pack-${Date.now()}`, usdCents: 10000, points: 10000 * f }
    const b = pointsRangeForUsd(fresh.usdCents)
    if (b) {
      fresh.points = Math.max(POINTS_STEP, Math.round((b.min + b.max) / 2 / POINTS_STEP) * POINTS_STEP)
    }
    setCustomPacks([...customPacks, fresh])
  }

  // Al cambiar el monto de un tramo se conserva su proporción de puntos por dólar y se ajusta al nuevo rango permitido
  const handleUsdChange = (idx: number, usdCents: number) => {
    const cur = customPacks[idx]
    if (!cur || usdCents <= 0 || cur.usdCents <= 0) {
      handlePackChange(idx, "usdCents", usdCents)
      return
    }
    const ptsPerDollar = cur.points / (cur.usdCents / 100)
    let pts = Math.max(POINTS_STEP, Math.round(((usdCents / 100) * ptsPerDollar) / POINTS_STEP) * POINTS_STEP)
    const b = pointsRangeForUsd(usdCents)
    if (b) {
      pts = Math.min(Math.max(pts, b.min), b.max)
    }
    setCustomPacks(customPacks.map((p, i) => (i === idx ? { ...p, usdCents, points: pts } : p)))
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

  // Con tramos propios, el precio por punto sale de su tramo más pequeño (una sola fuente de verdad).
  const baseIdx =
    packMode === "custom" && customPacks.length > 0
      ? customPacks.reduce((best, p, i) => (p.usdCents < customPacks[best].usdCents ? i : best), 0)
      : null
  const basePack = baseIdx !== null ? customPacks[baseIdx] : null
  const parsedUsdPerPoint =
    basePack && basePack.points > 0
      ? basePack.usdCents / basePack.points / 100
      : parseFloat(usdPerPoint) || 0.008
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

  const pointsBounds = (idx: number): { min: number; max: number } | null => {
    const own = customPacks[idx]
    if (!own || own.usdCents <= 0) return null
    return pointsRangeForUsd(own.usdCents)
  }

  const duplicatedPacks = new Set(customPacks.map((p) => p.usdCents)).size !== customPacks.length
  const invalidPacks =
    packMode === "custom" &&
    (customPacks.length === 0 || duplicatedPacks || customPacks.some((p) => p.usdCents <= 0 || p.points <= 0))
  const hasErrors = !name.trim() || parsedUsdPerPoint <= 0 || invalidPacks

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
                    <TableHead className="text-right">Puntos por dólar</TableHead>
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
                        {ptsPerUsd(c.usdPerPoint)}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {formatUsdPerPoint(c.usdPerPoint)} por punto
                        </span>
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
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={(e) => {
            // Esc dentro de un valor que se está escribiendo solo cancela ese valor, no cierra la ventana
            if (document.activeElement?.hasAttribute("data-inline-edit")) e.preventDefault()
          }}
        >
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
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="usdPerPoint">Puntos por cada dólar</Label>
                  <span className="inline-flex items-baseline gap-2">
                    <EditableNumber
                      label="Puntos por cada dólar"
                      display={ptsPerUsd(parsedUsdPerPoint)}
                      initial={parsedUsdPerPoint > 0 ? String(Math.round((1 / parsedUsdPerPoint) * 100) / 100) : ""}
                      suffix="pts/$"
                      decimals
                      onCommit={(v) => {
                        const clampedV = Math.min(Math.max(v, limits.min), limits.max)
                        if (baseIdx !== null && basePack) {
                          // Puntos del tramo más pequeño = puntos por dólar × dólares del tramo
                          const targetPts = Math.round(clampedV * (basePack.usdCents / 100))
                          const b = pointsRangeForUsd(basePack.usdCents)
                          const clampedPts = b ? Math.min(Math.max(targetPts, b.min), b.max) : targetPts
                          handlePackChange(baseIdx, "points", Math.max(1, clampedPts))
                        } else {
                          setUsdPerPoint(String(Number((1 / clampedV).toPrecision(6))))
                        }
                      }}
                    />
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({formatUsdPerPoint(parsedUsdPerPoint)} por punto)
                    </span>
                  </span>
                </div>
                {baseIdx !== null && basePack ? (
                  // Con tramo propio la barra mueve sus puntos directamente (pasos de 50): izquierda = menos puntos por dólar
                  (() => {
                    const baseBounds = pointsRangeForUsd(basePack.usdCents)
                    if (!baseBounds) {
                      return (
                        <p className="text-[11px] text-destructive">
                          Indica un monto mayor a 0 para calcular la barra de puntos.
                        </p>
                      )
                    }
                    const isOutOfRange = basePack.points < baseBounds.min || basePack.points > baseBounds.max
                    return (
                      <>
                        <Slider
                          id="usdPerPoint"
                          min={baseBounds.min}
                          max={Math.max(baseBounds.min + POINTS_STEP, baseBounds.max)}
                          step={POINTS_STEP}
                          value={[Math.min(Math.max(basePack.points, baseBounds.min), Math.max(baseBounds.min + POINTS_STEP, baseBounds.max))]}
                          onValueChange={(v) => handlePackChange(baseIdx, "points", v[0])}
                          aria-label="Puntos por cada dólar"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Mínimo {formatPpdValue(limits.min)} pts/$ (Canjeador General)</span>
                          <span>Máximo {formatPpdValue(limits.max)} pts/$ (ganancia mínima {formatPpdValue(mPct)} %)</span>
                        </div>
                        {limits.limitingLabel && (
                          <p className="text-[10px] text-muted-foreground">
                            Tarjeta más exigente: {limits.limitingLabel}
                          </p>
                        )}
                        {isOutOfRange && (
                          <p className="text-[11px] text-destructive">
                            El valor actual está fuera del rango permitido. Mueve la barra para corregirlo.
                          </p>
                        )}
                      </>
                    )
                  })()
                ) : (
                  // Modo estándar: la barra va en puntos por dólar con referencia de $10 (pasos de 1 para $10 = 0,1 pts/$)
                  (() => {
                    const refUsd = 10
                    const refMinPts = Math.round(refUsd * limits.min)
                    const refMaxPts = Math.round(refUsd * limits.max)
                    const currentPts = Math.round(refUsd / (parsedUsdPerPoint > 0 ? parsedUsdPerPoint : 0.01))
                    const currentPpd = parsedUsdPerPoint > 0 ? 1 / parsedUsdPerPoint : 0
                    const isOutOfRange = currentPpd < limits.min - 1e-4 || currentPpd > limits.max + 1e-4
                    return (
                      <>
                        <Slider
                          id="usdPerPoint"
                          min={refMinPts}
                          max={Math.max(refMinPts + 1, refMaxPts)}
                          step={1}
                          value={[Math.min(Math.max(currentPts, refMinPts), Math.max(refMinPts + 1, refMaxPts))]}
                          onValueChange={(v) => v[0] > 0 && setUsdPerPoint((refUsd / v[0]).toFixed(6))}
                          aria-label="Puntos por cada dólar"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Mínimo {formatPpdValue(limits.min)} pts/$ (Canjeador General)</span>
                          <span>Máximo {formatPpdValue(limits.max)} pts/$ (ganancia mínima {formatPpdValue(mPct)} %)</span>
                        </div>
                        {limits.limitingLabel && (
                          <p className="text-[10px] text-muted-foreground">
                            Tarjeta más exigente: {limits.limitingLabel}
                          </p>
                        )}
                        {isOutOfRange && (
                          <p className="text-[11px] text-destructive">
                            El valor actual está fuera del rango permitido. Mueve la barra para corregirlo.
                          </p>
                        )}
                      </>
                    )
                  })()
                )}
                <p className="text-xs text-muted-foreground">
                  {baseIdx !== null
                    ? "Sale del tramo propio más pequeño: mover la barra ajusta los puntos de ese tramo."
                    : "Valor de referencia para convertir bono en puntos."}
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
                                handleUsdChange(idx, Math.round((parseFloat(e.target.value) || 0) * 100))
                              }
                            />
                          </div>

                          <div className="min-w-[220px] flex-1 space-y-2">
                            <div className="flex items-baseline justify-between">
                              <Label className="text-[10px] text-muted-foreground">Puntos recibidos</Label>
                              <EditableNumber
                                label="Puntos recibidos"
                                display={formatPts(pack.points)}
                                initial={String(pack.points)}
                                suffix="pts"
                                onCommit={(v) => {
                                  const clamped = bounds ? Math.min(Math.max(v, bounds.min), bounds.max) : Math.max(1, v)
                                  handlePackChange(idx, "points", clamped)
                                }}
                              />
                            </div>
                            {bounds ? (
                              <>
                                <Slider
                                  min={bounds.min}
                                  max={Math.max(bounds.min + POINTS_STEP, bounds.max)}
                                  step={POINTS_STEP}
                                  value={[Math.min(Math.max(pack.points, bounds.min), Math.max(bounds.min + POINTS_STEP, bounds.max))]}
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
                                  El monto debe ser mayor a 0 para calcular la barra de puntos.
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
                            <Label className="text-[10px] text-muted-foreground">Puntos por dólar</Label>
                            <div className="h-10 flex items-center font-mono text-sm font-medium text-foreground">
                              {cpp > 0 ? `${ptsPerUsd(cpp)} pts/$` : "—"}
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
