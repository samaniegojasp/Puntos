// Datos de EJEMPLO para el prototipo (Fase D). No son reales y se descartan cuando entre el backend.
// Usan los tipos de lib/domain/types.ts. "Hoy" está fijo para que los estados (caducada, por vencer) no cambien.

import type {
  AdminSettings,
  ClientAccount,
  ClientAdminRow,
  GiftCard,
  GrantBatch,
  GrantedItem,
  LedgerEntry,
  PointLot,
  PointsPack,
  Product,
  Profile,
  Provider,
  ProviderCardRow,
  ProviderKpis,
  ProviderTerms,
  Role,
  Settlement,
  UserRow,
} from "@/lib/domain/types"

export const MOCK_NOW = new Date("2026-10-14T12:00:00-05:00")

// ---------- Perfiles (uno por rol) ----------

export const MOCK_PROFILES: Record<Role, Profile> = {
  canjeador: {
    id: "u-ana", fullName: "Ana Mora", email: "ana.mora@ejemplo.ec", role: "canjeador",
    docType: "cedula", docNumber: "1712345675", birthDate: "1994-05-12",
    termsAcceptedAt: "2026-01-02T10:00:00-05:00", termsVersion: "2026-01",
  },
  cliente: {
    id: "u-luis", fullName: "Luis Paredes", email: "luis@concesionariaandina.ec", role: "cliente",
    docType: "ruc", docNumber: "1790012345001", birthDate: "1982-11-03",
    termsAcceptedAt: "2026-05-20T09:30:00-05:00", termsVersion: "2026-06", clientId: "c-andina",
  },
  proveedor: {
    id: "u-fybeca", fullName: "Equipo Fybeca", email: "convenios@fybeca.ejemplo.ec", role: "proveedor",
    docType: "ruc", docNumber: "1790098765001", birthDate: "1990-01-01",
    termsAcceptedAt: "2026-05-22T15:00:00-05:00", termsVersion: "2026-06", providerId: "p-fybeca",
  },
  admin: {
    id: "u-admin", fullName: "Dueño de Regala", email: "admin@regala.ejemplo.ec", role: "admin",
    docType: "cedula", docNumber: "1704567898", birthDate: "1988-03-25",
    termsAcceptedAt: "2026-05-01T08:00:00-05:00", termsVersion: "2026-06",
  },
}

// ---------- Canjeador: puntos por origen (del más antiguo al más nuevo) ----------

export const MOCK_LOTS: PointLot[] = [
  { id: "lot-1", origin: "grant_client", originClientName: "Concesionaria Andina", pointsInitial: 21250, pointsRemaining: 14750, usdPerPoint: 0.008, createdAt: "2026-07-18T11:00:00-05:00", note: "Bono por compra de vehículo" },
  { id: "lot-2", origin: "purchase_self", pointsInitial: 2600, pointsRemaining: 2600, usdPerPoint: 0.009615, createdAt: "2026-08-30T16:20:00-05:00" },
  { id: "lot-3", origin: "grant_client", originClientName: "Ferretería La Unión", pointsInitial: 1000, pointsRemaining: 1000, usdPerPoint: 0.0085, createdAt: "2026-09-21T09:10:00-05:00" },
  { id: "lot-4", origin: "exchange", pointsInitial: 2160, pointsRemaining: 2160, usdPerPoint: 0.008, createdAt: "2026-10-02T10:00:00-05:00", note: "Cambio de tarjeta caducada" },
]

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: "l-1", date: "2026-07-18T11:00:00-05:00", kind: "grant_received", delta: 21250, description: "Puntos de Concesionaria Andina" },
  { id: "l-2", date: "2026-08-02T18:45:00-05:00", kind: "redeem", delta: -3500, description: "Tarjeta Fybeca $30" },
  { id: "l-3", date: "2026-08-30T16:20:00-05:00", kind: "purchase", delta: 2600, description: "Compra de puntos ($25)" },
  { id: "l-4", date: "2026-09-21T09:10:00-05:00", kind: "grant_received", delta: 1000, description: "Puntos de Ferretería La Unión" },
  { id: "l-5", date: "2026-10-02T10:00:00-05:00", kind: "exchange", delta: 2160, description: "Cambio de tarjeta caducada Kywi $20" },
  { id: "l-6", date: "2026-10-09T08:30:00-05:00", kind: "redeem", delta: -3000, description: "Tarjeta Supermaxi $25" },
]

