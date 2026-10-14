"use client"

import { useRef, useState } from "react"
import { AlertCircle, AlertTriangle, Calendar, Check, CreditCard, QrCode, Search, User } from "lucide-react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import StatusBadge from "@/components/panel/status-badge"
import { MOCK_PROVIDER_CARDS } from "@/lib/mock/data"
import { formatDate, formatUsd } from "@/lib/domain/format"
import type { ProviderCardRow } from "@/lib/domain/types"

export default function ProveedorCajaPage() {
  // Estado local de tarjetas (permite registrar consumos durante la sesión)
  const [cards, setCards] = useState<ProviderCardRow[]>(MOCK_PROVIDER_CARDS)

  // Búsqueda
  const [codeQuery, setCodeQuery] = useState("")
  const [searchedCard, setSearchedCard] = useState<ProviderCardRow | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Monto a consumir
  const [amountRaw, setAmountRaw] = useState("")
  const [amountError, setAmountError] = useState<string | null>(null)

  // Diálogo de confirmación y envío
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const isProcessingRef = useRef(false)

  // Normalizar código ingresado (FYB-XXXX-XXXX, insensible a mayúsculas/espacios)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = codeQuery.trim().toUpperCase()

    if (!cleanCode) {
      setNotFound(false)
      setSearchedCard(null)
      return
    }

    const found = cards.find((c) => c.code.toUpperCase() === cleanCode)

    if (found) {
      setSearchedCard(found)
      setNotFound(false)
      setAmountRaw("")
      setAmountError(null)
    } else {
      setSearchedCard(null)
      setNotFound(true)
    }
  }

  // Validación estricta del monto
  const validateAmount = (
    raw: string,
    balanceCents: number
  ): { valid: boolean; error?: string; cents: number } => {
    const trimmed = raw.trim()
    if (!trimmed) {
      return { valid: false, error: "Ingresa un monto mayor que 0.", cents: 0 }
    }

    // Rechazar notación científica (ej. 1e1) o caracteres extraños
    if (/e/i.test(trimmed) || !/^[0-9]+([.,][0-9]+)?$/.test(trimmed)) {
      return { valid: false, error: "Ingresa un monto mayor que 0.", cents: 0 }
    }

    // Máximo 2 decimales
    const parts = trimmed.split(/[.,]/)
    if (parts.length === 2 && parts[1].length > 2) {
      return { valid: false, error: "Usa como máximo 2 decimales.", cents: 0 }
    }

    const normalized = trimmed.replace(",", ".")
    const num = parseFloat(normalized)
    if (isNaN(num) || num <= 0) {
      return { valid: false, error: "Ingresa un monto mayor que 0.", cents: 0 }
    }

    // Comparación SIEMPRE en centavos
    const cents = Math.round(num * 100)
    if (cents <= 0) {
      return { valid: false, error: "Ingresa un monto mayor que 0.", cents: 0 }
    }

    if (cents > balanceCents) {
      return {
        valid: false,
        error: `El monto supera el saldo de la tarjeta (${formatUsd(balanceCents)}).`,
        cents,
      }
    }

    return { valid: true, cents }
  }

  const handleAmountChange = (val: string) => {
    setAmountRaw(val)
    if (!searchedCard) return

    if (!val.trim()) {
      setAmountError(null)
      return
    }

    const res = validateAmount(val, searchedCard.balanceCents)
    setAmountError(res.valid ? null : res.error || null)
  }

  const handleStartConsume = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchedCard || searchedCard.status !== "active" || searchedCard.balanceCents <= 0) return

    const res = validateAmount(amountRaw, searchedCard.balanceCents)
    if (!res.valid) {
      setAmountError(res.error || "Ingresa un monto válido.")
      return
    }

    setAmountError(null)
    setDialogOpen(true)
  }

  // Confirmar consumo irreversible (Regla 7)
  const handleConfirmConsume = () => {
    if (!searchedCard || isProcessingRef.current || isProcessing) return

    const res = validateAmount(amountRaw, searchedCard.balanceCents)
    if (!res.valid) return

    isProcessingRef.current = true
    setIsProcessing(true)

    const consumeCents = res.cents

    setTimeout(() => {
      const newBalanceCents = Math.max(0, searchedCard.balanceCents - consumeCents)
      const newStatus = newBalanceCents === 0 ? "consumed" : "active"

      const updatedCard: ProviderCardRow = {
        ...searchedCard,
        balanceCents: newBalanceCents,
        status: newStatus,
      }

      // Actualizar tarjeta en la lista y en la vista actual
      setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)))
      setSearchedCard(updatedCard)

      setAmountRaw("")
      setAmountError(null)
      setDialogOpen(false)
      setIsProcessing(false)
      isProcessingRef.current = false

      toast.success(`Consumo de ${formatUsd(consumeCents)} registrado con éxito`)
    }, 800)
  }

  const validatedCurrent = searchedCard
    ? validateAmount(amountRaw, searchedCard.balanceCents)
    : { valid: false, cents: 0 }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Caja de cobro</h2>
        <p className="text-sm text-muted-foreground">
          Busca tarjetas de regalo por código para verificar su saldo y registrar consumos
        </p>
      </div>

      {/* Formulario de búsqueda de tarjeta */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Buscar tarjeta</CardTitle>
          </div>
          <CardDescription>
            Ingresa el código alfanumérico proporcionado por el cliente en caja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="cardCode">Código de la tarjeta</Label>
                <Input
                  id="cardCode"
                  type="text"
                  placeholder="FYB-XXXX-XXXX"
                  value={codeQuery}
                  onChange={(e) => {
                    setCodeQuery(e.target.value)
                    setNotFound(false)
                  }}
                  className="font-mono uppercase tracking-wider"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" /> Buscar
                </Button>
                <Button type="button" variant="outline" disabled title="Próximamente en la app móvil" className="h-auto whitespace-normal">
                  <QrCode className="mr-2 h-4 w-4" /> Escanear QR (próximamente en la app)
                </Button>
              </div>
            </div>

            {notFound && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tarjeta no encontrada</AlertTitle>
                <AlertDescription>
                  No encontramos esa tarjeta. Revisa el código.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Ficha de la tarjeta encontrada */}
      {searchedCard && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <span className="font-mono text-sm font-semibold tracking-wider text-muted-foreground">
                  {searchedCard.code}
                </span>
                <CardTitle className="text-xl">{searchedCard.storeName}</CardTitle>
              </div>
              <StatusBadge status={searchedCard.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Detalles de saldo y valor facial */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-primary/5 p-4">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  Saldo disponible
                </span>
                <div className="mt-1 text-3xl font-extrabold text-foreground">
                  {formatUsd(searchedCard.balanceCents)}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor facial inicial
                </span>
                <div className="mt-1 text-2xl font-bold text-foreground">
                  {formatUsd(searchedCard.faceCents)}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Titular
                </span>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {searchedCard.holderMasked}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Caducidad
                </span>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatDate(searchedCard.expiresAt)}
                </div>
              </div>
            </div>

            {/* Operaciones según el estado de la tarjeta */}
            {searchedCard.status === "active" && searchedCard.balanceCents > 0 ? (
              /* Tarjeta activa con saldo: formulario de consumo */
              <div className="rounded-xl border bg-muted/20 p-6 space-y-4">
                <h3 className="text-base font-semibold">Registrar consumo</h3>
                <form onSubmit={handleStartConsume} className="space-y-4">
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="consumeAmount">Monto a consumir (USD)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="consumeAmount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amountRaw}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    {amountError && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {amountError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!validatedCurrent.valid}
                  >
                    <Check className="mr-2 h-4 w-4" /> Registrar consumo
                  </Button>
                </form>
              </div>
            ) : searchedCard.status === "expired" ? (
              /* Caducada */
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="font-semibold text-amber-900">Tarjeta vencida</AlertTitle>
                <AlertDescription className="text-amber-800">
                  Tarjeta caducada: no se puede consumir.
                </AlertDescription>
              </Alert>
            ) : searchedCard.status === "exchanged" ? (
              /* Cambiada por puntos */
              <Alert className="border-sky-200 bg-sky-50 text-sky-900">
                <AlertCircle className="h-4 w-4 text-sky-600" />
                <AlertTitle className="font-semibold text-sky-900">Tarjeta canjeada</AlertTitle>
                <AlertDescription className="text-sky-800">
                  Esta tarjeta fue cambiada por puntos: no se puede consumir.
                </AlertDescription>
              </Alert>
            ) : (
              /* Consumida / Sin saldo */
              <Alert className="border-slate-200 bg-slate-50 text-slate-900">
                <AlertCircle className="h-4 w-4 text-slate-600" />
                <AlertTitle className="font-semibold text-slate-900">Sin saldo disponible</AlertTitle>
                <AlertDescription className="text-slate-700">
                  La tarjeta no tiene saldo.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* AlertDialog de confirmación de consumo (Regla 7) */}
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !isProcessing) setDialogOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar consumo en caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se descontarán {formatUsd(validatedCurrent.cents)} de esta tarjeta. Se avisará al cliente por correo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmConsume}
            >
              {isProcessing && <Spinner className="mr-2" />}
              Confirmar consumo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
