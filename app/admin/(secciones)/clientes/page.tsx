"use client"

import { useEffect, useState } from "react"
import { Building2, Check, Edit2, Info, Plus } from "lucide-react"
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
import { clientPacks, clientPpdLimits } from "@/lib/domain/pricing"
import type { ClientAdminRow } from "@/lib/domain/types"

/** Puntos que recibe el cliente por cada dólar (inverso del precio por punto). */
const ptsPerUsd = (usdPerPoint: number) =>
  usdPerPoint > 0 ? new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(1 / usdPerPoint) : "—"

export default function AdminClientesPage() {
  const { settings, clients, setClients, products, providers, publicPacks } = useAdminSettings()
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
  const [usdPerPoint, setUsdPerPoint] = useState("")
  const [active, setActive] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleOpenCreate = () => {
    setEditingClient(null)
    setName("")
    // Misma tarifa que el Canjeador General (Nosotros la baja con la barra)
    setUsdPerPoint(String(Number((1 / limits.min).toPrecision(6))))
    setActive(true)
    setDialogOpen(true)
  }

  const handleOpenEdit = (client: ClientAdminRow) => {
    setEditingClient(client)
    setName(client.name)
    setUsdPerPoint(String(Number(client.usdPerPoint.toPrecision(6))))
    setActive(client.active)
    setDialogOpen(true)
  }

  const parsedUsdPerPoint = parseFloat(usdPerPoint) || 1 / limits.min
  const candidateClient: ClientAdminRow = {
    id: editingClient?.id ?? "c-temp",
    name: name.trim() || (editingClient?.name ?? "Cliente Temporal"),
    usdPerPoint: parsedUsdPerPoint,
    bonusPct: editingClient?.bonusPct ?? 0.0085,
    bagPoints: editingClient?.bagPoints ?? 0,
    active,
  }
  const hasErrors = !name.trim() || parsedUsdPerPoint <= 0

  // Los tramos son los del Canjeador General, con la tarifa de este Cliente
  const generalPacks = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)
  const tramos = clientPacks(candidateClient, publicPacks)

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
            Tarifas por punto y bolsas corporativas
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
              Tarifa de punto del Cliente y estado comercial.
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
                        setUsdPerPoint(String(Number((1 / clampedV).toPrecision(6))))
                      }}
                    />
                    <span className="text-[11px] font-normal text-muted-foreground">
                      ({formatUsdPerPoint(parsedUsdPerPoint)} por punto)
                    </span>
                  </span>
                </div>
                {(() => {
                  // Barra en puntos por dólar con referencia de $10 (pasos de 1 para $10 = 0,1 pts/$)
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
                })()}
                <p className="text-xs text-muted-foreground">
                  Valor de referencia para convertir bono en puntos.
                </p>
              </div>
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

            {/* Tramos del Cliente: solo lectura, con los puntos del Canjeador General */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <h4 className="text-sm font-semibold text-foreground">
                Tramos del Cliente (mismos puntos que el Canjeador General)
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Puntos</TableHead>
                    <TableHead className="text-right">Canjeador General (USD)</TableHead>
                    <TableHead className="text-right">Este Cliente (USD)</TableHead>
                    <TableHead className="text-right">Ahorro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tramos.map((p, i) => {
                    const general = generalPacks[i].usdCents
                    const ahorro = (general - p.usdCents) / general
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="tabular-nums">{formatPts(p.points)} pts</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(general)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatUsd(p.usdCents)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {ahorro > 0 ? formatPct(ahorro) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Los tramos son los del Canjeador General; cambian solos si cambian esos paquetes. &apos;A medida&apos; usa esta misma tarifa.
              </p>
            </div>

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
