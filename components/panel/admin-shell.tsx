"use client"

import RoleGate from "@/components/panel/role-gate"
import PanelShell, { type PanelTab } from "@/components/panel/panel-shell"
import type { Role } from "@/lib/domain/types"
import { useAdminSettings } from "@/lib/mock/admin-settings"

const ALLOW: Role[] = []

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { cardRequests } = useAdminSettings()
  const pendingCount = cardRequests.filter((r) => r.status === "submitted").length

  const tabs: PanelTab[] = [
    { href: "/admin/resumen", label: "Resumen" },
    { href: "/admin", label: "Catálogo" },
    { href: "/admin/solicitudes", label: "Solicitudes", badge: pendingCount },
    { href: "/admin/clientes", label: "Clientes" },
    { href: "/admin/proveedores", label: "Proveedores" },
    { href: "/admin/precios", label: "Precios" },
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/liquidaciones", label: "Liquidaciones" },
    { href: "/admin/ajustes", label: "Ajustes" },
  ]

  return (
    <RoleGate allow={ALLOW}>
      <PanelShell
        title="Administración"
        subtitle="Gestión global de Regala, tarifas y márgenes"
        tabs={tabs}
      >
        {children}
      </PanelShell>
    </RoleGate>
  )
}
