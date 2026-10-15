// Tipos del dominio de Regala. Son el CONTRATO entre las pantallas y el backend futuro
// (PLAN-ROLES.md §7). Dinero siempre en centavos enteros; puntos enteros.
// No cambiar nombres ni campos sin avisar: el backend real devolverá exactamente estas formas.

export type Role = "canjeador" | "cliente" | "proveedor" | "admin"

export const ROLE_LABEL: Record<Role, string> = {
  canjeador: "Canjeador",
  cliente: "Cliente",
  proveedor: "Proveedor",
  admin: "Nosotros",
}

export type DocType = "cedula" | "ruc" | "pasaporte"

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  cedula: "Cédula",
  ruc: "RUC",
  pasaporte: "Pasaporte",
}

export type Profile = {
  id: string
  fullName: string
  email: string
  role: Role
  docType: DocType
  docNumber: string
  birthDate: string // YYYY-MM-DD
  termsAcceptedAt: string // ISO
  termsVersion: string
  /** Solo rol Cliente */
  clientId?: string
  /** Solo rol Proveedor */
  providerId?: string
}

// ---------- Puntos por origen (lotes) ----------

export type LotOrigin = "purchase_self" | "grant_client" | "exchange" | "adjustment"

export type PointLot = {
  id: string
  origin: LotOrigin
  /** Nombre del Cliente que repartió los puntos (origin = grant_client) */
  originClientName?: string
  pointsInitial: number
  pointsRemaining: number
  /** Lo que se pagó por cada punto de este lote (USD) */
  usdPerPoint: number
  createdAt: string // ISO
  note?: string
}

export type LedgerKind = "purchase" | "grant_received" | "redeem" | "exchange" | "adjustment"

export type LedgerEntry = {
  id: string
  date: string // ISO
  kind: LedgerKind
  delta: number // + entra, - sale
  description: string
}

// ---------- Tarjetas virtuales ----------

export type CardStatus = "active" | "consumed" | "expired" | "exchanged"

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  active: "Activa",
  consumed: "Consumida",
  expired: "Caducada",
  exchanged: "Cambiada por puntos",
}

export type CardMovementType = "issue" | "consume" | "adjust" | "expire" | "exchange"

export type CardMovement = {
  id: string
  type: CardMovementType
  amountCents: number
  at: string // ISO
  note?: string
}

export type GiftCard = {
  id: string
  storeId: string
  storeName: string
  providerId: string
  faceCents: number
  balanceCents: number
  /** Código visible solo para su dueño */
  code: string
  status: CardStatus
  issuedAt: string // ISO
  expiresAt: string // ISO
  /** Puntos que costó la tarjeta (suma de lotes consumidos) */
  pointsPaid: number
  movements: CardMovement[]
}

/** Resultado de `previewExchange` (el servidor lo calcula; aquí se simula). */
export type ExchangePreview =
  | { allowed: true; pointsBack: number; feePoints: number; feePct: number }
  | { allowed: false; reason: "not_expired" | "window_closed" | "no_balance" | "already_exchanged" }

// ---------- Cliente ----------

export type ClientAccount = {
  id: string
  name: string
  /** Precio que paga por punto (lo fija Nosotros) */
  usdPerPoint: number
  /** % de bono (lo cambia el Cliente). 0.0085 = 0,85 % */
  bonusPct: number
  /** Puntos disponibles en su bolsa */
  bagPoints: number
  packMode: "standard" | "custom"
}

export type PointsPack = {
  id: string
  usdCents: number
  points: number
  badge?: string
}

export type GrantRow = {
  rowNo: number
  docType: DocType | null
  docNumber: string
  email: string
  commissionCents: number | null
  points: number | null
  reference?: string
  /** Mensaje en español si la fila es inválida */
  error?: string
}

export type GrantBatchStatus = "draft" | "sent"

export type GrantBatch = {
  id: string
  fileName: string
  fileHash: string
  status: GrantBatchStatus
  rows: GrantRow[]
  totalPoints: number
  /** Saldo de la bolsa al enviar */
  bagBefore?: number
  /** Si el mismo archivo ya se envió antes */
  alreadySentAt?: string
  sentAt?: string
}

