"use client"

import RoleGate from "@/components/panel/role-gate"
import PanelShell, { type PanelTab } from "@/components/panel/panel-shell"
import type { Role } from "@/lib/domain/types"

const ALLOW: Role[] = ["proveedor"]

const TABS: PanelTab[] = [
  { href: "/proveedor", label: "Resumen" },
  { href: "/proveedor/caja", label: "Caja" },
  { href: "/proveedor/tarjetas", label: "Tarjetas" },
  { href: "/proveedor/liquidacion", label: "Liquidación" },
  { href: "/proveedor/condiciones", label: "Condiciones" },
]

export default function ProveedorShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={ALLOW}>
      <PanelShell
        title="Panel de Proveedor"
        subtitle="Gestiona cobros en caja, tarjetas emitidas y liquidaciones mensuales"
        tabs={TABS}
      >
        {children}
      </PanelShell>
    </RoleGate>
  )
}
