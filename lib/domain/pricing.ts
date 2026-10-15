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
 * Precio de referencia del punto: precio del punto del paquete más pequeño del Canjeador;
 * las tarjetas cuestan valor facial + recargo a ese precio.
 */
export const referenceCentsPerPoint = (publicPacks: PointsPack[]) =>
  centsPerPoint([...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0])

/** Costo que se le paga al Proveedor por la tarjeta. */
export const productCostCents = (p: Product, provider: Pick<Provider, "discountPct">) =>
  p.costCentsOverride ?? Math.round(p.faceCents * (1 - provider.discountPct))

/** Precio en dólares que paga el Canjeador por la tarjeta: valor facial + recargo. */
export const productPriceCents = (p: Pick<Product, "faceCents">, settings: Pick<AdminSettings, "redeemSurchargePct">) =>
  Math.round(p.faceCents * (1 + (settings.redeemSurchargePct ?? 0.03)))

/** Costo total de la tarjeta para Regala: lo que se paga al Proveedor + transporte. */
export const productTotalCostCents = (p: Product, provider: Pick<Provider, "discountPct">) =>
  productCostCents(p, provider) + p.shippingCents

/** Puntos de la tarjeta al punto de referencia (paquete más pequeño del Canjeador). */
export const productPoints = (p: Pick<Product, "faceCents">, settings: Pick<AdminSettings, "redeemSurchargePct" | "pointsMultiple">, refCentsPerPoint: number) =>
  pointsPrice(productPriceCents(p, settings), refCentsPerPoint, settings.pointsMultiple)

/** Puntos de la tarjeta: se redondea y luego se sube al siguiente múltiplo. */
export const pointsPrice = (priceCents: number, refCentsPerPoint: number, multiple = 10) =>
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

  // Regla 5: las tarjetas valen múltiplos de puntos (lo garantiza pointsPrice). Los paquetes no tienen esa restricción.
  for (const prod of active) {
    const pts = productPoints(prod, settings, ref)
    if (pts % settings.pointsMultiple !== 0) {
      issues.push({ rule: 5, severity: "error", message: `${prod.storeName} ${money(prod.faceCents)}: los puntos (${pts}) deben ser múltiplo de ${settings.pointsMultiple}.` })
    }
  }

  // Regla 1: el paquete más pequeño del Canjeador alcanza para la tarjeta activa más barata con holgura (30 % por defecto).
  const headroom = settings.minPackHeadroomPct ?? 0.3
  const smallestPack = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
  const cheapest = active
    .map((prod) => ({ prod, pts: productPoints(prod, settings, ref) }))
    .sort((a, b) => a.pts - b.pts)[0]
  if (smallestPack && cheapest) {
    const need = Math.ceil(cheapest.pts * (1 + headroom))
    if (smallestPack.points < need) {
      issues.push({ rule: 1, severity: "error", message: `El paquete más pequeño del Canjeador (${money(smallestPack.usdCents)}, ${smallestPack.points} pts) debe dar al menos ${(headroom * 100).toFixed(1)} % más que la tarjeta más barata (${cheapest.prod.storeName} ${money(cheapest.prod.faceCents)}, ${cheapest.pts} pts): mínimo ${need} pts.` })
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
  const allTables = [{ who: "Canjeador", packs: publicPacks }, ...tables]
  for (const prod of active) {
    const provider = providerOf(prod.providerId)
    const cost = productTotalCostCents(prod, provider)
    const pts = productPoints(prod, settings, ref)
    for (const t of allTables) {
      for (const pack of t.packs) {
        const m = marginAtPack(pts, pack, cost)
        if (m.marginPct < settings.minMarginPct) {
          issues.push({ rule: 3, severity: "error", message: `${prod.storeName} ${money(prod.faceCents)} con la tabla "${t.who}" tramo ${money(pack.usdCents)}: margen ${(m.marginPct * 100).toFixed(1)} % (mínimo ${(settings.minMarginPct * 100).toFixed(1)} %).` })
        }
      }
    }
  }

  // Regla 4: el recargo al canjear no puede ser negativo.
  if ((settings.redeemSurchargePct ?? 0.03) < 0) {
    issues.push({ rule: 4, severity: "error", message: "El recargo al canjear no puede ser negativo." })
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

  // Regla 8: la compra a tu medida del Canjeador nunca puede ser más barata que su paquete más pequeño
  // (no debe saltarse el precio de los paquetes) y su rango debe ser coherente.
  const customPpd = settings.customPointsPerUsd ?? 100
  const smallestPublic = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
  if (smallestPublic && customPpd > smallestPublic.points / (smallestPublic.usdCents / 100) + 1e-9) {
    issues.push({ rule: 8, severity: "error", message: `La compra a tu medida (${customPpd} pts por $1) es más barata que el paquete de ${money(smallestPublic.usdCents)} (${(smallestPublic.points / (smallestPublic.usdCents / 100)).toFixed(1)} pts por $1).` })
  }
  const cMin = settings.customMinUsd ?? 1
  const cMax = settings.customMaxUsd ?? 500
  if (cMin > cMax) {
    issues.push({ rule: 8, severity: "error", message: `El monto mínimo de la compra a tu medida ($${cMin}) no puede superar el máximo ($${cMax}).` })
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
