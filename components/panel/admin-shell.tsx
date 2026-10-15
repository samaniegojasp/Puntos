"use client"

import RoleGate from "@/components/panel/role-gate"
import PanelShell, { type PanelTab } from "@/components/panel/panel-shell"
import { AdminSettingsProvider } from "@/lib/mock/admin-settings"
import type { Role } from "@/lib/domain/types"

const ALLOW: Role[] = []

const TABS: PanelTab[] = [
  { href: "/admin/resumen", label: "Resumen" },
  { href: "/admin", label: "Catálogo" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/precios", label: "Precios" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/liquidaciones", label: "Liquidaciones" },
  { href: "/admin/ajustes", label: "Ajustes" },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={ALLOW}>
      <AdminSettingsProvider>
        <PanelShell
          title="Administración"
          subtitle="Gestión global de Regala, tarifas y márgenes"
          tabs={TABS}
        >
          {children}
        </PanelShell>
      </AdminSettingsProvider>
    </RoleGate>
  )
}
