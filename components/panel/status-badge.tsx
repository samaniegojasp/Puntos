import { cn } from "@/lib/utils"
import { CARD_STATUS_LABEL, type CardStatus } from "@/lib/domain/types"

const STYLE: Record<CardStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  consumed: "bg-slate-100 text-slate-700",
  expired: "bg-amber-100 text-amber-900",
  exchanged: "bg-sky-100 text-sky-800",
}

/** Etiqueta de color con el estado de una tarjeta virtual. */
export default function StatusBadge({ status, className }: { status: CardStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLE[status], className)}>
      {CARD_STATUS_LABEL[status]}
    </span>
  )
}
