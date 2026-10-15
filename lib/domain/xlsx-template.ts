// Generador de la plantilla de reparto en formato Excel (.xlsx).
// Prototipo: genera el archivo en el navegador usando exceljs de forma dinámica.
// En producción el servidor generará este archivo (ver PLAN-BACKEND.md).

import { DOC_TYPE_LABEL } from "@/lib/domain/types"

/**
 * Genera y descarga en el navegador la plantilla Excel (.xlsx) para el reparto de puntos.
 * Debe ejecutarse únicamente en el cliente (manejador de eventos).
 */
export async function downloadGrantTemplate(rowCount: number): Promise<void> {
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > 1000) {
    throw new Error("La cantidad de filas debe ser un número entero entre 1 y 1.000.")
  }

  // Import dinámico para que no sobrecargue el bundle inicial de la página
  const ExcelJS = await import("exceljs")
  const WorkbookClass = ExcelJS.Workbook ?? (ExcelJS as unknown as { default: { Workbook: typeof ExcelJS.Workbook } }).default?.Workbook
  const workbook = new WorkbookClass()

  // --------------------------------------------------------------------------
  // Hoja 1: "Reparto" (la que abre Excel por defecto)
  // --------------------------------------------------------------------------
  const wsReparto = workbook.addWorksheet("Reparto", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  wsReparto.columns = [
    { header: "tipo_documento", key: "tipo_documento", width: 18 },
    { header: "numero_documento", key: "numero_documento", width: 22 },
    { header: "puntos", key: "puntos", width: 12 },
    { header: "monto_venta", key: "monto_venta", width: 14 },
    { header: "referencia", key: "referencia", width: 28 },
  ]

  // Fila de encabezados: negrita y fondo gris claro
  const headerRow = wsReparto.getRow(1)
  headerRow.font = { bold: true }
  for (let c = 1; c <= 5; c++) {
    headerRow.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F2F2" },
    }
  }

  const lastRow = rowCount + 1
  const docTypes = Object.values(DOC_TYPE_LABEL).join(",")

  // Tipado para dataValidations (exceljs lo implementa en runtime pero lo omitió de index.d.ts)
  type WorksheetWithValidations = {
    dataValidations: {
      add: (range: string, validation: Record<string, unknown>) => void
    }
  }
  const wsValidations = (wsReparto as unknown as WorksheetWithValidations).dataValidations

  // Validaciones por rango para toda la cuadrícula de datos
  wsValidations.add(`A2:A${lastRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`"${docTypes}"`],
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Tipo de documento",
    error: "Elige Cédula, RUC o Pasaporte de la lista.",
    showInputMessage: true,
    promptTitle: "Tipo de documento",
    prompt: "Elige de la lista.",
  })

  wsValidations.add(`C2:C${lastRow}`, {
    type: "whole",
    operator: "between",
    formulae: [1, 10000000],
    allowBlank: true,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Puntos inválidos",
    error: "Escribe un número entero de puntos mayor que 0 (o deja la celda vacía y completa monto_venta).",
  })

  wsValidations.add(`D2:D${lastRow}`, {
    type: "decimal",
    operator: "greaterThanOrEqual",
    formulae: [0],
    allowBlank: true,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Monto de venta inválido",
    error: "Escribe el monto en dólares (por ejemplo 250 o 250.50).",
  })

  wsValidations.add(`E2:E${lastRow}`, {
    type: "textLength",
    operator: "lessThanOrEqual",
    formulae: [60],
    allowBlank: true,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Referencia demasiado larga",
    error: "La referencia no puede superar los 60 caracteres.",
  })

  // Formato numérico y de texto en las filas de datos
  for (let r = 2; r <= lastRow; r++) {
    const row = wsReparto.getRow(r)
    row.getCell(2).numFmt = "@"
    row.getCell(4).numFmt = "0.00"
    row.getCell(5).numFmt = "@"
  }

  // Ejemplos en filas 2 y 3 (el segundo documento conserva su cero inicial como texto)
  if (rowCount >= 1) {
    const row2 = wsReparto.getRow(2)
    row2.getCell(1).value = "Cédula"
    row2.getCell(2).value = "1712345675"
    row2.getCell(3).value = 2000
    row2.getCell(5).value = "Factura 001-0451"
  }

  if (rowCount >= 2) {
    const row3 = wsReparto.getRow(3)
    row3.getCell(1).value = "Cédula"
    row3.getCell(2).value = "0908765431"
    row3.getCell(4).value = 250
    row3.getCell(5).value = "Factura 001-0452"
  }

  // --------------------------------------------------------------------------
  // Hoja 2: "Instrucciones"
  // --------------------------------------------------------------------------
  const wsInstrucciones = workbook.addWorksheet("Instrucciones")
  wsInstrucciones.getColumn(1).width = 100

  const instructions = [
    "1. Llena una persona por fila en la hoja Reparto. No cambies los encabezados ni el orden de las columnas.",
    "2. tipo_documento: elige de la lista (Cédula, RUC o Pasaporte).",
    "3. numero_documento: escríbelo tal cual, con ceros iniciales. Sin espacios ni guiones.",
    "4. puntos: número entero mayor que 0. Si lo dejas vacío y completas monto_venta, calculamos los puntos con tu bono.",
    "5. monto_venta y referencia son opcionales (ejemplo de referencia: Factura 001-0451).",
    `6. Esta plantilla tiene ${rowCount} filas. El máximo por reparto es de 1.000 filas y 5 MB.`,
    "7. Si pegas valores desde otro archivo, la lista desplegable puede perderse: la revisión de Regala volverá a validar cada fila.",
    "8. Revisar el archivo no cambia nada. Los puntos solo se descuentan al confirmar el envío.",
  ]

  instructions.forEach((text, i) => {
    const cell = wsInstrucciones.getCell(i + 1, 1)
    cell.value = text
    cell.alignment = { wrapText: true }
  })

  // --------------------------------------------------------------------------
  // Descarga en el navegador
  // --------------------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla-reparto-puntos.xlsx"
  a.click()
  URL.revokeObjectURL(url)
}
