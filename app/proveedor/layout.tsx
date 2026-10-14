import type { Metadata } from "next"
import ProveedorShell from "@/components/panel/proveedor-shell"

export const metadata: Metadata = {
  title: "Panel de Proveedor — Regala",
  robots: { index: false, follow: false },
}

export default function ProveedorLayout({ children }: { children: React.ReactNode }) {
  return <ProveedorShell>{children}</ProveedorShell>
}
