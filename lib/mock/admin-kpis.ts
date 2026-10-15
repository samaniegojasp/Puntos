// Datos ILUSTRATIVOS del resumen de administración (solo prototipo). No son cifras reales del negocio.
// En el backend salen de consultas agregadas (ventas, lotes, tarjetas, liquidaciones y usuarios); aquí solo fijan el diseño.

const c = (usd: number) => Math.round(usd * 100)

export type MonthPoint = {
  /** "2026-05" */
  month: string
  /** Venta de puntos a Canjeadores (centavos) */
  revenueCanjeadorCents: number
  /** Venta de puntos a Clientes (centavos) */
  revenueClienteCents: number
  /** Recargo por cambio de tarjetas caducadas (centavos) */
  exchangeFeeCents: number
  /** Margen bruto del mes sobre lo consumido (centavos) */
  grossMarginCents: number
  /** Usuarios nuevos */
  newUsers: number
  /** Canjes de tarjetas */
  redemptions: number
}

export const MOCK_ADMIN_MONTHS: MonthPoint[] = [
  { month: "2026-05", revenueCanjeadorCents: c(1200), revenueClienteCents: c(2900), exchangeFeeCents: c(0), grossMarginCents: c(310), newUsers: 42, redemptions: 61 },
  { month: "2026-06", revenueCanjeadorCents: c(2100), revenueClienteCents: c(3700), exchangeFeeCents: c(0), grossMarginCents: c(520), newUsers: 77, redemptions: 118 },
  { month: "2026-07", revenueCanjeadorCents: c(3300), revenueClienteCents: c(3900), exchangeFeeCents: c(45), grossMarginCents: c(690), newUsers: 96, redemptions: 164 },
  { month: "2026-08", revenueCanjeadorCents: c(4600), revenueClienteCents: c(5000), exchangeFeeCents: c(60), grossMarginCents: c(940), newUsers: 131, redemptions: 241 },
  { month: "2026-09", revenueCanjeadorCents: c(5900), revenueClienteCents: c(6900), exchangeFeeCents: c(85), grossMarginCents: c(1280), newUsers: 158, redemptions: 322 },
  { month: "2026-10", revenueCanjeadorCents: c(7300), revenueClienteCents: c(7800), exchangeFeeCents: c(120), grossMarginCents: c(1620), newUsers: 189, redemptions: 407 },
]

export const MOCK_ADMIN_SUMMARY = {
  /** Puntos vivos de todos los usuarios (pasivo) */
  pointsLive: 412_600,
  /** Valor en USD al precio promedio de venta de esos puntos (centavos) */
  pointsLiveCents: c(3_580),
  /** Saldo en tarjetas virtuales vivas, de todos los proveedores (centavos) */
  cardsLiveBalanceCents: c(2_940),
  /** Tarjetas vivas */
  cardsLiveCount: 318,
  /** Puntos y tarjetas que caducan en 30 días */
  expiringPoints30d: 18_400,
  expiringCards30d: 23,
  usersTotal: 1_248,
  usersByRole: { canjeador: 1_231, cliente: 9, proveedor: 7, admin: 1 },
  topStores: [
    { name: "Supermaxi", redemptions: 138 },
    { name: "Fybeca", redemptions: 96 },
    { name: "Marathon Sports", redemptions: 71 },
    { name: "Juguetón", redemptions: 58 },
    { name: "Kywi", redemptions: 44 },
  ],
}
