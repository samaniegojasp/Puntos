"use client"

// Ajustes del sistema compartidos entre las pantallas de administración (solo prototipo).
// El valor vive en memoria mientras no se recargue la página; al recargar vuelve a MOCK_SETTINGS.
import { createContext, useContext, useState } from "react"
import { MOCK_SETTINGS } from "@/lib/mock/data"
import type { AdminSettings } from "@/lib/domain/types"

type Ctx = { settings: AdminSettings; setSettings: (s: AdminSettings) => void }

const AdminSettingsContext = createContext<Ctx | null>(null)

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(MOCK_SETTINGS)
  return <AdminSettingsContext.Provider value={{ settings, setSettings }}>{children}</AdminSettingsContext.Provider>
}

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext)
  if (!ctx) throw new Error("useAdminSettings debe usarse dentro de AdminSettingsProvider")
  return ctx
}
