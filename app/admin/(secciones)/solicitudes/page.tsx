"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { GiftCardFace } from "@/components/gift-card"
import { useCatalog } from "@/lib/catalog-store"
import { type Store } from "@/lib/catalog"
import { formatDate, formatPct, formatPts, formatUsd } from "@/lib/domain/format"
import {
  marginAtPack,
  productPoints,
  productTotalCostCents,
  referenceCentsPerPoint,
} from "@/lib/domain/pricing"
import {
  type CardRequest,
  type CardRequestStatus,
  type PricingContext,
  incompatibleDenoms,
  pricingErrorsFor,
  providerSafeMessage,
  requestToProducts,
  slugify,
  uniqueStoreId,
} from "@/lib/domain/card-requests"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import type { Product, Provider } from "@/lib/domain/types"

type FilterKey = "submitted" | "approved" | "rejected" | "all"

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "submitted", label: "En revisión" },
  { id: "approved", label: "Aprobadas" },
  { id: "rejected", label: "Rechazadas" },
  { id: "all", label: "Todas" },
]

function StatusBadge({ status }: { status: CardRequestStatus }) {
  if (status === "submitted") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      >
        <Clock className="h-3 w-3" /> En revisión
      </Badge>
    )
  }
  if (status === "approved") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2 className="h-3 w-3" /> Aprobada
      </Badge>
    )
  }
  if (status === "rejected") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-destructive/30 bg-destructive/10 text-destructive"
      >
        <XCircle className="h-3 w-3" /> Rechazada
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Borrador
    </Badge>
  )
}

