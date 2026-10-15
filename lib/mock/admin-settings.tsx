"use client"

// Datos de administración compartidos entre las pantallas del panel y la tienda pública (solo prototipo):
// ajustes, proveedores, productos, clientes y paquetes del Canjeador.
// Así, cambiar el descuento de un Proveedor se refleja en Precios, y un paquete editado se ve en /recargar.
// El valor vive en memoria mientras no se recargue la página; al recargar vuelve a los datos de ejemplo.
import { createContext, useContext, useState } from "react"
import {
  MOCK_CLIENTS_ADMIN,
  MOCK_PRODUCTS,
  MOCK_PROVIDERS,
  MOCK_PUBLIC_PACKS,
  MOCK_SETTINGS,
  MOCK_STANDARD_PACKS,
} from "@/lib/mock/data"
import type { AdminSettings, ClientAdminRow, PointsPack, Product, Provider } from "@/lib/domain/types"

type Ctx = {
  settings: AdminSettings
  setSettings: (s: AdminSettings) => void
  providers: Provider[]
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  clients: ClientAdminRow[]
  setClients: React.Dispatch<React.SetStateAction<ClientAdminRow[]>>
  publicPacks: PointsPack[]
  setPublicPacks: React.Dispatch<React.SetStateAction<PointsPack[]>>
  standardPacks: PointsPack[]
  setStandardPacks: React.Dispatch<React.SetStateAction<PointsPack[]>>
}

const AdminSettingsContext = createContext<Ctx | null>(null)

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(MOCK_SETTINGS)
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [clients, setClients] = useState<ClientAdminRow[]>(MOCK_CLIENTS_ADMIN)
  const [publicPacks, setPublicPacks] = useState<PointsPack[]>(MOCK_PUBLIC_PACKS)
  const [standardPacks, setStandardPacks] = useState<PointsPack[]>(MOCK_STANDARD_PACKS)
  return (
    <AdminSettingsContext.Provider
      value={{
        settings,
        setSettings,
        providers,
        setProviders,
        products,
        setProducts,
        clients,
        setClients,
        publicPacks,
        setPublicPacks,
        standardPacks,
        setStandardPacks,
      }}
    >
      {children}
    </AdminSettingsContext.Provider>
  )
}

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext)
  if (!ctx) throw new Error("useAdminSettings debe usarse dentro de AdminSettingsProvider")
  return ctx
}

/** Oferta del Canjeador para la tienda: paquetes (USD → puntos) y compra a tu medida, tal como los dejó el administrador. */
export function usePublicOffer() {
  const { publicPacks, settings } = useAdminSettings()
  const packs = [...publicPacks]
    .sort((a, b) => a.usdCents - b.usdCents)
    .map((p) => ({ id: p.id, points: p.points, usd: p.usdCents / 100, badge: p.badge }))
  return {
    packs,
    custom: {
      minUsd: settings.customMinUsd ?? 1,
      maxUsd: settings.customMaxUsd ?? 500,
      pointsPerUsd: settings.customPointsPerUsd ?? 100,
    },
  }
}

/** Factor de conversión de dólares a puntos (entero ≥ 1). Por defecto 1. */
export function usePointsFactor() {
  const { settings } = useAdminSettings()
  return settings.pointsFactor ?? 1
}

