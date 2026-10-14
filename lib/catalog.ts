// Catálogo de gift cards y paquetes de Puntos. Fuente única de verdad.

/** Puntos que cuesta cada $1 de valor facial. El mejor paquete da ~143 pts/$; por debajo se vende con pérdida. */
export const POINTS_PER_USD = 150
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

export const PACKS: PointsPack[] = [
  { id: "p1000", points: 1000, usd: 10 },
  { id: "p2500", points: 2500, usd: 20, badge: "Popular" },
  { id: "p5000", points: 5000, usd: 35, badge: "Mejor valor" },
]

export const pointsFor = (usd: number) => usd * POINTS_PER_USD
export const formatPoints = (n: number) => new Intl.NumberFormat("es-EC").format(n)
