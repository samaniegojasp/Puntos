"use client"

// Catálogo vigente de gift cards. Parte de DEFAULT_STORES y se puede editar desde /admin.
// DEMO: se guarda en localStorage, así que solo lo ve el navegador donde se editó.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { DEFAULT_STORES, THEMES, type Store } from "@/lib/catalog"

const STORAGE_KEY = "gc_catalog_v1"
export const isActive = (s: Store) => s.active !== false

/** Solo data URLs de imagen raster y de tamaño razonable (nunca SVG). */
const IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_IMAGE_CHARS = 400_000
export const isValidImage = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_IMAGE_CHARS && IMAGE_RE.test(v)

function sanitize(raw: unknown): Store[] | null {
  if (!Array.isArray(raw)) return null
  const out: Store[] = []
  const ids = new Set<string>()
  for (const r of raw) {
    if (!r || typeof r !== "object") return null
    const s = r as Record<string, unknown>
    const denoms = Array.isArray(s.denoms) ? s.denoms : []
    if (
      typeof s.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(s.id) || ids.has(s.id) ||
      typeof s.name !== "string" || !s.name.trim() ||
      typeof s.category !== "string" || !s.category.trim() ||
      typeof s.theme !== "string" || !(s.theme in THEMES) ||
      !denoms.length || denoms.some((d) => !Number.isInteger(d) || d < 1 || d > 500)
    )
      return null
    ids.add(s.id)
    out.push({
      id: s.id,
      name: s.name.trim(),
      category: s.category.trim(),
      theme: s.theme as Store["theme"],
      denoms: [...new Set(denoms as number[])].sort((a, b) => a - b),
      description: typeof s.description === "string" ? s.description : "",
      featured: s.featured === true,
      active: s.active !== false,
      ...(isValidImage(s.image) ? { image: s.image } : {}),
    })
  }
  return out
}

type Ctx = {
  ready: boolean
  /** Solo tiendas activas: lo que ve el público. */
  stores: Store[]
  /** Todas, incluidas las ocultas: para el panel de administración. */
  allStores: Store[]
  categories: string[]
  customized: boolean
  /** Busca entre todas (también ocultas) para poder mostrar carritos y órdenes antiguas. */
  findStore: (id: string) => Store | undefined
  /** ¿Se puede canjear ahora esta tienda con este valor? */
  isAvailable: (storeId: string, usd: number) => boolean
  /** Devuelve false si no se pudo guardar en el navegador (por ejemplo, almacenamiento lleno). */
  saveStore: (store: Store) => boolean
  removeStore: (id: string) => void
  resetCatalog: () => void
}

const CatalogContext = createContext<Ctx | null>(null)

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState<Store[]>(DEFAULT_STORES)
  const [customized, setCustomized] = useState(false)
  const [ready, setReady] = useState(false)
  const ref = useRef(all)

  const load = useCallback(() => {
    let next: Store[] | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      next = raw ? sanitize(JSON.parse(raw)) : null
    } catch {
      next = null
    }
    ref.current = next ?? DEFAULT_STORES
    setAll(ref.current)
    setCustomized(next !== null)
    setReady(true)
  }, [])

  useEffect(() => {
    load()
    // Sincroniza entre pestañas: editar en /admin se refleja en la tienda abierta.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) load()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [load])

  const commit = useCallback((next: Store[]): boolean => {
    ref.current = next
    setAll(next)
    setCustomized(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return true
    } catch {
      /* modo privado o almacenamiento lleno */
      return false
    }
  }, [])

  const saveStore = useCallback(
    (store: Store): boolean => {
      const cur = ref.current
      const exists = cur.some((s) => s.id === store.id)
      return commit(exists ? cur.map((s) => (s.id === store.id ? store : s)) : [...cur, store])
    },
    [commit],
  )

  const removeStore = useCallback((id: string) => commit(ref.current.filter((s) => s.id !== id)), [commit])

  const resetCatalog = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* modo privado */
    }
    ref.current = DEFAULT_STORES
    setAll(DEFAULT_STORES)
    setCustomized(false)
  }, [])

  const value = useMemo<Ctx>(() => {
    const stores = all.filter(isActive)
    return {
      ready,
      stores,
      allStores: all,
      categories: Array.from(new Set(stores.map((s) => s.category))),
      customized,
      findStore: (id) => all.find((s) => s.id === id),
      isAvailable: (storeId, usd) => {
        const s = all.find((x) => x.id === storeId)
        return !!s && isActive(s) && s.denoms.includes(usd)
      },
      saveStore,
      removeStore,
      resetCatalog,
    }
  }, [all, ready, customized, saveStore, removeStore, resetCatalog])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error("useCatalog debe usarse dentro de <CatalogProvider>")
  return ctx
}
