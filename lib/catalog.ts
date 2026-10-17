// Catálogo de gift cards y paquetes de Puntos. Fuente única de verdad.

/** Solo referencia histórica; los puntos de una tarjeta salen de useCardPoints() */
export const POINTS_PER_USD = 100
/** Debe alcanzar para la tarjeta más barata del catálogo (hoy 1.000 pts con 0 % de recargo). */
export const WELCOME_POINTS = 1100

export type ThemeKey = "super" | "salud" | "deporte" | "hogar" | "juguete" | "moda"

// Degradados propios por categoría (no colores corporativos de las marcas).
export const THEMES: Record<ThemeKey, string> = {
  super: "from-violet-600 to-pink-500",
  salud: "from-sky-500 to-cyan-400",
  deporte: "from-orange-500 to-red-500",
  hogar: "from-emerald-500 to-lime-500",
  juguete: "from-amber-500 to-pink-500",
  moda: "from-indigo-500 to-purple-500",
}

export type Store = {
  id: string
  name: string
  category: string
  theme: ThemeKey
  denoms: number[]
  description: string
  featured?: boolean
  /** Visible en la tienda. `undefined` cuenta como activa. */
  active?: boolean
  /** Imagen completa de la tarjeta (data URL png/jpeg/webp ya reducida). Si existe, reemplaza el degradado. */
  image?: string
  /** Logo (data URL png/jpeg/webp) que se pinta sobre el degradado. Se ignora si hay imagen completa. */
  logo?: string
  /** Colores propios (hex #rrggbb). Si existen, reemplazan al tema. */
  colors?: { from: string; to: string }
}

/** Catálogo inicial (semilla). El catálogo vigente se lee con `useCatalog()` de lib/catalog-store.tsx. */
export const DEFAULT_STORES: Store[] = [
  { id: "supermaxi", name: "Supermaxi", category: "Supermercado", theme: "super", denoms: [10, 25, 50], description: "Compras del súper para el día a día.", featured: true },
  { id: "megamaxi", name: "Megamaxi", category: "Supermercado", theme: "super", denoms: [25, 50, 100], description: "Hogar, tecnología y supermercado en un solo lugar." },
  { id: "fybeca", name: "Fybeca", category: "Salud y belleza", theme: "salud", denoms: [10, 20, 40], description: "Cuidado personal, salud y belleza.", featured: true },
  { id: "marathon", name: "Marathon Sports", category: "Deportes", theme: "deporte", denoms: [25, 50, 100], description: "Ropa, calzado y equipamiento deportivo.", featured: true },
  { id: "kywi", name: "Kywi", category: "Hogar y ferretería", theme: "hogar", denoms: [20, 50, 100], description: "Herramientas y todo para mejorar tu casa." },
  { id: "jugueton", name: "Juguetón", category: "Juguetes", theme: "juguete", denoms: [15, 30, 60], description: "El regalo perfecto para los más pequeños.", featured: true },
  { id: "deprati", name: "De Prati", category: "Moda", theme: "moda", denoms: [25, 50, 100], description: "Moda, accesorios y decoración.", active: false },
]

export type PointsPack = { id: string; points: number; usd: number; badge?: string }

export const pointsFor = (usd: number) => usd * POINTS_PER_USD

/** Dólares enteros necesarios para cubrir `missingPoints` con la compra a tu medida (se redondea hacia arriba y se acota al rango permitido). */
export const usdForPoints = (missingPoints: number, custom = { minUsd: 1, maxUsd: 500, pointsPerUsd: 100 }) =>
  Math.min(custom.maxUsd, Math.max(custom.minUsd, Math.ceil(missingPoints / custom.pointsPerUsd)))

/** Paquete fijo más pequeño que cubre `missingPoints`; si ninguno alcanza, el más grande. */
export const packForPoints = (missingPoints: number, packs: PointsPack[]) => {
  const sorted = [...packs].sort((a, b) => a.points - b.points)
  return sorted.find((p) => p.points >= missingPoints) ?? sorted[sorted.length - 1]
}
export const formatPoints = (n: number) => new Intl.NumberFormat("es-EC").format(n)

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)

export function isLightColor(hex: string): boolean {
  if (!isHexColor(hex)) return false
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return luminance > 0.6
}
