import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidad — Regala",
  robots: { index: false, follow: false },
}

export default function PrivacidadPage() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-4">Política de Privacidad</h1>
      <p className="text-muted-foreground">
        Documento en revisión legal. Se publicará antes del lanzamiento.
      </p>
    </div>
  )
}