/** Fila de "Lo repartido". El estado es único ("Enviado"): no revela si la persona ya se registró. */
export type GrantedItem = {
  id: string
  batchId: string
  docType: DocType
  docNumber: string
  email?: string
  reference?: string
  points: number
  pointsUsed: number
  sentAt: string // ISO
}

// ---------- Proveedor ----------

export type ProviderTerms = {
  discountPct: number // 0.15 = 15 %
  cardValidDays: number
  effectiveFrom: string // ISO
  settlementNote: string
}

export type ProviderKpis = {
  issuedCount: number
  issuedFaceCents: number
  liveCards: number
  liveBalanceCents: number
  consumedLast30dCents: number
  settlementPendingCents: number
  settlementPaidCents: number
  expiringSoonCount: number
}

/** Fila de la lista de tarjetas del Proveedor. Nunca incluye documento completo ni correo. */
export type ProviderCardRow = {
  id: string
  code: string
  storeName: string
  faceCents: number
  balanceCents: number
  status: CardStatus
  issuedAt: string
  expiresAt: string
  /** Ej.: "María P. · ***4821" */
  holderMasked: string
}

export type SettlementStatus = "pending" | "invoiced" | "paid"

export type Settlement = {
  id: string
  providerId: string
  providerName: string
  period: string // "2026-09"
  consumptions: number
  amountCents: number
  status: SettlementStatus
  invoiceRef?: string
}

// ---------- Administración ----------

export type Provider = {
  id: string
  name: string
  discountPct: number
  cardValidDays: number
  active: boolean
}

export type Product = {
  id: string
  storeId: string
  storeName: string
  providerId: string
  faceCents: number
  /** Si existe, reemplaza face × (1 − descuento) */
  costCentsOverride?: number
  shippingCents: number
  active: boolean
  /** Caducidad propia de esta tarjeta (días). Si no existe, se usa la del Proveedor. */
  cardValidDays?: number
}

export type ClientAdminRow = ClientAccount & {
  customPacks: PointsPack[]
  active: boolean
}

export type AdminSettings = {
  minMarginPct: number
  exchangeFeePct: number
  exchangeWindowDays: number
  pendingGrantDays: number
  /** Los puntos de tarjetas y paquetes son múltiplos de este valor */
  pointsMultiple: number
  /** Multiplica la conversión USD → puntos (entero ≥ 1). Por defecto 1. */
  pointsFactor?: number
  /** Recargo sobre el valor facial al canjear (0.03 = 3 %). Por defecto 3 %. */
  redeemSurchargePct?: number
  /** El paquete más pequeño del Canjeador debe dar al menos este % más de puntos que la tarjeta activa más barata (0.3 = 30 %). */
  minPackHeadroomPct?: number
  /** Límites opcionales del precio por punto (USD) de un cliente. Solo pueden estrechar lo que ya imponen las reglas 2 y 3. */
  pricePerPointMin?: number
  pricePerPointMax?: number
  /** Beneficio mínimo del Cliente sobre el punto de referencia (0.01 = 1 %). Por defecto 1 %. */
  clientBenefitPct?: number
  /** Compra a tu medida del Canjeador (dólares enteros). Por defecto $1 a $500 y 100 pts por $1. */
  customMinUsd?: number
  customMaxUsd?: number
  customPointsPerUsd?: number
  /** Valores de las tarjetas del catálogo (USD y múltiplos de 5). Por defecto 5 y 500. */
  cardDenomMinUsd?: number
  cardDenomMaxUsd?: number
}

export type UserRow = {
  id: string
  fullName: string
  email: string
  role: Role
  docMasked: string
  createdAt: string
  blocked: boolean
}

export type PricingIssue = {
  rule: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  /** Regla 6: qué límite se rompe (precio por debajo del mínimo o por encima del máximo) */
  limit?: "min" | "max"
  severity: "error" | "warning"
  message: string
}
