"use client"

// Estado global: saldo de Puntos, carrito, órdenes y recargas. Persistido en localStorage (DEMO: manipulable por el usuario).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { WELCOME_POINTS, pointsFor } from "@/lib/catalog"
import { usePublicOffer } from "@/lib/mock/admin-settings"
import { useCatalog } from "@/lib/catalog-store"

export type CartItem = { storeId: string; usd: number; qty: number }
export type RedeemedCode = { storeId: string; usd: number; code: string }
export type Order = { id: string; date: string; points: number; codes: RedeemedCode[]; recipientEmail?: string; message?: string }
export type TopUp = { id: string; date: string; packId: string; points: number; usd: number; last4: string }
type State = { balance: number; cart: CartItem[]; orders: Order[]; topups: TopUp[] }

export type RedeemResult = { ok: true; order: Order } | { ok: false; reason: "empty" | "insufficient"; missing: number }

const STORAGE_KEY = "gc_state_v1"
const initialState: State = { balance: WELCOME_POINTS, cart: [], orders: [], topups: [] }

// Validación estructural (no depende del catálogo): el catálogo se aplica al derivar el carrito.
const isWellFormed = (i: CartItem) =>
  !!i && typeof i.storeId === "string" && Number.isInteger(i.usd) && i.usd > 0 && Number.isInteger(i.qty) && i.qty > 0
const cartTotal = (cart: CartItem[]) => cart.reduce((sum, i) => sum + pointsFor(i.usd) * i.qty, 0)

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const s = JSON.parse(raw) as State
    return {
      balance: Number.isInteger(s.balance) && s.balance >= 0 ? s.balance : 0,
      cart: Array.isArray(s.cart) ? s.cart.filter(isWellFormed) : [],
      orders: Array.isArray(s.orders) ? s.orders : [],
      topups: Array.isArray(s.topups) ? s.topups : [],
    }
  } catch {
    return initialState
  }
}

function genCode(storeId: string) {
  const a = new Uint32Array(2)
  crypto.getRandomValues(a)
  const part = (n: number) => n.toString(36).toUpperCase().padStart(6, "0").slice(-6)
  return `${storeId.slice(0, 3).toUpperCase()}-${part(a[0])}-${part(a[1])}`
}

type Ctx = State & {
  ready: boolean
  cartTotal: number
  cartCount: number
  addToCart: (storeId: string, usd: number) => void
  setQty: (storeId: string, usd: number, qty: number) => void
  clearCart: () => void
  redeem: (opts?: { recipientEmail?: string; message?: string }) => RedeemResult
  topUp: (packId: string, last4: string) => boolean
  /** Compra de un monto en dólares enteros a tu medida (100 pts por $1). */
  topUpCustom: (usd: number, last4: string) => boolean
}

const PointsContext = createContext<Ctx | null>(null)

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState)
  const [ready, setReady] = useState(false)
  const { isAvailable } = useCatalog()
  // Paquetes y compra a tu medida tal como los dejó el administrador (siempre la versión más reciente dentro de callbacks estables)
  const offer = usePublicOffer()
  const offerRef = useRef(offer)
  offerRef.current = offer
  // Siempre el criterio de disponibilidad más reciente, para usarlo dentro de callbacks estables.
  const availRef = useRef(isAvailable)
  availRef.current = isAvailable
  // Ref espejo: las mutaciones leen siempre el estado más reciente (evita doble canje con doble clic).
  const ref = useRef(state)

  const commit = useCallback((next: State) => {
    ref.current = next
    setState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* modo privado */
    }
  }, [])

  useEffect(() => {
    const s = load()
    ref.current = s
    setState(s)
    setReady(true)
  }, [])

  const addToCart = useCallback(
    (storeId: string, usd: number) => {
      if (!availRef.current(storeId, usd)) return
      const s = ref.current
      const exists = s.cart.some((i) => i.storeId === storeId && i.usd === usd)
      const cart = exists
        ? s.cart.map((i) => (i.storeId === storeId && i.usd === usd ? { ...i, qty: i.qty + 1 } : i))
        : [...s.cart, { storeId, usd, qty: 1 }]
      commit({ ...s, cart })
    },
    [commit],
  )

  const setQty = useCallback(
    (storeId: string, usd: number, qty: number) => {
      const s = ref.current
      const cart = s.cart.map((i) => (i.storeId === storeId && i.usd === usd ? { ...i, qty } : i)).filter((i) => i.qty > 0)
      commit({ ...s, cart })
    },
    [commit],
  )

  const clearCart = useCallback(() => commit({ ...ref.current, cart: [] }), [commit])

  // Canje: SOLO descuenta Puntos. Nunca pide datos bancarios.
  const redeem = useCallback(
    (opts: { recipientEmail?: string; message?: string } = {}): RedeemResult => {
      const s = ref.current
      // Solo se canjea lo que sigue disponible en el catálogo (una tienda pudo ocultarse o cambiar de valores).
      const items = s.cart.filter((i) => availRef.current(i.storeId, i.usd))
      if (!items.length) return { ok: false, reason: "empty", missing: 0 }
      const total = cartTotal(items)
      if (total > s.balance) return { ok: false, reason: "insufficient", missing: total - s.balance }
      const codes = items.flatMap((i) => Array.from({ length: i.qty }, () => ({ storeId: i.storeId, usd: i.usd, code: genCode(i.storeId) })))
      const order: Order = { id: `ORD-${Date.now()}`, date: new Date().toISOString(), points: total, codes, ...opts }
      commit({ ...s, balance: s.balance - total, cart: [], orders: [order, ...s.orders] })
      return { ok: true, order }
    },
    [commit],
  )

  // Llamar SOLO después de que la pasarela confirme el pago.
  const topUp = useCallback(
    (packId: string, last4: string) => {
      const pack = offerRef.current.packs.find((p) => p.id === packId)
      if (!pack) return false
      const s = ref.current
      const t: TopUp = { id: `TOP-${Date.now()}`, date: new Date().toISOString(), packId, points: pack.points, usd: pack.usd, last4 }
      commit({ ...s, balance: s.balance + pack.points, topups: [t, ...s.topups] })
      return true
    },
    [commit],
  )

  // Llamar SOLO después de que la pasarela confirme el pago.
  const topUpCustom = useCallback(
    (usd: number, last4: string) => {
      const { minUsd, maxUsd, pointsPerUsd } = offerRef.current.custom
      if (!Number.isInteger(usd) || usd < minUsd || usd > maxUsd) return false
      const s = ref.current
      const points = Math.floor(usd * pointsPerUsd)
      const t: TopUp = { id: `TOP-${Date.now()}`, date: new Date().toISOString(), packId: "custom", points, usd, last4 }
      commit({ ...s, balance: s.balance + points, topups: [t, ...s.topups] })
      return true
    },
    [commit],
  )

  // Carrito visible: solo ítems vigentes en el catálogo actual.
  const cart = useMemo(() => state.cart.filter((i) => isAvailable(i.storeId, i.usd)), [state.cart, isAvailable])

  const value: Ctx = {
    ...state,
    cart,
    ready,
    cartTotal: cartTotal(cart),
    cartCount: cart.reduce((n, i) => n + i.qty, 0),
    addToCart,
    setQty,
    clearCart,
    redeem,
    topUp,
    topUpCustom,
  }

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>
}

export function usePoints() {
  const ctx = useContext(PointsContext)
  if (!ctx) throw new Error("usePoints debe usarse dentro de <PointsProvider>")
  return ctx
}
