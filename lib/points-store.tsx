"use client"

// Estado global: saldo de Puntos, carrito, órdenes y recargas. Persistido en localStorage (DEMO: manipulable por el usuario).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { PACKS, WELCOME_POINTS, findStore, pointsFor } from "@/lib/catalog"

export type CartItem = { storeId: string; usd: number; qty: number }
export type RedeemedCode = { storeId: string; usd: number; code: string }
export type Order = { id: string; date: string; points: number; codes: RedeemedCode[]; recipientEmail?: string; message?: string }
export type TopUp = { id: string; date: string; packId: string; points: number; usd: number; last4: string }
type State = { balance: number; cart: CartItem[]; orders: Order[]; topups: TopUp[] }

export type RedeemResult = { ok: true; order: Order } | { ok: false; reason: "empty" | "insufficient"; missing: number }

const STORAGE_KEY = "gc_state_v1"
const initialState: State = { balance: WELCOME_POINTS, cart: [], orders: [], topups: [] }

const isValidItem = (i: CartItem) => {
  const s = findStore(i.storeId)
  return !!s && s.denoms.includes(i.usd) && Number.isInteger(i.qty) && i.qty > 0
}
const cartTotal = (cart: CartItem[]) => cart.reduce((sum, i) => sum + pointsFor(i.usd) * i.qty, 0)

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const s = JSON.parse(raw) as State
    return {
      balance: Number.isInteger(s.balance) && s.balance >= 0 ? s.balance : 0,
      cart: Array.isArray(s.cart) ? s.cart.filter(isValidItem) : [],
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
}

const PointsContext = createContext<Ctx | null>(null)

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState)
  const [ready, setReady] = useState(false)
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
      const s = ref.current
      const exists = s.cart.some((i) => i.storeId === storeId && i.usd === usd)
      const cart = exists
        ? s.cart.map((i) => (i.storeId === storeId && i.usd === usd ? { ...i, qty: i.qty + 1 } : i))
        : [...s.cart, { storeId, usd, qty: 1 }]
      commit({ ...s, cart: cart.filter(isValidItem) })
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
      if (!s.cart.length) return { ok: false, reason: "empty", missing: 0 }
      const total = cartTotal(s.cart)
      if (total > s.balance) return { ok: false, reason: "insufficient", missing: total - s.balance }
      const codes = s.cart.flatMap((i) => Array.from({ length: i.qty }, () => ({ storeId: i.storeId, usd: i.usd, code: genCode(i.storeId) })))
      const order: Order = { id: `ORD-${Date.now()}`, date: new Date().toISOString(), points: total, codes, ...opts }
      commit({ ...s, balance: s.balance - total, cart: [], orders: [order, ...s.orders] })
      return { ok: true, order }
    },
    [commit],
  )

  // Llamar SOLO después de que la pasarela confirme el pago.
  const topUp = useCallback(
    (packId: string, last4: string) => {
      const pack = PACKS.find((p) => p.id === packId)
      if (!pack) return false
      const s = ref.current
      const t: TopUp = { id: `TOP-${Date.now()}`, date: new Date().toISOString(), packId, points: pack.points, usd: pack.usd, last4 }
      commit({ ...s, balance: s.balance + pack.points, topups: [t, ...s.topups] })
      return true
    },
    [commit],
  )

  const value: Ctx = {
    ...state,
    ready,
    cartTotal: cartTotal(state.cart),
    cartCount: state.cart.reduce((n, i) => n + i.qty, 0),
    addToCart,
    setQty,
    clearCart,
    redeem,
    topUp,
  }

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>
}

export function usePoints() {
  const ctx = useContext(PointsContext)
  if (!ctx) throw new Error("usePoints debe usarse dentro de <PointsProvider>")
  return ctx
}
