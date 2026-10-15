// Catálogo de gift cards y paquetes de Puntos. Fuente única de verdad.

/** Solo referencia histórica; los puntos de una tarjeta salen de useCardPoints() */
export const POINTS_PER_USD = 100
export const WELCOME_POINTS = 500

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
}

/** Catálogo inicial (semilla). El catálogo vigente se lee con `useCatalog()` de lib/catalog-store.tsx. */
export const DEFAULT_STORES: Store[] = [
  { id: "supermaxi", name: "Supermaxi", category: "Supermercado", theme: "super", denoms: [10, 25, 50], description: "Compras del súper para el día a día.", featured: true },
  { id: "megamaxi", name: "Megamaxi", category: "Supermercado", theme: "super", denoms: [25, 50, 100], description: "Hogar, tecnología y supermercado en un solo lugar." },
  { id: "fybeca", name: "Fybeca", category: "Salud y belleza", theme: "salud", denoms: [10, 20, 40], description: "Cuidado personal, salud y belleza.", featured: true },
  { id: "marathon", name: "Marathon Sports", category: "Deportes", theme: "deporte", denoms: [25, 50, 100], description: "Ropa, calzado y equipamiento deportivo.", featured: true },
  { id: "kywi", name: "Kywi", category: "Hogar y ferretería", theme: "hogar", denoms: [20, 50, 100], description: "Herramientas y todo para mejorar tu casa." },
  { id: "jugueton", name: "Juguetón", category: "Juguetes", theme: "juguete", denoms: [15, 30, 60], description: "El regalo perfecto para los más pequeños.", featured: true },
  { id: "deprati", name: "De Prati", category: "Moda", theme: "moda", denoms: [25, 50, 100], description: "Moda, accesorios y decoración." },
]

export type PointsPack = { id: string; points: number; usd: number; badge?: string }

export const pointsFor = (usd: number) => usd * POINTS_PER_USD

/** Dólares enteros necesarios para cubrir `missingPoints` con la compra a tu medida (se redondea hacia arriba y se acota al rango permitido). */
export const usdForPoints = (missingPoints: number, custom = { minUsd: 1, maxUsd: 500, pointsPerUsd: 100 }) =>
  Math.min(custom.maxUsd, Math.max(custom.minUsd, Math.ceil(missingPoints / custom.pointsPerUsd)))
export const formatPoints = (n: number) => new Intl.NumberFormat("es-EC").format(n)
