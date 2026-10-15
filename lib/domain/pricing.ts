// Cálculos de precios SOLO PARA VISTA PREVIA en pantallas del prototipo (PLAN-ROLES.md §5).
// El backend real calcula y valida en el servidor (`price_points`, `validate_pricing`); la UI nunca decide un precio.

import type {
  AdminSettings,
  ClientAdminRow,
  ExchangePreview,
  GiftCard,
  PointsPack,
  PricingIssue,
  Product,
  Provider,
} from "./types"

/** Centavos de USD por punto de un paquete. */
export const centsPerPoint = (p: PointsPack) => p.usdCents / p.points

/**
 * Precio de referencia del punto: el del paquete más pequeño que compra el Canjeador por su cuenta (el de $10).
 * Con él se expresan las tarjetas en puntos, de modo que lo que cuesta una tarjeta nunca supere
 * lo que el Canjeador compra con el paquete del mismo valor (p. ej. tarjeta de $10 ≤ 1 000 pts si $10 = 1 000 pts).
 */
export const referenceCentsPerPoint = (publicPacks: PointsPack[]) =>
  centsPerPoint([...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0])

/** Costo que se le paga al Proveedor por la tarjeta. */
export const productCostCents = (p: Product, provider: Pick<Provider, "discountPct">) =>
  p.costCentsOverride ?? Math.round(p.faceCents * (1 - provider.discountPct))

/** Precio en dólares: costo + transporte + costo × margen. */
export function productPriceCents(p: Product, provider: Pick<Provider, "discountPct">) {
  const cost = productCostCents(p, provider)
  return cost + p.shippingCents + Math.round(cost * p.marginPct)
}

/** Puntos de la tarjeta: se redondea y luego se sube al siguiente múltiplo (100). */
export const pointsPrice = (priceCents: number, refCentsPerPoint: number, multiple = 100) =>
  Math.ceil(Math.round(priceCents / refCentsPerPoint) / multiple) * multiple

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

/** Precio por punto (centavos) que aplica a un monto: el del mayor paquete que no lo supere. */
function centsPerPointAt(packs: PointsPack[], usdCents: number) {
  const sorted = [...packs].sort((a, b) => a.usdCents - b.usdCents)
  const fit = sorted.filter((p) => p.usdCents <= usdCents)
  return centsPerPoint(fit.length ? fit[fit.length - 1] : sorted[0])
}

type PricingInput = {
  settings: AdminSettings
  providers: Provider[]
  products: Product[]
  standardPacks: PointsPack[]
  publicPacks: PointsPack[]
  clients: ClientAdminRow[]
}

