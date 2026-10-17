// Cálculos de precios SOLO PARA VISTA PREVIA en pantallas del prototipo (PLAN-ROLES.md §5).
// El backend real calcula y valida en el servidor (`price_points`, `validate_pricing`); la UI nunca decide un precio.

import type {
  AdminSettings,
  ClientAdminRow,
  ExchangePreview,
  GiftCard,
  PointsPack,
  Product,
  Provider,
} from "./types"

/** Centavos de USD por punto de un paquete. */
export const centsPerPoint = (p: PointsPack) => p.usdCents / p.points

/**
 * Precio de referencia del punto: precio del punto del paquete más pequeño del Canjeador;
 * las tarjetas cuestan valor facial + recargo (0 % por defecto) a ese precio.
 */
export const referenceCentsPerPoint = (publicPacks: PointsPack[]) =>
  centsPerPoint([...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0])

/**
 * Precio de referencia del punto para Clientes: el menor ¢/punto entre los paquetes
 * estándar y los paquetes propios de cada Cliente **activo** con tabla propia.
 * Devuelve el de menor centsPerPoint (= más puntos por dólar = más descuento).
 */
export function bestClientCentsPerPoint(input: {
  standardPacks: PointsPack[]
  clients: ClientAdminRow[]
}): { centsPerPoint: number; label: string } {
  let best = Infinity
  let label = "—"

  // Candidatos de la tabla estándar
  for (const pack of input.standardPacks) {
    const cpp = pack.usdCents / pack.points
    if (cpp < best) {
      best = cpp
      label = "Tabla estándar"
    }
  }

  // Candidatos de los Clientes activos con tabla propia
  for (const client of input.clients) {
    if (!client.active || client.packMode !== "custom") continue
    for (const pack of client.customPacks) {
      const cpp = pack.usdCents / pack.points
      if (cpp < best) {
        best = cpp
        label = client.name
      }
    }
  }

  if (best === Infinity) return { centsPerPoint: 1, label: "—" }
  return { centsPerPoint: best, label }
}

/** Costo que se le paga al Proveedor por la tarjeta. */
export const productCostCents = (p: Product, provider: Pick<Provider, "discountPct">) =>
  p.costCentsOverride ?? Math.round(p.faceCents * (1 - provider.discountPct))

/** Precio en dólares que paga el Canjeador por la tarjeta: precio General fijado o valor facial + recargo (0 % por defecto). */
export const productPriceCents = (
  p: Pick<Product, "faceCents" | "priceGeneralCents">,
  settings: Pick<AdminSettings, "redeemSurchargePct">
) => p.priceGeneralCents ?? Math.round(p.faceCents * (1 + (settings.redeemSurchargePct ?? 0)))

/** Precio en centavos de USD que ingresa cuando se canjea con puntos de Cliente. */
export const productClientPriceCents = (
  p: Pick<Product, "priceClientCents">,
  pts: number,
  clientRefCentsPerPoint: number
) => p.priceClientCents ?? Math.round(pts * clientRefCentsPerPoint)

/** Costo total de la tarjeta para Regala: lo que se paga al Proveedor + transporte. */
export const productTotalCostCents = (p: Product, provider: Pick<Provider, "discountPct">) =>
  productCostCents(p, provider) + p.shippingCents

/** Puntos de la tarjeta al punto de referencia (paquete más pequeño del Canjeador). Salen del precio General. */
export const productPoints = (
  p: Pick<Product, "faceCents" | "priceGeneralCents">,
  settings: Pick<AdminSettings, "redeemSurchargePct" | "pointsMultiple">,
  refCentsPerPoint: number
) => pointsPrice(productPriceCents(p, settings), refCentsPerPoint, settings.pointsMultiple)

/** Puntos de la tarjeta: se redondea y luego se sube al siguiente múltiplo. */
export const pointsPrice = (priceCents: number, refCentsPerPoint: number, multiple = 10) =>
  Math.ceil(Math.round(priceCents / refCentsPerPoint) / multiple) * multiple

/** Margen en centavos y porcentaje sobre el costo total. */
export function cardMargin(priceCents: number, totalCostCents: number) {
  const marginCents = priceCents - totalCostCents
  const marginPct = totalCostCents > 0 ? (priceCents - totalCostCents) / totalCostCents : 0
  return { marginCents, marginPct }
}

/** Ingreso y margen que deja una tarjeta pagada con puntos comprados en cierto paquete. */
export function marginAtPack(points: number, pack: Pick<PointsPack, "usdCents" | "points">, costCents: number) {
  const revenueCents = Math.round(points * (pack.usdCents / pack.points))
  const marginCents = revenueCents - costCents
  return { revenueCents, marginCents, marginPct: costCents > 0 ? marginCents / costCents : 0 }
}

/** Calculadora de bono del Cliente: venta × bono = USD de bono; puntos = USD ÷ precio del punto. */
export function bonusFromSale(saleCents: number, bonusPct: number, usdPerPoint: number) {
  const bonusCents = Math.round(saleCents * bonusPct)
  const points = Math.floor(bonusCents / (usdPerPoint * 100) + 1e-9)
  return { bonusCents, points }
}


/** Vista previa de "Cambiar por puntos" (PLAN-ROLES.md §4, 4b). El servidor repite el cálculo. */
export function exchangePreview(card: GiftCard, settings: AdminSettings, now: Date): ExchangePreview {
  if (card.status === "exchanged") return { allowed: false, reason: "already_exchanged" }
  if (card.status !== "expired") return { allowed: false, reason: "not_expired" }
  if (card.balanceCents <= 0) return { allowed: false, reason: "no_balance" }
  const days = (now.getTime() - new Date(card.expiresAt).getTime()) / 86_400_000
  if (days > settings.exchangeWindowDays) return { allowed: false, reason: "window_closed" }
  const gross = Math.floor((card.balanceCents / card.faceCents) * card.pointsPaid)
  const pointsBack = Math.floor(gross * (1 - settings.exchangeFeePct))
  return { allowed: true, pointsBack, feePoints: gross - pointsBack, feePct: settings.exchangeFeePct }
}

export type ClientPpdLimits = {
  min: number            // pts por dólar del Canjeador General (paquete público de menor monto)
  max: number            // nunca menor que min
  limitingLabel?: string // ej. "Juguetón $15"
}

export function clientPpdLimits(input: {
  settings: Pick<AdminSettings, "redeemSurchargePct" | "pointsMultiple" | "minMarginPct">
  providers: Provider[]
  products: Product[]
  publicPacks: PointsPack[]
}): ClientPpdLimits {
  const ref = referenceCentsPerPoint(input.publicPacks)
  const min = 100 / ref
  const m = input.settings.minMarginPct ?? 0.02

  let lowestMaxCard = Infinity
  let limitingLabel: string | undefined = undefined

  for (const prod of input.products) {
    if (!prod.active) continue
    const provider = input.providers.find((pr) => pr.id === prod.providerId) ?? { discountPct: 0 }
    const cost = productTotalCostCents(prod, provider)
    if (cost <= 0) continue
    const pts = productPoints(prod, input.settings, ref)
    const maxCard = (pts * 100) / (cost * (1 + m))
    if (maxCard < lowestMaxCard) {
      lowestMaxCard = maxCard
      limitingLabel = `${prod.storeName} $${prod.faceCents / 100}`
    }
  }

  const max = lowestMaxCard === Infinity ? min * 1.4 : Math.max(min, lowestMaxCard)

  return {
    min,
    max,
    limitingLabel,
  }
}

