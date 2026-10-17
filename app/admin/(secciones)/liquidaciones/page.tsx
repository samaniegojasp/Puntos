"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Download,
  FileCheck,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import KpiCard from "@/components/panel/kpi-card"
import { MOCK_SETTLEMENTS } from "@/lib/mock/data"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { formatUsd } from "@/lib/domain/format"
import { downloadCsv } from "@/lib/domain/csv"
import type { Settlement, SettlementStatus } from "@/lib/domain/types"

const SETTLEMENT_STATUS_MAP: Record<SettlementStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-900" },
  invoiced: { label: "Facturada", className: "border-sky-200 bg-sky-50 text-sky-800" },
  paid: { label: "Pagada", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-")
  if (!year || !month) return period
  const date = new Date(Number(year), Number(month) - 1, 1)
  const s = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AdminLiquidacionesPage() {
  const { providers } = useAdminSettings()
  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState<Settlement[]>(MOCK_SETTLEMENTS)

  // Filtros
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal para marcar como facturada
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [targetForInvoice, setTargetForInvoice] = useState<Settlement | null>(null)
  const [invoiceRefInput, setInvoiceRefInput] = useState("")
  const [invoiceRefError, setInvoiceRefError] = useState<string | null>(null)

  // AlertDialog para marcar como pagada
  const [payAlertOpen, setPayAlertOpen] = useState(false)
  const [targetForPay, setTargetForPay] = useState<Settlement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  // Recálculo dinámico de KPIs según el estado local
  const totalPendingCents = settlements
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.amountCents, 0)

  const totalInvoicedCents = settlements
    .filter((s) => s.status === "invoiced")
    .reduce((sum, s) => sum + s.amountCents, 0)

  const totalPaidCents = settlements
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.amountCents, 0)

  // Filtrado de liquidaciones
  const filteredSettlements = settlements.filter((s) => {
    const matchesProvider = providerFilter === "all" || s.providerId === providerFilter
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesProvider && matchesStatus
  })

  // Acción: Abrir modal de facturación
  const handleOpenInvoiceModal = (s: Settlement) => {
    setTargetForInvoice(s)
    setInvoiceRefInput("")
    setInvoiceRefError(null)
    setInvoiceDialogOpen(true)
  }

  const handleConfirmInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetForInvoice) return

    const trimmed = invoiceRefInput.trim()
    if (!trimmed) {
      setInvoiceRefError("La referencia de factura es obligatoria.")
      return
    }

    setSettlements((prev) =>
      prev.map((s) =>
        s.id === targetForInvoice.id
          ? { ...s, status: "invoiced", invoiceRef: trimmed }
          : s
      )
    )

    toast.success(`Liquidación ${targetForInvoice.providerName} marcada como facturada`)
    setInvoiceDialogOpen(false)
  }

  // Acción: Abrir confirmación de pago
  const handleOpenPayAlert = (s: Settlement) => {
    setTargetForPay(s)
    setPayAlertOpen(true)
  }

  const handleConfirmPay = () => {
    if (!targetForPay) return

    setSettlements((prev) =>
      prev.map((s) =>
        s.id === targetForPay.id
          ? { ...s, status: "paid" }
          : s
      )
    )

    toast.success(`Liquidación ${targetForPay.providerName} marcada como pagada`)
    setPayAlertOpen(false)
  }

  // Descargar CSV
  const handleDownloadCsv = () => {
    const headers = [
      "Proveedor",
      "Periodo",
      "Consumos",
      "Monto",
      "Estado",
      "Referencia de factura",
    ]
    const rows = filteredSettlements.map((s) => [
      s.providerName,
      formatPeriod(s.period),
      s.consumptions,
      formatUsd(s.amountCents),
      SETTLEMENT_STATUS_MAP[s.status].label,
      s.invoiceRef ?? "—",
    ])
    downloadCsv("liquidaciones-globales.csv", headers, rows)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Liquidaciones a marcas</h2>
          <p className="text-sm text-muted-foreground">
            Control de periodos mensuales, estado de facturación y pagos de tarjetas
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadCsv} disabled={filteredSettlements.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Descargar CSV
        </Button>
      </div>

      {/* 3 KpiCards: Total Pendiente, Total Facturado, Total Pagado */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total pendiente"
          value={formatUsd(totalPendingCents)}
          hint="Consumos listos para facturar"
        />
        <KpiCard
          label="Total facturado"
          value={formatUsd(totalInvoicedCents)}
          hint="Facturas recibidas por pagar"
        />
        <KpiCard
          label="Total pagado"
          value={formatUsd(totalPaidCents)}
          hint="Transferencias completadas"
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Periodos de liquidación</CardTitle>
              <CardDescription>
                Se te paga por cada consumo registrado en Caja, liquidado cada mes.
              </CardDescription>
            </div>

            {/* Filtros por proveedor y estado */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="invoiced">Facturada</SelectItem>
                  <SelectItem value="paid">Pagada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSettlements.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold">No se encontraron liquidaciones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No hay registros que coincidan con los filtros seleccionados.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setProviderFilter("all")
                  setStatusFilter("all")
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Consumos</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Referencia de factura</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettlements.map((s) => {
                    const statusInfo = SETTLEMENT_STATUS_MAP[s.status]

                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-foreground">
                          {s.providerName}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatPeriod(s.period)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {s.consumptions}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {formatUsd(s.amountCents)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {s.invoiceRef ? s.invoiceRef : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInvoiceModal(s)}
                            >
                              <FileCheck className="mr-1 h-3.5 w-3.5" /> Facturar
                            </Button>
                          )}
                          {s.status === "invoiced" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenPayAlert(s)}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Marcar pagada
                            </Button>
                          )}
                          {s.status === "paid" && (
                            <span className="text-xs text-muted-foreground font-mono">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Marcar como Facturada */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar liquidación como facturada</DialogTitle>
            <DialogDescription>
              {targetForInvoice?.providerName} · Periodo {targetForInvoice && formatPeriod(targetForInvoice.period)} ({targetForInvoice && formatUsd(targetForInvoice.amountCents)})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmInvoice} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invoiceRef">Referencia de factura (obligatoria)</Label>
              <Input
                id="invoiceRef"
                placeholder="Ej. FAC-2026-0045"
                value={invoiceRefInput}
                onChange={(e) => {
                  setInvoiceRefInput(e.target.value)
                  setInvoiceRefError(null)
                }}
                className={invoiceRefError ? "border-destructive focus-visible:ring-destructive" : ""}
                required
              />
              {invoiceRefError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {invoiceRefError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar factura
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Marcar como Pagada */}
      <AlertDialog open={payAlertOpen} onOpenChange={setPayAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar pago de liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmar que la liquidación de {targetForPay?.providerName} ({targetForPay && formatPeriod(targetForPay.period)}) por {targetForPay && formatUsd(targetForPay.amountCents)} ha sido pagada? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" onClick={handleConfirmPay}>
              Confirmar pago
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
