"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { formatDate, formatPts } from "@/lib/domain/format"
import { maskEmail } from "@/lib/domain/documento"
import { DOC_TYPE_LABEL } from "@/lib/domain/types"
import { downloadCsv } from "@/lib/domain/csv"

export default function ClienteRepartidoPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { grantedItems } = useAdminSettings()

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Filtrado por documento (número o tipo)
  const query = search.trim().toLowerCase()
  const filteredItems = grantedItems.filter((item) => {
    if (!query) return true
    return (
      item.docNumber.toLowerCase().includes(query) ||
      DOC_TYPE_LABEL[item.docType].toLowerCase().includes(query)
    )
  })

  // Fila de totales
  const totalPoints = filteredItems.reduce((sum, item) => sum + item.points, 0)
  const totalUsed = filteredItems.reduce((sum, item) => sum + item.pointsUsed, 0)
  const totalAvailable = totalPoints - totalUsed

  const handleDownloadCsv = () => {
    const headers = [
      "Tipo de documento",
      "Número de documento",
      "Correo",
      "Referencia",
      "Puntos",
      "Puntos usados",
      "Puntos disponibles",
      "Fecha de envío",
      "Estado",
    ]
    const rows = filteredItems.map((item) => [
      DOC_TYPE_LABEL[item.docType],
      item.docNumber,
      item.email ? maskEmail(item.email) : "—",
      item.reference ?? "—",
      item.points,
      item.pointsUsed,
      item.points - item.pointsUsed,
      formatDate(item.sentAt),
      "Enviado",
    ])
    downloadCsv("lo-repartido.csv", headers, rows)
  }

  return (
    <div className="space-y-8">
      {/* Título y botón de exportar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Lo repartido</h2>
          <p className="text-sm text-muted-foreground">
            Historial de puntos entregados a tus canjeadores y estado de uso
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadCsv} disabled={filteredItems.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Descargar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Entregas de puntos</CardTitle>
              <CardDescription>
                Listado de documentos beneficiarios y puntos canjeados
              </CardDescription>
            </div>
            {/* Buscador por documento */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            /* Estado vacío */
            <div className="rounded-lg border border-dashed p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold">No se encontraron entregas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No hay registros que coincidan con la búsqueda &ldquo;{search}&rdquo;.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearch("")}
              >
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="text-right">Usados</TableHead>
                    <TableHead className="text-right">Disponibles</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const available = item.points - item.pointsUsed
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {DOC_TYPE_LABEL[item.docType]} {item.docNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.email ? maskEmail(item.email) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.reference ? item.reference : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPts(item.points)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatPts(item.pointsUsed)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {formatPts(available)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(item.sentAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          {/* Etiqueta Enviado (siempre la misma, no muestra si ya se registró) */}
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                          >
                            Enviado
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Totales</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-normal">
                      {filteredItems.length} {filteredItems.length === 1 ? "entrega" : "entregas"}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPts(totalPoints)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-muted-foreground">
                      {formatPts(totalUsed)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatPts(totalAvailable)}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-center">—</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
