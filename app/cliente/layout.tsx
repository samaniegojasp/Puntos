import type { Metadata } from "next"
import ClienteShell from "@/components/panel/cliente-shell"

export const metadata: Metadata = {
  title: "Panel de Cliente — Regala",
  robots: { index: false, follow: false },
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <ClienteShell>{children}</ClienteShell>
}