// ---------- Canjeador: tarjetas en todos los estados ----------

const c = (n: number) => n * 100

export const MOCK_CARDS: GiftCard[] = [
  {
    id: "card-1", storeId: "fybeca", storeName: "Fybeca", providerId: "p-fybeca", faceCents: c(30), balanceCents: c(18),
    code: "FYB-7K2M-9QX4", status: "active", issuedAt: "2026-08-02T18:45:00-05:00", expiresAt: "2027-02-02T18:45:00-05:00", pointsPaid: 3500,
    movements: [
      { id: "m-1", type: "issue", amountCents: c(30), at: "2026-08-02T18:45:00-05:00" },
      { id: "m-2", type: "consume", amountCents: c(12), at: "2026-09-10T13:05:00-05:00", note: "Fybeca Quicentro" },
    ],
  },
  {
    id: "card-2", storeId: "supermaxi", storeName: "Supermaxi", providerId: "p-supermaxi", faceCents: c(25), balanceCents: c(25),
    code: "SMX-3D8P-6TLB", status: "active", issuedAt: "2026-10-09T08:30:00-05:00", expiresAt: "2026-11-02T08:30:00-05:00", pointsPaid: 3000,
    movements: [{ id: "m-3", type: "issue", amountCents: c(25), at: "2026-10-09T08:30:00-05:00" }],
  },
  {
    id: "card-3", storeId: "marathon", storeName: "Marathon Sports", providerId: "p-marathon", faceCents: c(50), balanceCents: c(50),
    code: "MAR-5H1N-2WRC", status: "expired", issuedAt: "2026-02-01T10:00:00-05:00", expiresAt: "2026-10-01T10:00:00-05:00", pointsPaid: 6000,
    movements: [
      { id: "m-4", type: "issue", amountCents: c(50), at: "2026-02-01T10:00:00-05:00" },
      { id: "m-5", type: "expire", amountCents: c(50), at: "2026-10-01T10:00:00-05:00" },
    ],
  },
  {
    id: "card-4", storeId: "kywi", storeName: "Kywi", providerId: "p-kywi", faceCents: c(20), balanceCents: 0,
    code: "KYW-8B4Z-1MNE", status: "exchanged", issuedAt: "2026-01-10T12:00:00-05:00", expiresAt: "2026-09-20T12:00:00-05:00", pointsPaid: 2400,
    movements: [
      { id: "m-6", type: "issue", amountCents: c(20), at: "2026-01-10T12:00:00-05:00" },
      { id: "m-7", type: "expire", amountCents: c(20), at: "2026-09-20T12:00:00-05:00" },
      { id: "m-8", type: "exchange", amountCents: c(20), at: "2026-10-02T10:00:00-05:00", note: "2.160 puntos devueltos (recargo 10 %)" },
    ],
  },
  {
    id: "card-5", storeId: "jugueton", storeName: "Juguetón", providerId: "p-jugueton", faceCents: c(15), balanceCents: 0,
    code: "JUG-2C9V-5AKD", status: "consumed", issuedAt: "2026-06-14T17:00:00-05:00", expiresAt: "2026-12-14T17:00:00-05:00", pointsPaid: 1800,
    movements: [
      { id: "m-9", type: "issue", amountCents: c(15), at: "2026-06-14T17:00:00-05:00" },
      { id: "m-10", type: "consume", amountCents: c(15), at: "2026-06-20T11:40:00-05:00", note: "Juguetón El Recreo" },
    ],
  },
  {
    id: "card-6", storeId: "deprati", storeName: "De Prati", providerId: "p-deprati", faceCents: c(25), balanceCents: c(25),
    code: "DEP-6F3Y-7JQS", status: "expired", issuedAt: "2026-01-05T09:00:00-05:00", expiresAt: "2026-08-20T09:00:00-05:00", pointsPaid: 3000,
    movements: [
      { id: "m-11", type: "issue", amountCents: c(25), at: "2026-01-05T09:00:00-05:00" },
      { id: "m-12", type: "expire", amountCents: c(25), at: "2026-08-20T09:00:00-05:00" },
    ],
  },
]

