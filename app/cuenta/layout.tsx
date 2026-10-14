import type { Metadata } from "next"
import CuentaShell from "@/components/panel/cuenta-shell"

export const metadata: Metadata = {
  title: "Mi cuenta — Regala",
  robots: { index: false, follow: false },
}

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return <CuentaShell>{children}</CuentaShell>
}
