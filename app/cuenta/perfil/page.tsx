"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, Eye, EyeOff, FileText, Mail, ShieldCheck, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMockSession } from "@/lib/mock/session"
import { maskDocument } from "@/lib/domain/documento"
import { formatDate } from "@/lib/domain/format"
import { DOC_TYPE_LABEL } from "@/lib/domain/types"

export default function CuentaPerfilPage() {
  const { profile, ready } = useMockSession()
  const [showDoc, setShowDoc] = useState(false)

  if (!ready || !profile) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  const displayedDoc = showDoc ? profile.docNumber : maskDocument(profile.docNumber)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Mi perfil</CardTitle>
        <CardDescription>
          Información personal y datos de identidad registrados en tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Nombre completo */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Nombre completo
            </span>
            <p className="font-semibold text-foreground text-base">{profile.fullName}</p>
          </div>

          {/* Correo electrónico */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Correo electrónico
            </span>
            <p className="font-semibold text-foreground text-base">{profile.email}</p>
          </div>

          {/* Tipo de documento */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Tipo de documento
            </span>
            <p className="font-semibold text-foreground text-base">
              {DOC_TYPE_LABEL[profile.docType]}
            </p>
          </div>

          {/* Número de documento enmascarado */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Número de documento
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground text-base tracking-wider">
                {displayedDoc}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowDoc(!showDoc)}
              >
                {showDoc ? (
                  <>
                    <EyeOff className="mr-1 h-3.5 w-3.5" /> Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Mostrar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Fecha de nacimiento */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Fecha de nacimiento
            </span>
            <p className="font-semibold text-foreground text-base">
              {formatDate(profile.birthDate)}
            </p>
          </div>

          {/* Términos aceptados */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Términos legales
            </span>
            <p className="font-medium text-foreground text-sm">
              Términos aceptados el {formatDate(profile.termsAcceptedAt)} (versión {profile.termsVersion})
            </p>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          Para corregir tu documento, escríbenos desde{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            Contacto
          </Link>
          .
        </div>
      </CardContent>
    </Card>
  )
}