// ---------- Cliente ----------

export const MOCK_CLIENT: ClientAccount = {
  id: "c-andina", name: "Concesionaria Andina", usdPerPoint: 0.00971984, bonusPct: 0.0085, bagPoints: 38000, packMode: "custom",
}

/** Paquetes estándar (precio por volumen). Ilustrativos. */
export const MOCK_STANDARD_PACKS: PointsPack[] = [
  { id: "std-10", usdCents: c(10), points: 1020 },
  { id: "std-50", usdCents: c(50), points: 5140, badge: "Popular" },
  { id: "std-100", usdCents: c(100), points: 10280, badge: "Mejor valor" },
]

/** Paquetes que ve un Canjeador (cada punto cuesta más que al Cliente). */
export const MOCK_PUBLIC_PACKS: PointsPack[] = [
  { id: "pub-10", usdCents: c(10), points: 1000 },
  { id: "pub-25", usdCents: c(25), points: 2500, badge: "Popular" },
  { id: "pub-50", usdCents: c(50), points: 5100, badge: "Mejor valor" },
]

export const MOCK_CLIENT_PACKS: PointsPack[] = [
  { id: "cp-1", usdCents: c(170), points: 17490 },
  { id: "cp-2", usdCents: c(400), points: 41150, badge: "Acuerdo" },
]

const row = (rowNo: number, docNumber: string, points: number | null, extra: Partial<GrantBatch["rows"][number]> = {}) => ({
  rowNo, docType: "cedula" as const, docNumber, points, ...extra,
})

/** Los 4 escenarios de la pantalla "Repartir". El prototipo los carga con un selector. */
export const MOCK_BATCHES: Record<"ok" | "errors" | "insufficient" | "duplicate", GrantBatch> = {
  ok: {
    id: "b-ok", fileName: "reparto-octubre.xlsx", status: "draft", bagBefore: 38000, totalPoints: 7350,
    rows: [
      row(2, "1712345675", 2000, { reference: "Factura 001-0451" }),
      row(3, "0908765431", 1850, { reference: "Factura 001-0452" }),
      row(4, "1704567898", 1500, { saleAmountCents: c(20000), reference: "Factura 001-0453" }),
      row(5, "1711111110", 2000),
    ],
  },
  errors: {
    id: "b-err", fileName: "reparto-con-errores.xlsx", status: "draft", bagBefore: 38000, totalPoints: 6500,
    rows: [
      row(2, "1712345675", 2000),
      row(3, "1712345670", 1500, { error: "La cédula no es válida. Revisa los 10 dígitos." }),
      row(4, "0908765431", 1000),
      row(5, "1704567898", 0, { error: "Los puntos deben ser un número entero mayor que 0." }),
      row(6, "1711111110", 2000),
    ],
  },
  insufficient: {
    id: "b-ins", fileName: "reparto-grande.xlsx", status: "draft", bagBefore: 38000, totalPoints: 45000,
    rows: [row(2, "1712345675", 20000), row(3, "0908765431", 15000), row(4, "1704567898", 10000)],
  },
  duplicate: {
    id: "b-dup", fileName: "reparto-septiembre.xlsx", status: "draft", bagBefore: 38000, totalPoints: 3000,
    alreadySentAt: "2026-09-30T17:00:00-05:00",
    rows: [row(2, "1712345675", 1000), row(3, "0908765431", 1000), row(4, "1704567898", 1000)],
  },
}

export const MOCK_GRANTED: GrantedItem[] = [
  { id: "g-1", batchId: "b-sep", docType: "cedula", docNumber: "1712345675", reference: "Factura 001-0398", points: 21250, pointsUsed: 3400, sentAt: "2026-07-18T11:00:00-05:00" },
  { id: "g-2", batchId: "b-sep", docType: "cedula", docNumber: "0908765431", reference: "Factura 001-0399", points: 12000, pointsUsed: 0, sentAt: "2026-07-18T11:00:00-05:00" },
  { id: "g-3", batchId: "b-sep", docType: "cedula", docNumber: "1704567898", points: 8500, pointsUsed: 8500, sentAt: "2026-07-18T11:00:00-05:00" },
  { id: "g-4", batchId: "b-oct", docType: "pasaporte", docNumber: "PA123456", reference: "Factura 001-0440", points: 5000, pointsUsed: 0, sentAt: "2026-09-30T17:00:00-05:00" },
  { id: "g-5", batchId: "b-oct", docType: "cedula", docNumber: "1711111110", points: 3000, pointsUsed: 1200, sentAt: "2026-09-30T17:00:00-05:00" },
]

