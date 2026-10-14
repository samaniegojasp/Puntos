import type { Metadata } from "next"
import AdminShell from "@/components/panel/admin-shell"

export const metadata: Metadata = {
  title: "Administración — Regala",
  robots: { index: false, follow: false },
}

export default function AdminSeccionesLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
