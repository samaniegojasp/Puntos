"use client"

import RoleGate from "@/components/panel/role-gate"
import PanelShell, { type PanelTab } from "@/components/panel/panel-shell"
import type { Role } from "@/lib/domain/types"

const ALLOW: Role[] = ["cliente"]

const TABS: PanelTab[] = [
  { href: "/cliente", label: "Resumen" },
  { href: "/cliente/comprar", label: "Comprar puntos" },
  { href: "/cliente/bono", label: "Mi bono" },
  { href: "/cliente/repartir", label: "Repartir" },
  { href: "/cliente/repartido", label: "Lo repartido" },
]

export default function ClienteShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={ALLOW}>
      <PanelShell
        title="Panel de Cliente"
        subtitle="Gestiona tu bolsa de puntos corporativos, bonos y repartos"
        tabs={TABS}
      >
        {children}
      </PanelShell>
    </RoleGate>
  )
}
