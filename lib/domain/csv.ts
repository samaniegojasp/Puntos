// Exportación CSV para el prototipo. El reparto usa .xlsx (lib/domain/xlsx-template.ts); el CSV queda como alternativa y para los resúmenes.
// Separador ";" (el que abre bien Excel con configuración regional en español) y BOM UTF-8 para las tildes.

const FORMULA_START = /^[=+\-@\t\r]/

/** Escapa una celda. Un texto que empiece por = + - @ se neutraliza con ' para evitar inyección de fórmulas en Excel. */
export function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value)
  if (typeof value === "string" && FORMULA_START.test(s)) s = `'${s}`
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n")
}

/** Descarga un CSV en el navegador. Solo usar en manejadores de eventos (cliente). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(["﻿", toCsv(headers, rows)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
