"use client"

// Datos de administración compartidos entre sus pantallas (solo prototipo): ajustes, proveedores, productos y clientes.
// Así, cambiar el descuento de un Proveedor se refleja en Precios, y un margen o un cliente editados se ven en las demás.
// El valor vive en memoria mientras no se recargue la página; al recargar vuelve a los datos de ejemplo.
import { createContext, useContext, useState } from "react"
import { MOCK_CLIENTS_ADMIN, MOCK_PRODUCTS, MOCK_PROVIDERS, MOCK_SETTINGS } from "@/lib/mock/data"
import type { AdminSettings, ClientAdminRow, Product, Provider } from "@/lib/domain/types"

type Ctx = {
  settings: AdminSettings
  setSettings: (s: AdminSettings) => void
  providers: Provider[]
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  clients: ClientAdminRow[]
  setClients: React.Dispatch<React.SetStateAction<ClientAdminRow[]>>
}

const AdminSettingsContext = createContext<Ctx | null>(null)

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(MOCK_SETTINGS)
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [clients, setClients] = useState<ClientAdminRow[]>(MOCK_CLIENTS_ADMIN)
  return (
    <AdminSettingsContext.Provider
      value={{ settings, setSettings, providers, setProviders, products, setProducts, clients, setClients }}
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
