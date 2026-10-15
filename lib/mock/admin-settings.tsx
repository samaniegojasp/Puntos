"use client"

// Datos de administración compartidos entre las pantallas del panel y la tienda pública (solo prototipo):
// ajustes, proveedores, productos, clientes y paquetes del Canjeador.
// Así, cambiar el descuento de un Proveedor se refleja en Precios, y un paquete editado se ve en /recargar.
// El valor vive en memoria mientras no se recargue la página; al recargar vuelve a los datos de ejemplo.
import { createContext, useContext, useState } from "react"
import {
  MOCK_CLIENT,
  MOCK_CLIENTS_ADMIN,
  MOCK_CLIENT_PACKS,
  MOCK_GRANTED,
  MOCK_PRODUCTS,
  MOCK_PROVIDERS,
  MOCK_PUBLIC_PACKS,
  MOCK_SETTINGS,
  MOCK_STANDARD_PACKS,
} from "@/lib/mock/data"
import { productPoints, referenceCentsPerPoint } from "@/lib/domain/pricing"
import { clientBasePack } from "@/lib/domain/grants"
import type { AdminSettings, ClientAdminRow, GrantedItem, PointsPack, Product, Provider } from "@/lib/domain/types"
import { useMockSession } from "@/lib/mock/session"

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
  grantedItems: GrantedItem[]
  setGrantedItems: React.Dispatch<React.SetStateAction<GrantedItem[]>>
  sentBatches: { hash: string; sentAt: string }[]
  setSentBatches: React.Dispatch<React.SetStateAction<{ hash: string; sentAt: string }[]>>
}

const AdminSettingsContext = createContext<Ctx | null>(null)

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(MOCK_SETTINGS)
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [clients, setClients] = useState<ClientAdminRow[]>(MOCK_CLIENTS_ADMIN)
  const [publicPacks, setPublicPacks] = useState<PointsPack[]>(MOCK_PUBLIC_PACKS)
  const [standardPacks, setStandardPacks] = useState<PointsPack[]>(MOCK_STANDARD_PACKS)
  const [grantedItems, setGrantedItems] = useState<GrantedItem[]>(MOCK_GRANTED)
  const [sentBatches, setSentBatches] = useState<{ hash: string; sentAt: string }[]>([])
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
        grantedItems,
        setGrantedItems,
        sentBatches,
        setSentBatches,
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

/** "A tu medida" solo para Cliente y Nosotros (admin). El Canjeador compra paquetes fijos. */
export function useCanBuyCustom() {
  const { role } = useMockSession()
  return role === "cliente" || role === "admin"
}

/** Puntos que cuesta una tarjeta en la tienda: valor facial + recargo, al punto del paquete más pequeño del Canjeador. */
export function useCardPoints() {
  const { publicPacks, settings } = useAdminSettings()
  const ref = referenceCentsPerPoint(publicPacks)
  return (usd: number) => productPoints({ faceCents: Math.round(usd * 100) }, settings, ref)
}

/** Cliente de la sesión de ejemplo, con su tramo base y su bolsa viva (la misma que ven Clientes y Resumen). */
export function useCurrentClient() {
  const { clients, setClients, standardPacks } = useAdminSettings()
  const client = clients.find((c) => c.id === MOCK_CLIENT.id) ?? { ...MOCK_CLIENT, customPacks: MOCK_CLIENT_PACKS, active: true }
  const base = clientBasePack(client, standardPacks)
  const addToBag = (delta: number) =>
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, bagPoints: c.bagPoints + delta } : c)))
  return { client, base, bag: client.bagPoints, addToBag }
}

