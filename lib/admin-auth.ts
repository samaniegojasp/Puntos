// Acceso al panel /admin. DEMO: la comprobación ocurre en el navegador, así que frena el acceso casual
// pero NO es seguridad real. El control de verdad exige un servidor (ver README, "Antes de producción").
const HASH = process.env.NEXT_PUBLIC_ADMIN_HASH?.trim().toLowerCase() ?? ""
const SESSION_KEY = "gc_admin"

export const adminConfigured = HASH.length === 64

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyAdmin(passphrase: string) {
  if (!adminConfigured) return false
  const ok = (await sha256Hex(passphrase)) === HASH
  if (ok) {
    try {
      sessionStorage.setItem(SESSION_KEY, HASH)
    } catch {
      /* modo privado */
    }
  }
  return ok
}

export function hasAdminSession() {
  try {
    return adminConfigured && sessionStorage.getItem(SESSION_KEY) === HASH
  } catch {
    return false
  }
}

export function endAdminSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* modo privado */
  }
}
