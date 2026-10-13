import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/sonner"
import { PointsProvider } from "@/lib/points-store"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PetDo - Everything Your Dog Needs",
  description: "Premium quality products for your furry friends",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <PointsProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="bottom-center" />
        </PointsProvider>
      </body>
    </html>
  )
}