// ---------- Proveedor (Fybeca) ----------

export const MOCK_PROVIDER_TERMS: ProviderTerms = {
  discountPct: 0.12, cardValidDays: 180, effectiveFrom: "2026-05-22T00:00:00-05:00",
  settlementNote: "Se te paga por cada consumo registrado en caja, liquidado cada mes.",
}

export const MOCK_PROVIDER_KPIS: ProviderKpis = {
  issuedCount: 214, issuedFaceCents: c(6420), liveCards: 96, liveBalanceCents: c(2310),
  consumedLast30dCents: c(1580), settlementPendingCents: c(1311), settlementPaidCents: c(3902), expiringSoonCount: 7,
}

export const MOCK_PROVIDER_CARDS: ProviderCardRow[] = [
  { id: "pc-1", code: "FYB-7K2M-9QX4", storeName: "Fybeca", faceCents: c(30), balanceCents: c(18), status: "active", issuedAt: "2026-08-02T18:45:00-05:00", expiresAt: "2027-02-02T18:45:00-05:00", holderMasked: "Ana M. · ******5675" },
  { id: "pc-2", code: "FYB-1X5R-8HDA", storeName: "Fybeca", faceCents: c(20), balanceCents: c(20), status: "active", issuedAt: "2026-09-28T10:00:00-05:00", expiresAt: "2026-10-24T10:00:00-05:00", holderMasked: "Pedro R. · ******5431" },
  { id: "pc-3", code: "FYB-9N6T-3KWE", storeName: "Fybeca", faceCents: c(10), balanceCents: 0, status: "consumed", issuedAt: "2026-07-01T09:00:00-05:00", expiresAt: "2027-01-01T09:00:00-05:00", holderMasked: "Sofía L. · ******7898" },
  { id: "pc-4", code: "FYB-4B7Q-2ZVM", storeName: "Fybeca", faceCents: c(40), balanceCents: c(40), status: "expired", issuedAt: "2026-02-10T09:00:00-05:00", expiresAt: "2026-08-10T09:00:00-05:00", holderMasked: "Carlos T. · ******1110" },
  { id: "pc-5", code: "FYB-6M3S-5PJC", storeName: "Fybeca", faceCents: c(20), balanceCents: c(20), status: "exchanged", issuedAt: "2026-03-05T09:00:00-05:00", expiresAt: "2026-09-05T09:00:00-05:00", holderMasked: "Elena V. · ******9338" },
]

export const MOCK_SETTLEMENTS: Settlement[] = [
  { id: "s-1", providerId: "p-fybeca", providerName: "Fybeca", period: "2026-08", consumptions: 41, amountCents: c(1980), status: "paid", invoiceRef: "001-001-000412" },
  { id: "s-2", providerId: "p-fybeca", providerName: "Fybeca", period: "2026-09", consumptions: 38, amountCents: c(1922), status: "paid", invoiceRef: "001-001-000437" },
  { id: "s-3", providerId: "p-fybeca", providerName: "Fybeca", period: "2026-10", consumptions: 29, amountCents: c(1311), status: "pending" },
  { id: "s-4", providerId: "p-supermaxi", providerName: "Supermaxi", period: "2026-09", consumptions: 77, amountCents: c(3240), status: "invoiced", invoiceRef: "FAC-2201" },
  { id: "s-5", providerId: "p-marathon", providerName: "Marathon Sports", period: "2026-09", consumptions: 12, amountCents: c(940), status: "pending" },
]

// ---------- Administración ----------

