import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/sonner"
import { PointsProvider } from "@/lib/points-store"
import { CatalogProvider } from "@/lib/catalog-store"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Regala — Gift cards de Ecuador con Puntos",
  description:
    "Canjea tus Puntos por gift cards de Supermaxi, Fybeca, Marathon Sports y más. Entrega digital inmediata.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <CatalogProvider>
        <PointsProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="bottom-center" />
        </PointsProvider>
        </CatalogProvider>
      </body>
    </html>
  )
}
