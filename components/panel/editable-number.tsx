"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"

/** Cantidad que se puede escribir: al hacer clic se convierte en un campo; Enter o salir del campo confirma, Esc cancela. */
export default function EditableNumber({
  display,
  initial,
  onCommit,
  label,
  suffix,
  decimals = false,
  allowZero = false,
}: {
  display: string
  initial: string
  onCommit: (value: number) => void
  label: string
  suffix: string
  decimals?: boolean
  /** Permite escribir 0 (por ejemplo, un porcentaje) */
  allowZero?: boolean
}) {
  const isValid = (n: number) => Number.isFinite(n) && (allowZero ? n >= 0 : n > 0) && (decimals || Number.isInteger(n))
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const start = () => {
    setText(initial)
    setError(null)
    setEditing(true)
  }
  const commit = () => {
    const n = Number(text.trim().replace(",", "."))
    if (text.trim() === "" || !isValid(n)) {
      setError(
        allowZero
          ? "Escribe un número válido (0 o mayor)."
          : decimals
            ? "Escribe un número mayor que 0."
            : "Escribe un número entero mayor que 0.",
      )
      return
    }
    onCommit(n)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        title="Haz clic para escribir un valor"
        aria-label={`${label}: ${display} ${suffix}. Haz clic para escribir un valor`}
        className="rounded px-1 font-mono text-sm font-semibold text-foreground underline decoration-dotted underline-offset-4 hover:bg-muted"
      >
        {display} {suffix}
      </button>
    )
  }
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-1">
        <Input
          autoFocus
          data-inline-edit="true"
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              e.stopPropagation()
              setEditing(false)
            }
          }}
          onBlur={() => {
            // Si es válido se confirma al salir; si no, se descarta
            const n = Number(text.trim().replace(",", "."))
            if (text.trim() !== "" && isValid(n)) onCommit(n)
            setEditing(false)
          }}
          className="h-8 w-28 text-right font-mono text-sm"
        />
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </span>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </span>
  )
}
