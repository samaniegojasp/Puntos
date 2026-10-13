// Validación de tarjeta para la recarga SIMULADA. En producción usar el formulario alojado de la pasarela (Payphone/Kushki/Datafast).

export type CardInput = { holder: string; number: string; exp: string; cvv: string }
export type CardErrors = Partial<Record<keyof CardInput, string>>

const luhn = (digits: string) => {
  let sum = 0
  let dbl = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0
}

export function validateCard({ holder, number, exp, cvv }: CardInput): CardErrors {
  const errors: CardErrors = {}
  if (holder.trim().length < 3) errors.holder = "Ingresa el nombre del titular."
  if (!luhn(number.replace(/\D/g, ""))) errors.number = "Número de tarjeta inválido."
  const m = /^(\d{2})\/(\d{2})$/.exec(exp)
  // new Date(año, mes) = primer día del mes siguiente al vencimiento
  if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1]) <= new Date()) errors.exp = "Fecha inválida o vencida."
  if (!/^\d{3,4}$/.test(cvv)) errors.cvv = "CVV inválido."
  return errors
}

export const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim()
export const formatExp = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
