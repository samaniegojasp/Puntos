import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Carrito — Regala",
  robots: { index: false, follow: false },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
