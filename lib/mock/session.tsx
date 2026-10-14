"use client"

// Sesión SIMULADA del prototipo (Fase D): el rol se elige en la barra "Ver como".
// Se elimina cuando entre Supabase Auth (fase B2). No es seguridad: solo muestra qué ve cada rol.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Profile, Role } from "@/lib/domain/types"
import { MOCK_PROFILES } from "@/lib/mock/data"

const KEY = "gc_proto_role"
const ROLES: Role[] = ["canjeador", "cliente", "proveedor", "admin"]

type Ctx = { role: Role; profile: Profile; setRole: (r: Role) => void; ready: boolean }

const MockSessionContext = createContext<Ctx | null>(null)

export function MockSessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("canjeador")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY) as Role | null
      if (saved && ROLES.includes(saved)) setRoleState(saved)
    } catch {}
    setReady(true)
  }, [])

  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    try {
      sessionStorage.setItem(KEY, r)
    } catch {}
  }, [])

  const value = useMemo(() => ({ role, profile: MOCK_PROFILES[role], setRole, ready }), [role, setRole, ready])
  return <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>
}

export function useMockSession() {
  const ctx = useContext(MockSessionContext)
  if (!ctx) throw new Error("useMockSession debe usarse dentro de MockSessionProvider")
  return ctx
}
