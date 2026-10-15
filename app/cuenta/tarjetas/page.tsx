"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  History,
  QrCode,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  AlertCircle,
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import StatusBadge from "@/components/panel/status-badge"
import { MOCK_CARDS, MOCK_NOW } from "@/lib/mock/data"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import {
  formatDate,
  formatDateTime,
  formatPct,
  formatPts,
  formatUsd,
} from "@/lib/domain/format"
import { exchangePreview } from "@/lib/domain/pricing"
import type { CardMovementType, CardStatus, GiftCard } from "@/lib/domain/types"

const MOVEMENT_TYPE_LABEL: Record<CardMovementType, string> = {
  issue: "Emisión de tarjeta",
  consume: "Consumo en tienda",
  adjust: "Ajuste de saldo",
  expire: "Caducidad",
  exchange: "Cambio por puntos",
}

const FILTER_TABS: { key: "todas" | CardStatus; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "active", label: "Activas" },
  { key: "expired", label: "Caducadas" },
  { key: "consumed", label: "Consumidas" },
  { key: "exchanged", label: "Cambiadas" },
]

export default function CuentaTarjetasPage() {
  const { settings } = useAdminSettings()
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<GiftCard[]>(MOCK_CARDS)
  const [filter, setFilter] = useState<"todas" | CardStatus>("todas")

  // Estados interactivos por tarjeta
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modales
  const [qrCard, setQrCard] = useState<GiftCard | null>(null)
  const [movementsCard, setMovementsCard] = useState<GiftCard | null>(null)
  const [exchangingCard, setExchangingCard] = useState<GiftCard | null>(null)
  const [processingExchange, setProcessingExchange] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCopy = (card: GiftCard) => {
    navigator.clipboard
      .writeText(card.code)
      .then(() => {
        setCopiedId(card.id)
        toast.success("Código copiado al portapapeles")
        setTimeout(() => setCopiedId(null), 2000)
      })
      .catch(() => {
        toast.error("No se pudo copiar el código")
      })
  }

  const handleConfirmExchange = () => {
    if (!exchangingCard) return
    setProcessingExchange(true)

    // Regla 7: Simular 800 ms de procesamiento
    setTimeout(() => {
      const targetCard = exchangingCard
      const preview = exchangePreview(targetCard, settings, MOCK_NOW)

      if (preview.allowed) {
        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== targetCard.id) return c
            return {
              ...c,
              status: "exchanged",
              balanceCents: 0,
              movements: [
                ...c.movements,
                {
                  id: `m-ex-${Date.now()}`,
                  type: "exchange",
                  amountCents: targetCard.balanceCents,
                  at: MOCK_NOW.toISOString(),
                  note: `${formatPts(preview.pointsBack)} puntos devueltos (recargo ${formatPct(preview.feePct)})`,
                },
              ],
            }
          })
        )
        toast.success(`Tarjeta cambiada por ${formatPts(preview.pointsBack)} puntos`)
      }

      setProcessingExchange(false)
      setExchangingCard(null)
    }, 800)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const filteredCards = cards.filter((card) => {
    if (filter === "todas") return true
    return card.status === filter
  })

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key
          const count =
            tab.key === "todas"
              ? cards.length
              : cards.filter((c) => c.status === tab.key).length

          return (
            <Button
              key={tab.key}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => setFilter(tab.key)}
              className="h-8 rounded-full text-xs"
            >
              {tab.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Lista de Tarjetas */}
      {filteredCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-semibold">No encontramos tarjetas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "todas"
              ? "Aún no tienes tarjetas virtuales canjeadas."
              : `No tienes tarjetas con el estado "${FILTER_TABS.find((t) => t.key === filter)?.label.toLowerCase()}".`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {filter !== "todas" ? (
              <Button variant="outline" size="sm" onClick={() => setFilter("todas")}>
                Ver todas las tarjetas
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/shop">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Explorar gift cards
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => {
            const isRevealed = revealedIds.has(card.id)
            const isCopied = copiedId === card.id
            const diffMs = new Date(card.expiresAt).getTime() - MOCK_NOW.getTime()
            const diffDays = Math.ceil(diffMs / 86_400_000)
            const pct =
              card.faceCents > 0
                ? Math.round((card.balanceCents / card.faceCents) * 100)
                : 0

            // Vista previa del cambio por puntos
            const preview = exchangePreview(card, settings, MOCK_NOW)

            return (
              <Card key={card.id} className="flex flex-col justify-between overflow-hidden">
                <CardContent className="space-y-4 p-5">
                  {/* Encabezado: Tienda y Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground text-lg leading-tight">
                        {card.storeName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Valor facial: {formatUsd(card.faceCents)}
                      </p>
                    </div>
                    <StatusBadge status={card.status} />
                  </div>

                  {/* Saldo restante con barra */}
                  <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Saldo restante</span>
                      <span className="font-bold tabular-nums text-foreground">
                        {formatUsd(card.balanceCents)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{pct}% disponible</span>
                      <span>Total {formatUsd(card.faceCents)}</span>
                    </div>
                  </div>

                  {/* Caducidad */}
                  <div className="text-xs">
                    {diffDays > 0 ? (
                      <p className="text-muted-foreground">
                        Caduca en{" "}
                        <span className="font-medium text-foreground">
                          {diffDays} {diffDays === 1 ? "día" : "días"}
                        </span>{" "}
                        ({formatDate(card.expiresAt)})
                      </p>
                    ) : diffDays === 0 ? (
                      <p className="font-medium text-amber-700">
                        Caduca hoy ({formatDate(card.expiresAt)})
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Caducó hace{" "}
                        <span className="font-medium text-foreground">
                          {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? "día" : "días"}
                        </span>{" "}
                        ({formatDate(card.expiresAt)})
                      </p>
                    )}
                  </div>

                  {/* Código con Mostrar y Copiar */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Código digital
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm tracking-wider text-center">
                        {isRevealed ? card.code : "•••• •••• ••••"}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => toggleReveal(card.id)}
                        aria-label={isRevealed ? "Ocultar código" : "Mostrar código"}
                        title={isRevealed ? "Ocultar código" : "Mostrar código"}
                      >
                        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCopy(card)}
                        aria-label="Copiar código"
                        title="Copiar código"
                      >
                        {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Botones de acción secundaria: QR y Movimientos */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setQrCard(card)}
                    >
                      <QrCode className="mr-1.5 h-3.5 w-3.5" /> Ver QR
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setMovementsCard(card)}
                    >
                      <History className="mr-1.5 h-3.5 w-3.5" /> Movimientos
                    </Button>
                  </div>

                  {/* Sección de Tarjeta Caducada / Cambio por puntos */}
                  {card.status === "expired" && (
                    <div className="pt-2 border-t">
                      {preview.allowed ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Puedes cambiar el saldo restante ({formatUsd(card.balanceCents)}) por puntos.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs font-semibold"
                            onClick={() => setExchangingCard(card)}
                          >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Cambiar por puntos
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
                          {preview.reason === "window_closed" && (
                            <p className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> El plazo para cambiarla venció.
                            </p>
                          )}
                          {preview.reason === "no_balance" && (
                            <p className="text-muted-foreground">No tiene saldo para cambiar.</p>
                          )}
                          {preview.reason === "already_exchanged" && (
                            <p className="text-muted-foreground">Ya la cambiaste por puntos.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {card.status === "exchanged" && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Ya la cambiaste por puntos.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal: Ver QR */}
      <Dialog open={!!qrCard} onOpenChange={(open) => !open && setQrCard(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Código QR · {qrCard?.storeName}</DialogTitle>
            <DialogDescription>
              Muestra este código en caja al momento de pagar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-muted/30 p-6">
              <QrCode className="h-32 w-32 text-foreground/80" />
            </div>
            <p className="font-mono text-sm tracking-wider font-semibold text-foreground">
              {qrCard?.code}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              El QR real se activará más adelante.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Movimientos */}
      <Dialog open={!!movementsCard} onOpenChange={(open) => !open && setMovementsCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Movimientos de tarjeta</DialogTitle>
            <DialogDescription>
              {movementsCard?.storeName} · Código: {movementsCard?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {movementsCard?.movements.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Sin movimientos registrados.
              </p>
            ) : (
              movementsCard?.movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">
                      {MOVEMENT_TYPE_LABEL[m.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(m.at)}
                    </p>
                    {m.note && (
                      <p className="text-xs text-muted-foreground italic">
                        {m.note}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatUsd(m.amountCents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmación de Cambiar por puntos (Regla 7) */}
      <AlertDialog
        open={!!exchangingCard}
        onOpenChange={(open) => {
          if (!open && !processingExchange) setExchangingCard(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar tarjeta por puntos?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-2">
                {exchangingCard && (() => {
                  const preview = exchangePreview(exchangingCard, settings, MOCK_NOW)
                  if (!preview.allowed) return null

                  return (
                    <p>
                      Recibirás <strong className="text-foreground">{formatPts(preview.pointsBack)} puntos</strong>. Recargo:{" "}
                      {formatPts(preview.feePoints)} puntos ({formatPct(preview.feePct)}). Esta acción no se puede deshacer y la tarjeta no se podrá usar más.
                    </p>
                  )
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingExchange}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={processingExchange}
              onClick={handleConfirmExchange}
            >
              {processingExchange && <Spinner className="mr-2" />}
              Cambiar por puntos
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
