"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, Eye, FileEdit, FileText, Plus, Send, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { GiftCardFace } from "@/components/gift-card"
import { DenomsEditor } from "@/components/panel/denoms-editor"
import { CardDesignEditor } from "@/components/panel/card-design-editor"
import { useCatalog } from "@/lib/catalog-store"
import { type Store, type ThemeKey } from "@/lib/catalog"
import { formatDate } from "@/lib/domain/format"
import {
  type CardRequest,
  type CardRequestStatus,
  validateCardRequestDraft,
} from "@/lib/domain/card-requests"
import { useAdminSettings, useCurrentProvider } from "@/lib/mock/admin-settings"

type RequestDraft = {
  id?: string
  name: string
  category: string
  description: string
  theme: ThemeKey
  colors?: { from: string; to: string }
  logo?: string
  image?: string
  denoms: number[]
}

const EMPTY_DRAFT: RequestDraft = {
  name: "",
  category: "",
  description: "",
  theme: "super",
  denoms: [10, 25, 50],
}

export default function ProveedorCatalogoPage() {
  const [loading, setLoading] = useState(true)
  const { providerId } = useCurrentProvider()
  const {
    cardRequests,
    setCardRequests,
    settings,
  } = useAdminSettings()
  const { allStores } = useCatalog()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<CardRequest | null>(null)
  const [draft, setDraft] = useState<RequestDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const min = settings.cardDenomMinUsd ?? 5
  const max = settings.cardDenomMaxUsd ?? 500
  const categories = Array.from(new Set(allStores.map((s) => s.category)))

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const myRequests = cardRequests.filter((r) => r.providerId === providerId)
  const countDraft = myRequests.filter((r) => r.status === "draft").length
  const countSubmitted = myRequests.filter((r) => r.status === "submitted").length
  const countApproved = myRequests.filter((r) => r.status === "approved").length
  const countRejected = myRequests.filter((r) => r.status === "rejected").length

  function openCreateDialog() {
    setEditingRequest(null)
    setDraft({ ...EMPTY_DRAFT, denoms: [10, 25, 50] })
    setErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(req: CardRequest) {
    setEditingRequest(req)
    setDraft({
      id: req.id,
      name: req.name,
      category: req.category,
      description: req.description,
      theme: req.theme,
      colors: req.colors ? { ...req.colors } : undefined,
      logo: req.logo,
      image: req.image,
      denoms: [...req.denoms],
    })
    setErrors({})
    setDialogOpen(true)
  }

  function handleDelete(req: CardRequest) {
    if (!window.confirm(`¿Eliminar la tarjeta "${req.name}"?`)) return
    setCardRequests((prev) => prev.filter((r) => r.id !== req.id))
    toast.success("Tarjeta eliminada")
  }

  function handleSubmitFromList(req: CardRequest) {
    const existingNames = [
      ...allStores.map((s) => s.name),
      ...cardRequests.filter((r) => r.id !== req.id).map((r) => r.name),
    ]
    const errs = validateCardRequestDraft(req, { min, max, existingNames })
    if (Object.keys(errs).length > 0) {
      openEditDialog(req)
      setErrors(errs)
      return
    }

    if (!window.confirm("Al enviarla, Regala la revisará. No podrás editarla mientras esté en revisión.")) {
      return
    }

    const now = new Date().toISOString()
    setCardRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: "submitted" as CardRequestStatus,
              submittedAt: now,
              rejectReason: undefined,
            }
          : r
      )
    )
    toast.success("Solicitud enviada a revisión")
  }

  function handleSaveDraft() {
    const existingNames = [
      ...allStores.map((s) => s.name),
      ...cardRequests.filter((r) => r.id !== editingRequest?.id).map((r) => r.name),
    ]
    const errs = validateCardRequestDraft(draft, { min, max, existingNames })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const now = new Date().toISOString()
    const sortedDenoms = [...draft.denoms].sort((a, b) => a - b)

    if (editingRequest) {
      setCardRequests((prev) =>
        prev.map((r) =>
          r.id === editingRequest.id
            ? {
                ...r,
                name: draft.name.trim(),
                category: draft.category.trim(),
                description: draft.description.trim(),
                theme: draft.theme,
                colors: draft.colors,
                logo: draft.logo,
                image: draft.image,
                denoms: sortedDenoms,
                status: "draft",
              }
            : r
        )
      )
    } else {
      const newReq: CardRequest = {
        id: `cr-${Date.now()}`,
        providerId,
        name: draft.name.trim(),
        category: draft.category.trim(),
        description: draft.description.trim(),
        theme: draft.theme,
        colors: draft.colors,
        logo: draft.logo,
        image: draft.image,
        denoms: sortedDenoms,
        status: "draft",
        createdAt: now,
      }
      setCardRequests((prev) => [...prev, newReq])
    }

    toast.success("Borrador guardado")
    setDialogOpen(false)
  }

  function handleSaveAndSubmit() {
    const existingNames = [
      ...allStores.map((s) => s.name),
      ...cardRequests.filter((r) => r.id !== editingRequest?.id).map((r) => r.name),
    ]
    const errs = validateCardRequestDraft(draft, { min, max, existingNames })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const now = new Date().toISOString()
    const sortedDenoms = [...draft.denoms].sort((a, b) => a - b)

    if (!window.confirm("Al enviarla, Regala la revisará. No podrás editarla mientras esté en revisión.")) {
      return
    }

    if (editingRequest) {
      setCardRequests((prev) =>
        prev.map((r) =>
          r.id === editingRequest.id
            ? {
                ...r,
                name: draft.name.trim(),
                category: draft.category.trim(),
                description: draft.description.trim(),
                theme: draft.theme,
                colors: draft.colors,
                logo: draft.logo,
                image: draft.image,
                denoms: sortedDenoms,
                status: "submitted",
                submittedAt: now,
                rejectReason: undefined,
              }
            : r
        )
      )
    } else {
      const newReq: CardRequest = {
        id: `cr-${Date.now()}`,
        providerId,
        name: draft.name.trim(),
        category: draft.category.trim(),
        description: draft.description.trim(),
        theme: draft.theme,
        colors: draft.colors,
        logo: draft.logo,
        image: draft.image,
        denoms: sortedDenoms,
        status: "submitted",
        createdAt: now,
        submittedAt: now,
      }
      setCardRequests((prev) => [...prev, newReq])
    }

    toast.success("Solicitud enviada a revisión")
    setDialogOpen(false)
  }

  const isReadOnly =
    editingRequest?.status === "submitted" || editingRequest?.status === "approved"

  const previewStore: Store = {
    id: "x",
    name: draft.name.trim() || "Nombre de la tarjeta",
    category: draft.category.trim() || "Categoría",
    theme: draft.theme,
    denoms: draft.denoms.length > 0 ? [...draft.denoms].sort((a, b) => a - b) : [10],
    description: draft.description,
    ...(draft.colors ? { colors: draft.colors } : {}),
    ...(draft.logo ? { logo: draft.logo } : {}),
    ...(draft.image ? { image: draft.image } : {}),
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Catálogo de tus tarjetas</h2>
          <p className="text-sm text-muted-foreground">
            Crea tus tarjetas y envíalas a Regala para su aprobación. Cuando se aprueban, aparecen en la tienda.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nueva tarjeta
        </Button>
      </div>

      {/* 4 contadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Borradores</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{countDraft}</div>
          </CardContent>
        </Card>

        <Card className="p-3 sm:p-4">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>En revisión</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{countSubmitted}</div>
          </CardContent>
        </Card>

        <Card className="p-3 sm:p-4">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Aprobadas</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{countApproved}</div>
          </CardContent>
        </Card>

        <Card className="p-3 sm:p-4">
          <CardHeader className="p-0">
            <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Rechazadas</span>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{countRejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de tarjetas */}
      {myRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Aún no has creado tarjetas
        </div>
      ) : (
        <ul className="space-y-3">
          {myRequests.map((req) => {
            const cardStore: Store = {
              id: "x",
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
              <li
                key={req.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors sm:flex-row sm:items-center"
              >
                <div className="flex shrink-0 items-center justify-center">
                  <GiftCardFace
                    store={cardStore}
                    usd={req.denoms[0] ?? 0}
                    compact
                    className="w-28 shrink-0"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{req.name}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{req.category}</p>
                  <p className="text-xs font-medium text-foreground">
                    {req.denoms.map((d) => `$${d}`).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>

                  {req.status === "rejected" && req.rejectReason && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                      <span className="font-semibold">Motivo: </span>
                      {req.rejectReason}
                    </div>
                  )}

                  {req.status === "approved" && (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Publicada en el catálogo
                    </p>
                  )}

                  {req.status === "submitted" && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Esperando la revisión de Regala
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  {(req.status === "draft" || req.status === "rejected") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(req)}
                      >
                        <FileEdit className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitFromList(req)}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Enviar a revisión
                      </Button>
                    </>
                  )}

                  {req.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(req)}
                      aria-label={`Eliminar ${req.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {(req.status === "submitted" || req.status === "approved") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(req)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Diálogo / Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {isReadOnly
                ? editingRequest?.status === "approved"
                  ? "Tarjeta aprobada"
                  : "Tarjeta en revisión"
                : editingRequest
                  ? "Editar tarjeta"
                  : "Nueva tarjeta"}
            </DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? "Esta tarjeta está en modo solo lectura mientras esté en revisión o publicada."
                : "Llena los datos de tu tarjeta. Regala revisará la solicitud antes de publicarla en el catálogo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Vista previa */}
            <div className="flex justify-center">
              <div className="w-full max-w-xs sm:max-w-sm">
                <GiftCardFace store={previewStore} usd={draft.denoms[0] ?? 0} className="w-full" />
              </div>
            </div>


            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="req-name">Nombre</Label>
              <Input
                id="req-name"
                value={draft.name}
                maxLength={40}
                disabled={isReadOnly}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ej. Fybeca Bienestar"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="req-category">Categoría</Label>
              <Input
                id="req-category"
                list="categorias-proveedor"
                value={draft.category}
                maxLength={30}
                disabled={isReadOnly}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="Selecciona o escribe una categoría"
              />
              <datalist id="categorias-proveedor">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="req-description">Descripción</Label>
              <Input
                id="req-description"
                value={draft.description}
                maxLength={120}
                disabled={isReadOnly}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Breve descripción de la tarjeta (hasta 120 caracteres)"
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            {/* Valores en USD */}
            <DenomsEditor
              value={draft.denoms}
              onChange={(next) => setDraft((d) => ({ ...d, denoms: next }))}
              min={min}
              max={max}
              error={errors.denoms}
              disabled={isReadOnly}
            />

            {/* Diseño: Imagen, Logo, Color */}
            <CardDesignEditor
              value={{
                theme: draft.theme,
                colors: draft.colors ?? null,
                logo: draft.logo ?? null,
                image: draft.image ?? null,
              }}
              onChange={(patch) =>
                setDraft((d) => ({
                  ...d,
                  ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
                  ...(patch.colors !== undefined ? { colors: patch.colors ?? undefined } : {}),
                  ...(patch.logo !== undefined ? { logo: patch.logo ?? undefined } : {}),
                  ...(patch.image !== undefined ? { image: patch.image ?? undefined } : {}),
                }))
              }
              resetKey={editingRequest?.id ?? "nueva"}
              disabled={isReadOnly}
            />
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isReadOnly ? (
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                  Guardar borrador
                </Button>
                <Button type="button" onClick={handleSaveAndSubmit}>
                  Guardar y enviar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: CardRequestStatus }) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Borrador</Badge>
    case "submitted":
      return (
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
          En revisión
        </Badge>
      )
    case "approved":
      return (
        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
          Aprobada
        </Badge>
      )
    case "rejected":
      return <Badge variant="destructive">Rechazada</Badge>
  }
}
