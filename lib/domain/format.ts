// Formato de números y fechas para todas las pantallas (es-EC).

export const formatUsd = (cents: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(cents / 100)

export const formatPts = (n: number) => new Intl.NumberFormat("es-EC").format(n)

/** Precio por punto con 5 decimales, p. ej. "$0,00850". */
export const formatUsdPerPoint = (n: number) =>
  `$${new Intl.NumberFormat("es-EC", { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n)}`

/** 0.15 → "15 %", 0.0085 → "0,85 %". */
export const formatPct = (fraction: number) =>
  `${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(fraction * 100)} %`

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso))

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