/** Reglas de PLAN-ROLES.md §5.3. Devuelve la lista de problemas (vacía = todo bien). */
export function validatePricing({ settings, providers, products, standardPacks, publicPacks, clients }: PricingInput): PricingIssue[] {
  const issues: PricingIssue[] = []
  const ref = referenceCentsPerPoint(publicPacks)
  const providerOf = (id: string) => providers.find((x) => x.id === id) ?? { discountPct: 0 }
  const active = products.filter((p) => p.active)
  const money = (c: number) => `$${(c / 100).toFixed(2)}`

  // Regla 5: las tarjetas valen múltiplos de 100 puntos (lo garantiza `pointsPrice`). Los paquetes no tienen esa restricción.
  for (const prod of active) {
    const pts = pointsPrice(productPriceCents(prod, providerOf(prod.providerId)), ref, settings.pointsMultiple)
    if (pts % settings.pointsMultiple !== 0) {
      issues.push({ rule: 5, severity: "error", message: `${prod.storeName} ${money(prod.faceCents)}: los puntos (${pts}) deben ser múltiplo de ${settings.pointsMultiple}.` })
    }
  }

  // Regla 1: piso. Un paquete debe alcanzar para cualquier tarjeta cuyo valor facial no lo supere.
  // Vale para los paquetes estándar y también para los del Canjeador: si compra $10 en puntos, la tarjeta de $10 le debe alcanzar.
  for (const [who, packs] of [["", standardPacks], ["del Canjeador ", publicPacks]] as const) {
    for (const pack of packs) {
      for (const prod of active) {
        if (prod.faceCents > pack.usdCents) continue
        const pts = pointsPrice(productPriceCents(prod, providerOf(prod.providerId)), ref, settings.pointsMultiple)
        if (pack.points < pts) {
          issues.push({ rule: 1, severity: "error", message: `El paquete ${who}de ${money(pack.usdCents)} (${pack.points} pts) no alcanza para ${prod.storeName} ${money(prod.faceCents)} (${pts} pts).` })
        }
      }
    }
  }

  // Regla 2: el Canjeador siempre paga más por punto que cualquier Cliente.
  const tables = [{ who: "Estándar", packs: standardPacks }, ...clients.map((c) => ({ who: c.name, packs: c.customPacks }))].filter((t) => t.packs.length)
  const amounts = Array.from(new Set([...publicPacks, ...tables.flatMap((t) => t.packs)].map((p) => p.usdCents))).sort((a, b) => a - b)
  for (const t of tables) {
    for (const x of amounts) {
      if (centsPerPointAt(publicPacks, x) <= centsPerPointAt(t.packs, x)) {
        issues.push({ rule: 2, severity: "error", message: `A ${money(x)} el precio público por punto no es mayor que el de ${t.who}.` })
        break
      }
    }
  }

  // Regla 3: margen mínimo en cada tramo de cada tabla.
  for (const prod of active) {
    const provider = providerOf(prod.providerId)
    const cost = productCostCents(prod, provider)
    const pts = pointsPrice(productPriceCents(prod, provider), ref, settings.pointsMultiple)
    for (const t of tables) {
      for (const pack of t.packs) {
        const m = marginAtPack(pts, pack, cost)
        if (m.marginPct < settings.minMarginPct) {
          issues.push({ rule: 3, severity: "error", message: `${prod.storeName} ${money(prod.faceCents)} con la tabla "${t.who}" tramo ${money(pack.usdCents)}: margen ${(m.marginPct * 100).toFixed(1)} % (mínimo ${(settings.minMarginPct * 100).toFixed(1)} %).` })
        }
      }
    }
  }

  // Regla 4: el precio en dólares de una tarjeta nunca puede superar su valor facial.
  for (const prod of active) {
    const price = productPriceCents(prod, providerOf(prod.providerId))
    if (price > prod.faceCents) {
      issues.push({ rule: 4, severity: "error", message: `${prod.storeName} ${money(prod.faceCents)}: el precio (${money(price)}) supera el valor facial.` })
    }
  }
  // Regla 7: beneficio mínimo del Cliente. Cada tramo de cada tabla de Cliente debe dar al menos `clientBenefitPct`
  // más puntos por dólar que el punto de referencia (el del Canjeador). Así quien recibe un bono ve que le rinde más.
  const benefit = settings.clientBenefitPct ?? 0.01
  for (const t of tables) {
    for (const pack of t.packs) {
      if (centsPerPoint(pack) > ref * (1 - benefit) + 1e-12) {
        issues.push({ rule: 7, severity: "error", message: `Tabla "${t.who}", tramo ${money(pack.usdCents)}: da menos de ${(benefit * 100).toFixed(1)} % de beneficio sobre el punto del Canjeador.` })
      }
    }
  }

  // Regla 6: límites opcionales del precio por punto de cada cliente (USD por punto).
  const { pricePerPointMin: pMin, pricePerPointMax: pMax } = settings
  if (pMin !== undefined || pMax !== undefined) {
    for (const c of clients) {
      const base = [...c.customPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
      const price = c.packMode === "custom" && base ? base.usdCents / base.points / 100 : c.usdPerPoint
      const fmt = (n: number) => `$${n.toFixed(5)}`
      if (pMin !== undefined && price < pMin - 1e-9) {
        issues.push({ rule: 6, severity: "error", limit: "min", message: `${c.name}: el precio por punto (${fmt(price)}) está por debajo del mínimo permitido (${fmt(pMin)}).` })
      }
      if (pMax !== undefined && price > pMax + 1e-9) {
        issues.push({ rule: 6, severity: "error", limit: "max", message: `${c.name}: el precio por punto (${fmt(price)}) está por encima del máximo permitido (${fmt(pMax)}).` })
      }
    }
  }
  return issues
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
