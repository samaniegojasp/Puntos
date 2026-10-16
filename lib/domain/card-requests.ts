import type { ThemeKey } from "@/lib/catalog"
import type {
  AdminSettings,
  ClientAdminRow,
  PointsPack,
  PricingIssue,
  Product,
  Provider,
} from "./types"
import { validatePricing } from "./pricing"

export type CardRequestStatus = "draft" | "submitted" | "approved" | "rejected"

export type CardRequest = {
  id: string
  providerId: string
  name: string
  category: string
  description: string
  theme: ThemeKey
  colors?: { from: string; to: string }
  logo?: string
  image?: string
  denoms: number[] // USD enteros, múltiplos de 5
  status: CardRequestStatus
  createdAt: string
  submittedAt?: string
  reviewedAt?: string
  rejectReason?: string // lo escribe Nosotros y lo ve el Proveedor
  approvedStoreId?: string
}

export type PricingContext = {
  settings: AdminSettings
  providers: Provider[]
  products: Product[]
  standardPacks: PointsPack[]
  publicPacks: PointsPack[]
  clients: ClientAdminRow[]
}

export const slugify = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

export function uniqueStoreId(base: string, existingIds: string[]): string {
  let id = base
  for (let n = 2; existingIds.includes(id); n++) {
    id = `${base}-${n}`
  }
  return id
}

export function validateCardRequestDraft(
  d: { name?: string; category?: string; description?: string; denoms?: number[] },
  { min, max, existingNames }: { min: number; max: number; existingNames: string[] }
): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = d.name?.trim() ?? ""
  const category = d.category?.trim() ?? ""
  const description = d.description?.trim() ?? ""
  const denoms = d.denoms ?? []

  if (name.length < 2 || name.length > 40) {
    errors.name = "Entre 2 y 40 caracteres."
  } else {
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase()
    const target = normalize(name)
    if (existingNames.some((n) => normalize(n) === target)) {
      errors.name = "Ya existe una tarjeta con ese nombre."
    }
  }

  if (category.length < 2 || category.length > 30) {
    errors.category = "Entre 2 y 30 caracteres."
  }

  if (description.length > 120) {
    errors.description = "Máximo 120 caracteres."
  }

  if (denoms.length < 1 || denoms.length > 6) {
    errors.denoms = "Ingresa entre 1 y 6 valores."
  } else if (new Set(denoms).size !== denoms.length) {
    errors.denoms = "Hay valores repetidos."
  } else if (denoms.some((v) => v < min || v > max || v % 5 !== 0)) {
    errors.denoms = `Todos los valores deben ser múltiplos de 5 entre $${min} y $${max}.`
  }

  return errors
}

export function requestToProducts(
  req: { name: string },
  denoms: number[],
  providerId: string
): Product[] {
  const slug = slugify(req.name)
  return denoms.map((usd) => ({
    id: `pr-${slug}-${usd}`,
    storeId: slug,
    storeName: req.name,
    providerId,
    faceCents: usd * 100,
    shippingCents: 0,
    active: true,
  }))
}

export function pricingErrorsFor(ctx: PricingContext, products: Product[]): PricingIssue[] {
  const baseIssues = validatePricing(ctx)
  const baseMessages = new Set(baseIssues.map((i) => i.message))
  const newIssues = validatePricing({
    ...ctx,
    products,
  })
  return newIssues.filter((i) => !baseMessages.has(i.message))
}

export function incompatibleDenoms(
  ctx: PricingContext,
  req: { name: string; denoms: number[] },
  providerId: string
): { denoms: number[]; combined: boolean } {
  const badDenoms: number[] = []
  for (const d of req.denoms) {
    const singleProduct = requestToProducts(req, [d], providerId)
    const errors = pricingErrorsFor(ctx, [...ctx.products, ...singleProduct])
    if (errors.length > 0) {
      badDenoms.push(d)
    }
  }

  const remaining = req.denoms.filter((d) => !badDenoms.includes(d))
  let combined = false
  if (remaining.length > 0) {
    const combinedProducts = requestToProducts(req, remaining, providerId)
    const errors = pricingErrorsFor(ctx, [...ctx.products, ...combinedProducts])
    if (errors.length > 0) {
      combined = true
    }
  }

  return { denoms: badDenoms, combined }
}

export function providerSafeMessage(r: { denoms: number[]; combined: boolean }): string | null {
  if (r.denoms.length > 0) {
    const formatted = r.denoms.map((d) => `$${d}`).join(", ")
    return `Estos valores no son compatibles con el catálogo actual: ${formatted}. Quítalos o cámbialos y vuelve a enviar.`
  }
  if (r.combined) {
    return "La combinación de valores no es compatible con el catálogo actual. Prueba quitando alguno y vuelve a enviar."
  }
  return null
}
