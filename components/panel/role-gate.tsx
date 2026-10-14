"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ROLE_LABEL, type Role } from "@/lib/domain/types"
import { useMockSession } from "@/lib/mock/session"

/**
 * Muestra el contenido solo si el rol simulado está permitido. "Nosotros" (admin) siempre pasa.
 * En el backend real el servidor decide el acceso (requireRole); esto solo enseña el comportamiento.
 */
export default function RoleGate({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { role, ready } = useMockSession()

  if (!ready) {
    return (
      <div className="container py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    )
  }

  if (role === "admin" || allow.includes(role)) return <>{children}</>

  return (
    <div className="container flex justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-4 p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </span>
          <h1 className="text-xl font-bold">No tienes acceso a esta sección</h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta es de tipo <strong>{ROLE_LABEL[role]}</strong>. Esta sección es para:{" "}
            {allow.map((r) => ROLE_LABEL[r]).join(", ")}.
          </p>
          <Button asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
