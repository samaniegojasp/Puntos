import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/sonner"
import { PointsProvider } from "@/lib/points-store"
import { CatalogProvider } from "@/lib/catalog-store"
import { MockSessionProvider } from "@/lib/mock/session"
import { AdminSettingsProvider } from "@/lib/mock/admin-settings"
import DevRoleBar from "@/components/panel/dev-role-bar"

const inter = Inter({ subsets: ["latin"] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://puntos-three.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Regala — Gift cards de Ecuador con Puntos",
  description:
    "Canjea tus Puntos por gift cards de Supermaxi, Fybeca, Marathon Sports y más. Entrega digital inmediata.",
  openGraph: {
    title: "Regala — Gift cards de Ecuador con Puntos",
    description:
      "Canjea tus Puntos por gift cards de Supermaxi, Fybeca, Marathon Sports y más. Entrega digital inmediata.",
    locale: "es_EC",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AdminSettingsProvider>
        <CatalogProvider>
        <PointsProvider>
        <MockSessionProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <DevRoleBar />
          <Toaster richColors position="bottom-center" />
        </MockSessionProvider>
        </PointsProvider>
        </CatalogProvider>
        </AdminSettingsProvider>
      </body>
    </html>
  )
}
