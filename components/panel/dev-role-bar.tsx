"use client"

import { FlaskConical } from "lucide-react"
import { ROLE_LABEL, type Role } from "@/lib/domain/types"
import { useMockSession } from "@/lib/mock/session"

const ROLES: Role[] = ["canjeador", "cliente", "proveedor", "admin"]

/** Barra flotante del prototipo para cambiar de rol. Se oculta con NEXT_PUBLIC_PROTOTYPE=0. */
export default function DevRoleBar() {
  const { role, setRole, ready } = useMockSession()
  if (process.env.NEXT_PUBLIC_PROTOTYPE === "0" || !ready) return null

  return (
    <div className="fixed bottom-16 left-3 z-[60] flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
      <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden />
      <label htmlFor="proto-role" className="font-medium">
        Prototipo · Ver como
      </label>
      <select
        id="proto-role"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md border bg-background px-1.5 py-0.5"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </div>
  )
}
