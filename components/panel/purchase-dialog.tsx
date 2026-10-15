"use client"

import { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatPts } from "@/lib/domain/format"

type PurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  usd: number
  points: number
  onApproved: () => void
}

export function PurchaseDialog({
  open,
  onOpenChange,
  usd,
  points,
  onApproved,
}: PurchaseDialogProps) {
  const [loading, setLoading] = useState(false)
  const isApprovingRef = useRef(false)

  const handleApprove = () => {
    if (isApprovingRef.current || loading) return
    isApprovingRef.current = true
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      isApprovingRef.current = false
      onApproved()
      onOpenChange(false)
    }, 800)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pago seguro</DialogTitle>
          <DialogDescription>
            Pagarás en la página segura de la pasarela. Regala no ve los datos de tu tarjeta.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-xl border bg-muted/40 p-6 text-center space-y-2">
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            ${usd} → {formatPts(points)} pts
          </p>
          <p className="text-xs text-muted-foreground">
            Prototipo: no se realiza ningún cobro real.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleApprove}
          >
            {loading && <Spinner className="mr-2" />}
            Simular pago aprobado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
