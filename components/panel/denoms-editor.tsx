"use client"

import * as React from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export type DenomsEditorProps = {
  value: number[]
  onChange: (next: number[]) => void
  min: number
  max: number
  error?: string
  hint?: React.ReactNode
  disabled?: boolean
}

function getNextDenom(current: number[], min: number, max: number): number | null {
  if (current.length >= 6) return null
  const maxVal = current.length > 0 ? Math.max(...current) : min - 5
  const startAbove = Math.floor((maxVal + 5) / 5) * 5
  for (let v = startAbove; v <= max; v += 5) {
    if (!current.includes(v)) return v
  }
  const startMin = Math.ceil(min / 5) * 5
  for (let v = startMin; v <= max; v += 5) {
    if (!current.includes(v)) return v
  }
  return null
}

export function DenomsEditor({
  value,
  onChange,
  min,
  max,
  error,
  hint,
  disabled = false,
}: DenomsEditorProps) {
  function updateDenom(idx: number, val: number) {
    const next = [...value]
    next[idx] = val
    onChange(next)
  }

  function removeDenom(idx: number) {
    if (value.length <= 1) return
    onChange(value.filter((_, i) => i !== idx))
  }

  function addDenom() {
    if (value.length >= 6) return
    const nextVal = getNextDenom(value, min, max)
    if (nextVal !== null) {
      onChange([...value, nextVal])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Valores en USD (máx. 6)</Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/6 valores
        </span>
      </div>
      <div className="space-y-2">
        {value.map((denom, idx) => {
          const rowError =
            denom < min || denom > max
              ? `Fuera de los límites de Ajustes ($${min}–$${max})`
              : denom % 5 !== 0
                ? "Debe ser múltiplo de 5"
                : null

          return (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">${denom}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateDenom(idx, Math.min(max, Math.max(min, denom - 5)))}
                    disabled={disabled || denom <= min}
                    aria-label="Restar 5"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateDenom(idx, Math.min(max, Math.max(min, denom + 5)))}
                    disabled={disabled || denom >= max}
                    aria-label="Sumar 5"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDenom(idx)}
                    disabled={disabled || value.length <= 1}
                    aria-label="Eliminar valor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Slider
                min={min}
                max={max}
                step={5}
                disabled={disabled}
                value={[Math.min(Math.max(denom, min), max)]}
                onValueChange={([val]) => updateDenom(idx, val)}
                aria-label={`Valor ${idx + 1}`}
              />
              {rowError && <p className="text-xs text-destructive">{rowError}</p>}
            </div>
          )
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addDenom}
        disabled={disabled || value.length >= 6}
      >
        <Plus className="mr-1 h-4 w-4" /> Agregar valor
      </Button>
      {hint}
    </div>
  )
}