export default function AdminSolicitudesPage() {
  const [loading, setLoading] = useState(true)
  const {
    cardRequests,
    setCardRequests,
    settings,
    providers,
    products,
    setProducts,
    standardPacks,
    publicPacks,
    clients,
  } = useAdminSettings()
  const { allStores, saveStore } = useCatalog()

  const [filter, setFilter] = useState<FilterKey>("submitted")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<CardRequest | null>(null)
  const [selectedDenoms, setSelectedDenoms] = useState<number[]>([])
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReasonInput, setRejectReasonInput] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const providerOf = (id: string): Provider =>
    providers.find((p) => p.id === id) ?? {
      id,
      name: id,
      discountPct: 0,
      cardValidDays: 180,
      active: true,
    }

  const pricingCtx: PricingContext = {
    settings,
    providers,
    products,
    standardPacks,
    publicPacks,
    clients,
  }

  // Los borradores no se muestran en administración: son privados del Proveedor
  const nonDraftRequests = useMemo(
    () => cardRequests.filter((r) => r.status !== "draft"),
    [cardRequests]
  )

  const countSubmitted = nonDraftRequests.filter((r) => r.status === "submitted").length
  const countApproved = nonDraftRequests.filter((r) => r.status === "approved").length
  const countRejected = nonDraftRequests.filter((r) => r.status === "rejected").length
  const countAll = nonDraftRequests.length

  const filteredRequests = useMemo(() => {
    if (filter === "all") return nonDraftRequests
    return nonDraftRequests.filter((r) => r.status === filter)
  }, [nonDraftRequests, filter])

  function handleOpenReview(req: CardRequest) {
    setSelectedRequest(req)
    setSelectedDenoms([...req.denoms])
    setIsRejecting(false)
    setRejectReasonInput("")
    setDialogOpen(true)
  }

  // Comprueba si el nombre ya existe en el catálogo (comparando sin tildes ni mayúsculas)
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLowerCase()

  const nameExistsInCatalog = useMemo(() => {
    if (!selectedRequest) return false
    const target = normalize(selectedRequest.name)
    return allStores.some((s) => normalize(s.name) === target)
  }, [selectedRequest, allStores])

  // Errores de reglas de precios con los valores marcados
  const pricingIssues = useMemo(() => {
    if (!selectedRequest || selectedDenoms.length === 0) return []
    const testProducts = requestToProducts(
      selectedRequest,
      selectedDenoms,
      selectedRequest.providerId
    )
    return pricingErrorsFor(pricingCtx, [...products, ...testProducts])
  }, [selectedRequest, selectedDenoms, pricingCtx, products])

  const cannotApprove =
    selectedDenoms.length === 0 || nameExistsInCatalog || pricingIssues.length > 0

  function handleApprove() {
    if (!selectedRequest || cannotApprove) return
    const sortedMarcados = [...selectedDenoms].sort((a, b) => a - b)
    const id = uniqueStoreId(
      slugify(selectedRequest.name),
      allStores.map((s) => s.id)
    )

    const saved = saveStore({
      id,
      name: selectedRequest.name,
      category: selectedRequest.category,
      theme: selectedRequest.theme,
      denoms: sortedMarcados,
      description: selectedRequest.description,
      featured: false,
      active: true,
      ...(selectedRequest.logo ? { logo: selectedRequest.logo } : {}),
      ...(selectedRequest.colors ? { colors: selectedRequest.colors } : {}),
      ...(selectedRequest.image ? { image: selectedRequest.image } : {}),
    })

    if (!saved) {
      toast.error("No se pudo guardar la tarjeta (almacenamiento lleno).")
      return
    }

    const newProducts = requestToProducts(
      selectedRequest,
      sortedMarcados,
      selectedRequest.providerId
    )
    setProducts((prev) => [...prev, ...newProducts])

    const now = new Date().toISOString()
    setCardRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id
          ? {
              ...r,
              denoms: sortedMarcados,
              status: "approved",
              reviewedAt: now,
              approvedStoreId: id,
            }
          : r
      )
    )

    toast.success("Tarjeta publicada en el catálogo")
    setDialogOpen(false)
  }

  function handleStartReject() {
    if (!selectedRequest) return
    const incompat = incompatibleDenoms(pricingCtx, selectedRequest, selectedRequest.providerId)
    const safeMsg = providerSafeMessage(incompat)
    setRejectReasonInput(safeMsg ?? "")
    setIsRejecting(true)
  }

  function handleConfirmReject() {
    if (!selectedRequest) return
    const reason = rejectReasonInput.trim()
    if (!reason) {
      toast.error("Debes ingresar un motivo de rechazo.")
      return
    }
    if (reason.length > 300) {
      toast.error("El motivo no puede superar los 300 caracteres.")
      return
    }

    const now = new Date().toISOString()
    setCardRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id
          ? {
              ...r,
              status: "rejected",
              rejectReason: reason,
              reviewedAt: now,
            }
          : r
      )
    )

    toast.success("Solicitud rechazada")
    setDialogOpen(false)
  }

  // Tablas de paquetes para las columnas de márgenes (tramo más pequeño de cada tabla)
  const clientTables = clients
    .filter((c) => c.customPacks && c.customPacks.length > 0)
    .map((c) => ({
      who: c.name,
      smallestPack: [...c.customPacks].sort((a, b) => a.usdCents - b.usdCents)[0],
    }))

  const tablesWithSmallest = [
    {
      who: "Canjeador",
      smallestPack: [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0],
    },
    {
      who: "Estándar",
      smallestPack: [...standardPacks].sort((a, b) => a.usdCents - b.usdCents)[0],
    },
    ...clientTables,
  ].filter((t) => t.smallestPack != null)

  const emptyTextByFilter: Record<FilterKey, string> = {
    submitted: "No hay solicitudes en revisión",
    approved: "No hay solicitudes aprobadas",
    rejected: "No hay solicitudes rechazadas",
    all: "No hay solicitudes de tarjetas",
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Solicitudes de tarjetas</h2>
        <p className="text-sm text-muted-foreground">
          Tarjetas creadas por los Proveedores. Al aprobarlas se publican en el catálogo.
        </p>
      </div>

      {/* Filtros (botones tipo pestañas) */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === "submitted"
              ? countSubmitted
              : f.id === "approved"
              ? countApproved
              : f.id === "rejected"
              ? countRejected
              : countAll
          return (
            <Button
              key={f.id}
              variant={filter === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.id)}
            >
              {f.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Tabla de solicitudes */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {emptyTextByFilter[filter]}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Tarjeta</TableHead>
                <TableHead>Valores</TableHead>
                <TableHead>Enviada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => {
                const provider = providerOf(req.providerId)
                const cardStore: Store = {
                  id: "row-store",
                  name: req.name,
                  category: req.category,
                  theme: req.theme,
                  denoms: req.denoms.length > 0 ? req.denoms : [10],
                  description: req.description,
                  ...(req.colors ? { colors: req.colors } : {}),
                  ...(req.logo ? { logo: req.logo } : {}),
                  ...(req.image ? { image: req.image } : {}),
                }

                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium text-foreground">
                      {provider.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <GiftCardFace
                          store={cardStore}
                          usd={req.denoms[0] ?? 0}
                          compact
                          className="w-20 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{req.name}</p>
                          <p className="text-xs text-muted-foreground">{req.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {req.denoms.map((d) => `$${d}`).join(" · ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(req.submittedAt ?? req.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReview(req)}
                      >
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo de revisión */}
      {selectedRequest && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRequest.status === "submitted"
                  ? "Revisar solicitud de tarjeta"
                  : selectedRequest.status === "approved"
                  ? "Solicitud aprobada"
                  : "Solicitud rechazada"}
              </DialogTitle>
              <DialogDescription>
                Detalles de la tarjeta y verificación de reglas de precios.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Vista previa y datos generales */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center justify-center">
                  <GiftCardFace
                    store={{
                      id: "preview-dialog",
                      name: selectedRequest.name,
                      category: selectedRequest.category,
                      theme: selectedRequest.theme,
                      denoms:
                        selectedDenoms.length > 0
                          ? selectedDenoms
                          : selectedRequest.denoms,
                      description: selectedRequest.description,
                      ...(selectedRequest.colors ? { colors: selectedRequest.colors } : {}),
                      ...(selectedRequest.logo ? { logo: selectedRequest.logo } : {}),
                      ...(selectedRequest.image ? { image: selectedRequest.image } : {}),
                    }}
                    usd={selectedDenoms[0] ?? selectedRequest.denoms[0] ?? 20}
                    className="w-48 sm:w-56"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedRequest.name}
                    </h3>
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedRequest.category}</p>
                  <p className="text-xs text-foreground">
                    {selectedRequest.description || "Sin descripción"}
                  </p>
                  <div className="border-t pt-2 text-xs space-y-1">
                    <p>
                      <span className="font-semibold text-muted-foreground">Proveedor: </span>
                      <span className="font-medium text-foreground">
                        {providerOf(selectedRequest.providerId).name}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-muted-foreground">Descuento acordado: </span>
                      <span className="font-medium text-foreground">
                        {formatPct(providerOf(selectedRequest.providerId).discountPct)}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-muted-foreground">Fecha de envío: </span>
                      <span className="text-muted-foreground">
                        {formatDate(selectedRequest.submittedAt ?? selectedRequest.createdAt)}
                      </span>
                    </p>
                  </div>

                  {selectedRequest.status === "approved" && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                      <p className="font-semibold">Publicada en el catálogo</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/admin">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Ver en Catálogo
                        </Link>
                      </Button>
                    </div>
                  )}

                  {selectedRequest.status === "rejected" && selectedRequest.rejectReason && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                      <p className="font-semibold">Motivo del rechazo:</p>
                      <p>{selectedRequest.rejectReason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contenido interactivo solo para "submitted" */}
              {selectedRequest.status === "submitted" && (
                <>
                  {/* Selección de valores */}
                  <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Valores a aprobar (desmarcar excluye el valor de la aprobación)
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      {selectedRequest.denoms.map((d) => {
                        const checked = selectedDenoms.includes(d)
                        return (
                          <label
                            key={d}
                            className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                if (c) {
                                  setSelectedDenoms((prev) =>
                                    [...prev, d].sort((a, b) => a - b)
                                  )
                                } else {
                                  setSelectedDenoms((prev) => prev.filter((v) => v !== d))
                                }
                              }}
                            />
                            <span>${d}</span>
                          </label>
                        )
                      })}
                    </div>
                    {selectedDenoms.length === 0 && (
                      <p className="text-xs font-medium text-destructive">
                        Debes marcar al menos un valor para aprobar.
                      </p>
                    )}
                  </div>

                  {/* Tabla de vista previa de precios y márgenes */}
                  {selectedDenoms.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Vista previa de precios y márgenes (solo visible para administración)
                        </Label>
                      </div>

                      <div className="overflow-x-auto rounded-lg border bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">Facial</TableHead>
                              <TableHead className="text-right">Costo total</TableHead>
                              <TableHead className="text-right font-bold text-primary">
                                Puntos
                              </TableHead>
                              {tablesWithSmallest.map((t) => (
                                <TableHead key={t.who} className="text-right">
                                  {t.who} ({formatUsd(t.smallestPack.usdCents)})
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...selectedDenoms]
                              .sort((a, b) => a - b)
                              .map((usd) => {
                                const provider = providerOf(selectedRequest.providerId)
                                const faceCents = usd * 100
                                const prod: Product = {
                                  id: `pr-preview-${usd}`,
                                  storeId: "preview",
                                  storeName: selectedRequest.name,
                                  providerId: selectedRequest.providerId,
                                  faceCents,
                                  shippingCents: 0,
                                  active: true,
                                }
                                const costCents = productTotalCostCents(prod, provider)
                                const refCents = referenceCentsPerPoint(publicPacks)
                                const pts = productPoints(prod, settings, refCents)

                                return (
                                  <TableRow key={usd}>
                                    <TableCell className="text-right font-mono text-xs">
                                      {formatUsd(faceCents)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                      {formatUsd(costCents)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-primary">
                                      {formatPts(pts)} pts
                                    </TableCell>
                                    {tablesWithSmallest.map((t) => {
                                      const m = marginAtPack(pts, t.smallestPack, costCents)
                                      const isBelow = m.marginPct < settings.minMarginPct
                                      return (
                                        <TableCell
                                          key={t.who}
                                          className={`text-right font-mono text-xs ${
                                            isBelow
                                              ? "font-bold text-destructive"
                                              : "text-muted-foreground"
                                          }`}
                                          title={`Margen en ${t.who}: ${formatPct(m.marginPct)}`}
                                        >
                                          {formatPct(m.marginPct)}
                                        </TableCell>
                                      )
                                    })}
                                  </TableRow>
                                )
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Evaluación de reglas de precios */}
                  {pricingIssues.length > 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Esta aprobación rompe reglas de precios</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                          {pricingIssues.map((issue, idx) => (
                            <li key={idx}>{issue.message}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>Cumple todas las reglas de precios</span>
                    </div>
                  )}

                  {/* Alerta si el nombre ya existe en el catálogo */}
                  {nameExistsInCatalog && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Nombre duplicado en el catálogo</AlertTitle>
                      <AlertDescription className="text-xs">
                        Ya existe una tarjeta en el catálogo con el nombre &quot;
                        {selectedRequest.name}&quot;. No se puede aprobar.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Sección para rechazar */}
                  {isRejecting && (
                    <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div>
                        <Label
                          htmlFor="reject-reason"
                          className="text-sm font-semibold text-destructive"
                        >
                          Motivo para el Proveedor (obligatorio)
                        </Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          El Proveedor verá este texto. No incluyas precios, márgenes ni reglas.
                        </p>
                      </div>
                      <Textarea
                        id="reject-reason"
                        value={rejectReasonInput}
                        onChange={(e) => setRejectReasonInput(e.target.value.slice(0, 300))}
                        placeholder="Explica qué debe corregir el Proveedor..."
                        rows={3}
                        className="bg-background text-sm"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Máximo 300 caracteres</span>
                        <span
                          className={
                            rejectReasonInput.length >= 300 ? "font-bold text-destructive" : ""
                          }
                        >
                          {rejectReasonInput.length}/300
                        </span>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRejecting(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={
                            !rejectReasonInput.trim() || rejectReasonInput.length > 300
                          }
                          onClick={handleConfirmReject}
                        >
                          Confirmar rechazo
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cerrar
              </Button>

              {selectedRequest.status === "submitted" && !isRejecting && (
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleStartReject}>
                    Rechazar
                  </Button>
                  <Button disabled={cannotApprove} onClick={handleApprove}>
                    Aprobar y publicar
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
