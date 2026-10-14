"use client"

import RoleGate from "@/components/panel/role-gate"
import PanelShell, { type PanelTab } from "@/components/panel/panel-shell"
import type { Role } from "@/lib/domain/types"

const ALLOW: Role[] = ["canjeador", "cliente", "proveedor", "admin"]

const TABS: PanelTab[] = [
  { href: "/cuenta", label: "Resumen" },
  { href: "/cuenta/puntos", label: "Mis puntos" },
  { href: "/cuenta/tarjetas", label: "Mis tarjetas" },
  { href: "/cuenta/perfil", label: "Perfil" },
]

export default function CuentaShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={ALLOW}>
      <PanelShell title="Mi cuenta" subtitle="Gestiona tus puntos y gift cards virtuales" tabs={TABS}>
        {children}
      </PanelShell>
    </RoleGate>
  )
}
