// Funciones puras de cálculo y validación para el reparto de puntos por comisión.
// Especificación: PLAN-HAIKU-REPARTO-COMISIONES.md Parte O.

import type { DocType, GrantBatch, GrantRow, PointsPack } from "./types"
import { normalizeDocument, validateDocument } from "./documento"

export type BasePack = { usdCents: number; points: number }

/** Tramo más pequeño del Cliente (propio si tiene tabla propia; si no, el estándar). */
export function clientBasePack(
  client: { packMode: "standard" | "custom"; customPacks: PointsPack[] },
  standardPacks: PointsPack[],
): BasePack {
  const packs =
    client.packMode === "custom" && client.customPacks.length > 0
      ? client.customPacks
      : standardPacks
  const sorted = [...packs].sort((a, b) => a.usdCents - b.usdCents)
  const first = sorted[0]
  if (!first) {
    throw new Error("No hay paquetes disponibles para calcular el tramo base.")
  }
  return { usdCents: first.usdCents, points: first.points }
}

/** Puntos de una comisión: división entera hacia abajo, con enteros (sin decimales flotantes). */
export const pointsForCommission = (commissionCents: number, base: BasePack) =>
  Math.floor((commissionCents * base.points) / base.usdCents)

/** Compra exacta de lo que falta, en dólares enteros hacia arriba. */
export function purchaseForMissing(
  missingPoints: number,
  base: BasePack,
): { usd: number; points: number } {
  const cents = Math.ceil((missingPoints * base.usdCents) / base.points)
  const usd = Math.max(1, Math.ceil(cents / 100))
  const points = Math.floor((usd * 100 * base.points) / base.usdCents)
  return { usd, points }
}

export type RawGrantRow = {
  rowNo: number
  tipo: string
  numero: string
  correo: string
  comision: string
  referencia: string
}

export function buildGrantBatch(
  raw: RawGrantRow[],
  base: BasePack,
  fileName: string,
  fileHash: string,
): GrantBatch {
  const seenDocuments = new Map<string, number>()
  const rows: GrantRow[] = []

  for (const r of raw) {
    let error: string | undefined
    let stepFailed = 0 // 1..7

    // 1. Tipo (minúsculas, sin tildes, sin espacios; acepta cedula, ruc, pasaporte)
    const tipoClean = (r.tipo ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    let docType: DocType | null = null
    if (tipoClean === "cedula" || tipoClean === "ruc" || tipoClean === "pasaporte") {
      docType = tipoClean as DocType
    } else {
      error = "Elige Cédula, RUC o Pasaporte."
      stepFailed = 1
    }

    // 2. Número de documento
    let num = (r.numero ?? "").trim()
    if (!error && docType) {
      if (/^\d+$/.test(num)) {
        if (docType === "cedula" && num.length === 9) {
          num = "0" + num
        } else if (docType === "ruc" && num.length === 12) {
          num = "0" + num
        }
      }
      const docCheck = validateDocument(docType, num)
      if (!docCheck.ok) {
        error = docCheck.error
        stepFailed = 2
      }
    }

    // 3. Correo
    const email = (r.correo ?? "").trim().toLowerCase()
    if (!error) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
        error = "El correo electrónico no es válido."
        stepFailed = 3
      }
    }

    // 4. Comisión
    let commissionCents: number | null = null
    if (!error) {
      const comStr = (r.comision ?? "").replace(/\$/g, "").replace(/\s/g, "").replace(",", ".")
      if (!/^\d+(\.\d{1,2})?$/.test(comStr)) {
        error = "Escribe la comisión en dólares (por ejemplo 20 o 20.50)."
        stepFailed = 4
      } else {
        const cents = Math.round(Number(comStr) * 100)
        if (cents === 0) {
          error = "La comisión debe ser mayor que $0."
          stepFailed = 4
        } else if (cents > 10_000_000) {
          error = "La comisión máxima por fila es $100.000."
          stepFailed = 4
        } else {
          commissionCents = cents
        }
      }
    } else {
      const comStr = (r.comision ?? "").replace(/\$/g, "").replace(/\s/g, "").replace(",", ".")
      if (/^\d+(\.\d{1,2})?$/.test(comStr)) {
        const cents = Math.round(Number(comStr) * 100)
        if (cents > 0 && cents <= 10_000_000) {
          commissionCents = cents
        }
      }
    }

    // 5. Puntos
    let points: number | null = null
    if (!error && commissionCents != null) {
      const pts = pointsForCommission(commissionCents, base)
      if (pts === 0) {
        error = "La comisión es muy baja: no alcanza para 1 punto."
        stepFailed = 5
      } else {
        points = pts
      }
    }

    // 6. Referencia
    const ref = (r.referencia ?? "").trim()
    if (!error) {
      if (ref.length > 60) {
        error = "La referencia no puede superar 60 caracteres."
        stepFailed = 6
      }
    }

    // 7. Duplicado
    if (!error && docType) {
      const docKey = `${docType}:${normalizeDocument(num)}`
      if (seenDocuments.has(docKey)) {
        const firstRowNo = seenDocuments.get(docKey)!
        error = `Este documento ya aparece en la fila ${firstRowNo}.`
        stepFailed = 7
      } else {
        seenDocuments.set(docKey, r.rowNo)
      }
    } else if (docType && stepFailed > 2) {
      const docKey = `${docType}:${normalizeDocument(num)}`
      if (!seenDocuments.has(docKey)) {
        seenDocuments.set(docKey, r.rowNo)
      }
    }

    const finalPoints = error && stepFailed < 5 ? null : points

    rows.push({
      rowNo: r.rowNo,
      docType,
      docNumber: num,
      email,
      commissionCents,
      points: finalPoints,
      reference: ref || undefined,
      error: error || undefined,
    })
  }

  const totalPoints = rows
    .filter((r) => !r.error && r.points != null)
    .reduce((sum, r) => sum + r.points!, 0)

  return {
    id: "b-" + fileHash.slice(0, 8),
    fileName,
    fileHash,
    status: "draft",
    rows,
    totalPoints,
  }
}