export const MOCK_PROVIDERS: Provider[] = [
  { id: "p-supermaxi", name: "Supermaxi / Megamaxi", discountPct: 0.08, cardValidDays: 180, active: true },
  { id: "p-fybeca", name: "Fybeca", discountPct: 0.12, cardValidDays: 180, active: true },
  { id: "p-marathon", name: "Marathon Sports", discountPct: 0.10, cardValidDays: 365, active: true },
  { id: "p-kywi", name: "Kywi", discountPct: 0.09, cardValidDays: 180, active: true },
  { id: "p-jugueton", name: "Juguetón", discountPct: 0.05, cardValidDays: 180, active: true },
  { id: "p-deprati", name: "De Prati", discountPct: 0.07, cardValidDays: 240, active: false },
]

const prod = (id: string, storeId: string, storeName: string, providerId: string, face: number, margin = 0.15, active = true): Product => ({
  id, storeId, storeName, providerId, faceCents: c(face), shippingCents: 0, marginPct: margin, active,
})

export const MOCK_PRODUCTS: Product[] = [
  prod("pr-1", "supermaxi", "Supermaxi", "p-supermaxi", 10, 0.08),
  prod("pr-2", "supermaxi", "Supermaxi", "p-supermaxi", 25, 0.08),
  prod("pr-3", "fybeca", "Fybeca", "p-fybeca", 10, 0.12),
  prod("pr-4", "fybeca", "Fybeca", "p-fybeca", 30, 0.12),
  prod("pr-5", "marathon", "Marathon Sports", "p-marathon", 50, 0.10),
  prod("pr-6", "kywi", "Kywi", "p-kywi", 20, 0.09),
  prod("pr-7", "jugueton", "Juguetón", "p-jugueton", 15, 0.05),
  prod("pr-8", "deprati", "De Prati", "p-deprati", 25, 0.07, false),
]

export const MOCK_CLIENTS_ADMIN: ClientAdminRow[] = [
  { ...MOCK_CLIENT, customPacks: MOCK_CLIENT_PACKS, active: true },
  { id: "c-union", name: "Ferretería La Unión", usdPerPoint: 0.0098039, bonusPct: 0.01, bagPoints: 4200, packMode: "standard", customPacks: [], active: true },
  { id: "c-pacifico", name: "Clínica Pacífico", usdPerPoint: 0.0098039, bonusPct: 0.005, bagPoints: 0, packMode: "standard", customPacks: [], active: false },
]

export const MOCK_SETTINGS: AdminSettings = {
  minMarginPct: 0.02, exchangeFeePct: 0.1, exchangeWindowDays: 30, pendingGrantDays: 90, pointsMultiple: 100, pointsFactor: 1, clientBenefitPct: 0.01, customMinUsd: 1, customMaxUsd: 500, customPointsPerUsd: 100, cardDenomMinUsd: 5, cardDenomMaxUsd: 500,
}

export const MOCK_USERS: UserRow[] = [
  { id: "u-admin", fullName: "Dueño de Regala", email: "admin@regala.ejemplo.ec", role: "admin", docMasked: "******7898", createdAt: "2026-05-01T08:00:00-05:00", blocked: false },
  { id: "u-luis", fullName: "Luis Paredes", email: "luis@concesionariaandina.ec", role: "cliente", docMasked: "*********001", createdAt: "2026-05-20T09:30:00-05:00", blocked: false },
  { id: "u-fybeca", fullName: "Equipo Fybeca", email: "convenios@fybeca.ejemplo.ec", role: "proveedor", docMasked: "*********001", createdAt: "2026-05-22T15:00:00-05:00", blocked: false },
  { id: "u-ana", fullName: "Ana Mora", email: "ana.mora@ejemplo.ec", role: "canjeador", docMasked: "******5675", createdAt: "2026-06-02T10:00:00-05:00", blocked: false },
  { id: "u-pedro", fullName: "Pedro Ramírez", email: "pedro.r@ejemplo.ec", role: "canjeador", docMasked: "******5431", createdAt: "2026-07-11T19:12:00-05:00", blocked: false },
  { id: "u-spam", fullName: "Cuenta sospechosa", email: "x1@ejemplo.ec", role: "canjeador", docMasked: "PAS****", createdAt: "2026-09-29T03:00:00-05:00", blocked: true },
]
