// Validación de documentos de identidad (PLAN-ROLES.md §6).
// En el backend real se repite en el servidor; esta versión sirve para formularios y para el prototipo.

import type { DocType } from "./types"

/** Mayúsculas, sin espacios ni guiones. */
export const normalizeDocument = (value: string) => value.toUpperCase().replace(/[\s-]/g, "")

/** Deja visibles solo los últimos 4 caracteres: "1712345675" → "******5675". */
export const maskDocument = (value: string) => {
  const v = normalizeDocument(value)
  return v.length <= 4 ? v : `${"*".repeat(v.length - 4)}${v.slice(-4)}`
}

const provinceOk = (v: string) => {
  const p = Number(v.slice(0, 2))
  return (p >= 1 && p <= 24) || p === 30
}

/** Módulo 10 de la cédula ecuatoriana (personas naturales). */
export function isValidCedula(value: string): boolean {
  const v = normalizeDocument(value)
  if (!/^\d{10}$/.test(v) || !provinceOk(v) || Number(v[2]) > 5) return false
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  const sum = coef.reduce((acc, c, i) => {
    let d = Number(v[i]) * c
    if (d > 9) d -= 9
    return acc + d
  }, 0)
  return (10 - (sum % 10)) % 10 === Number(v[9])
}

export type DocumentCheck = { ok: true } | { ok: false; error: string }

/** Validación de formato. RUC de sociedades (tercer dígito 6 o 9): solo se comprueba el formato. */
export function validateDocument(type: DocType, value: string): DocumentCheck {
  const v = normalizeDocument(value)
  if (!v) return { ok: false, error: "Ingresa el número de documento." }
  if (type === "cedula") {
    return isValidCedula(v) ? { ok: true } : { ok: false, error: "La cédula no es válida. Revisa los 10 dígitos." }
  }
  if (type === "ruc") {
    if (!/^\d{13}$/.test(v) || !provinceOk(v) || v.slice(10) === "000") {
      return { ok: false, error: "El RUC no es válido. Debe tener 13 dígitos." }
    }
    if (Number(v[2]) <= 5 && !isValidCedula(v.slice(0, 10))) {
      return { ok: false, error: "El RUC no es válido. Revisa los primeros 10 dígitos." }
    }
    return { ok: true }
  }
  return /^[A-Z0-9]{5,20}$/.test(v)
    ? { ok: true }
    : { ok: false, error: "El pasaporte debe tener entre 5 y 20 letras o números." }
}

/** Años cumplidos a una fecha dada. */
export function ageOn(birthDate: string, on: Date): number {
  const b = new Date(`${birthDate}T00:00:00`)
  let age = on.getFullYear() - b.getFullYear()
  const m = on.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < b.getDate())) age -= 1
  return age
}

export const isAdult = (birthDate: string, on: Date = new Date()) => ageOn(birthDate, on) >= 18
