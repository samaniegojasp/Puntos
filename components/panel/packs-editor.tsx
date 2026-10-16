"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Plus, Trash2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import EditableNumber from "@/components/panel/editable-number"
import { formatPts } from "@/lib/domain/format"
import type { PointsPack } from "@/lib/domain/types"

const LOW = 0.6 // se prueban entre 60 % y 140 % de puntos por dólar base
const HIGH = 1.4

/**
 * Editor de paquetes de puntos (USD → puntos).
 * La barra de cada paquete recorre todos los pasos de puntos entre el 60 % y el 140 % de la base.
 */
export default function PacksEditor({
  open,
  onOpenChange,
  packs,
  onSave,
  title = "Paquetes del Canjeador",
  description = "Lo que el Canjeador compra por su cuenta (USD → puntos). Cambiar un paquete mueve el punto de referencia y el precio en puntos de todas las tarjetas.",
  saveLabel = "Guardar paquetes",
  pointsPerUsdBase = 100,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  packs: PointsPack[]
  onSave: (packs: PointsPack[]) => void
  title?: string
  description?: string
  saveLabel?: string
  pointsPerUsdBase?: number
}) {
  const [draft, setDraft] = useState<PointsPack[]>(packs)
  const scale = Math.max(1, Math.round(pointsPerUsdBase / 100))
  const STEP = 10 * scale

  useEffect(() => {
    if (open) setDraft(packs.map((p) => ({ ...p })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Puntos válidos de cada paquete (todos los pasos entre 60 % y 140 %)
  const validLists = useMemo(() => {
    if (!open) return [] as (number[] | null)[]
    return draft.map((pack) => {
      const usd = pack.usdCents / 100
      if (usd <= 0) return null
      const list: number[] = []
      const from = Math.ceil((usd * pointsPerUsdBase * LOW) / STEP) * STEP
      const to = Math.floor((usd * pointsPerUsdBase * HIGH) / STEP) * STEP
      for (let pts = from; pts <= to; pts += STEP) {
        list.push(pts)
      }
      return list.length ? list : null
    })
  }, [open, draft, pointsPerUsdBase, STEP])

  const usdSet = new Set(draft.map((p) => p.usdCents))
  const duplicated = usdSet.size !== draft.length
  const canSave = draft.length > 0 && !duplicated && draft.every((p) => p.usdCents > 0 && p.points > 0)

  const setPack = (idx: number, patch: Partial<PointsPack>) =>
    setDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))

  const changeUsd = (idx: number, usd: number) => {
    const cur = draft[idx]
    const ppd = cur.points / (cur.usdCents / 100)
    setPack(idx, { usdCents: usd * 100, points: Math.max(STEP, Math.round((usd * ppd) / STEP) * STEP) })
  }

  const addPack = () => {
    const last = [...draft].sort((a, b) => b.usdCents - a.usdCents)[0]
    const usd = last ? (last.usdCents / 100) * 2 : 10
    const ppd = last ? last.points / (last.usdCents / 100) : pointsPerUsdBase
    setDraft((prev) => [...prev, { id: `pack-new-${Date.now()}`, usdCents: usd * 100, points: Math.round((usd * ppd) / STEP) * STEP }])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (document.activeElement?.hasAttribute("data-inline-edit")) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {draft.map((pack, idx) => {
            const list = validLists[idx] ?? null
            const nearest = list
              ? list.reduce((best, v, i) => (Math.abs(v - pack.points) < Math.abs(list[best] - pack.points) ? i : best), 0)
              : 0
            const isValid = list ? list.includes(pack.points) : false
            const ppd = pack.usdCents > 0 ? pack.points / (pack.usdCents / 100) : 0
            return (
              <div key={pack.id} className="space-y-2 rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Paquete de</span>
                    <EditableNumber
                      label="Monto del paquete"
                      display={`$${pack.usdCents / 100}`}
                      initial={String(pack.usdCents / 100)}
                      suffix="USD"
                      onCommit={(v) => changeUsd(idx, v)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <EditableNumber
                      label="Puntos del paquete"
                      display={formatPts(pack.points)}
                      initial={String(pack.points)}
                      suffix="pts"
                      onCommit={(v) => setPack(idx, { points: v })}
                    />
                    <span className="text-xs text-muted-foreground">
                      ({new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(ppd)} pts por $1)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={draft.length <= 1}
                      onClick={() => setDraft((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Quitar el paquete de $${pack.usdCents / 100}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {list ? (
                  <>
                    <Slider
                      min={0}
                      max={Math.max(list.length - 1, 0)}
                      step={1}
                      value={[nearest]}
                      onValueChange={(v) => setPack(idx, { points: list[v[0]] })}
                      aria-label={`Puntos del paquete de $${pack.usdCents / 100}`}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Mínimo {formatPts(list[0])} pts</span>
                      <span>Máximo {formatPts(list[list.length - 1])} pts</span>
                    </div>
                    {!isValid && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-destructive">
                          El valor actual está fuera del rango de la barra. Mueve la barra o usa el valor más cercano.
                        </p>
                        <Button type="button" size="sm" variant="outline" onClick={() => setPack(idx, { points: list[nearest] })}>
                          Usar {formatPts(list[nearest])} pts
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-destructive">
                    El monto debe ser mayor a 0 para calcular los puntos de la barra.
                  </p>
                )}
              </div>
            )
          })}
          <Button type="button" variant="outline" size="sm" onClick={addPack}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Añadir paquete
          </Button>
        </div>

        {duplicated && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se puede guardar</AlertTitle>
            <AlertDescription className="mt-1 space-y-1 text-xs">
              <p>• Hay dos paquetes con el mismo monto.</p>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              onSave([...draft].sort((a, b) => a.usdCents - b.usdCents))
              onOpenChange(false)
            }}
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
