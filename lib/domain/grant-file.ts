// Lector del archivo de reparto (.xlsx o .csv) en el navegador.
// Especificación: PLAN-HAIKU-REPARTO-COMISIONES.md Parte O Paso 3/5.

import type { RawGrantRow } from "./grants"
import { parseCsv } from "./csv"

function cellToText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (value instanceof Date) return ""
  if (typeof value === "object") {
    const v = value as Record<string, unknown>
    if ("formula" in v && typeof v.formula === "string") {
      return "=" + v.formula
    }
    if ("text" in v && typeof v.text === "string") {
      return v.text
    }
    if (Array.isArray(v.richText)) {
      return v.richText.map((part: { text?: string }) => part.text ?? "").join("")
    }
  }
  return String(value)
}

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/**
 * Lee un archivo .xlsx o .csv de reparto en el navegador, calcula su hash SHA-256
 * y devuelve las filas leídas en formato texto para posterior validación.
 */
export async function readGrantFile(
  file: File,
): Promise<{ rows: RawGrantRow[]; fileHash: string }> {
  const name = file.name.toLowerCase()
  if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
    throw new Error("Usa un archivo .xlsx o .csv.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El archivo pesa más de 5 MB.")
  }

  const arrayBuffer = await file.arrayBuffer()

  // Hash SHA-256 en hexadecimal de los bytes
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const fileHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  let table: string[][] = []

  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(arrayBuffer)
    table = parseCsv(text)
  } else {
    const ExcelJS = await import("exceljs")
    const WorkbookClass =
      ExcelJS.Workbook ??
      (ExcelJS as unknown as { default: { Workbook: typeof ExcelJS.Workbook } }).default?.Workbook
    const workbook = new WorkbookClass()
    await workbook.xlsx.load(arrayBuffer)

    const worksheet = workbook.getWorksheet("Reparto") ?? workbook.worksheets[0]
    if (!worksheet) {
      throw new Error("El archivo no tiene hojas de cálculo.")
    }

    const rowCount = worksheet.rowCount
    for (let r = 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r)
      const rowValues: string[] = []
      const maxCol = Math.max(row.cellCount, 10)
      for (let c = 1; c <= maxCol; c++) {
        rowValues.push(cellToText(row.getCell(c).value))
      }
      table.push(rowValues)
    }
  }

  const headerRow = table[0] ?? []

  let tipoIdx = -1
  let numeroIdx = -1
  let correoIdx = -1
  let comisionIdx = -1
  let referenciaIdx = -1

  headerRow.forEach((h, idx) => {
    const norm = normalizeHeader(h)
    if (norm === "tipo_de_documento" || norm === "tipo_documento") tipoIdx = idx
    else if (norm === "numero_de_documento" || norm === "numero_documento") numeroIdx = idx
    else if (norm === "correo_electronico" || norm === "correo") correoIdx = idx
    else if (norm === "valor_de_comision" || norm === "valor_comision" || norm === "comision") comisionIdx = idx
    else if (norm === "referencia") referenciaIdx = idx
  })

  const missing: string[] = []
  if (tipoIdx === -1) missing.push("Tipo de documento")
  if (numeroIdx === -1) missing.push("Número de documento")
  if (correoIdx === -1) missing.push("Correo electrónico")
  if (comisionIdx === -1) missing.push("Valor de comisión ($)")
  if (referenciaIdx === -1) missing.push("Referencia")

  if (missing.length > 0) {
    throw new Error(
      `El archivo no tiene el formato de la plantilla. Faltan las columnas: ${missing.join(", ")}.`,
    )
  }

  const rows: RawGrantRow[] = []
  for (let i = 1; i < table.length; i++) {
    const rowData = table[i] ?? []
    const tipo = (rowData[tipoIdx] ?? "").trim()
    const numero = (rowData[numeroIdx] ?? "").trim()
    const correo = (rowData[correoIdx] ?? "").trim()
    const comision = (rowData[comisionIdx] ?? "").trim()
    const referencia = (rowData[referenciaIdx] ?? "").trim()

    // Salta filas que tengan las 5 celdas vacías
    if (!tipo && !numero && !correo && !comision && !referencia) {
      continue
    }

    rows.push({
      rowNo: i + 1,
      tipo,
      numero,
      correo,
      comision,
      referencia,
    })
  }

  if (rows.length === 0) {
    throw new Error("El archivo no tiene filas con datos.")
  }
  if (rows.length > 1000) {
    throw new Error("El archivo supera las 1.000 filas.")
  }

  return { rows, fileHash }
}
