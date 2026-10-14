"use client"

import { useEffect, useState } from "react"
import { CreditCard, Download, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import StatusBadge from "@/components/panel/status-badge"
import { MOCK_PROVIDER_CARDS } from "@/lib/mock/data"
import { formatDate, formatUsd } from "@/lib/domain/format"
import { CARD_STATUS_LABEL, type CardStatus } from "@/lib/domain/types"
import { downloadCsv } from "@/lib/domain/csv"

type FilterStatus = "all" | CardStatus

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "consumed", label: "Consumidas" },
  { value: "expired", label: "Caducadas" },
  { value: "exchanged", label: "Cambiadas" },
]

export default function ProveedorTarjetasPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")

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
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Filtrado por código y estado
  const query = search.trim().toUpperCase()
  const filteredCards = MOCK_PROVIDER_CARDS.filter((card) => {
    const matchesCode = !query || card.code.toUpperCase().includes(query)
    const matchesStatus = statusFilter === "all" || card.status === statusFilter
    return matchesCode && matchesStatus
  })

  // Descarga CSV de las tarjetas filtradas
  const handleDownloadCsv = () => {
    const headers = [
      "Código",
      "Valor facial",
      "Saldo restante",
      "Estado",
      "Fecha de emisión",
      "Fecha de vencimiento",
      "Titular",
    ]
    const rows = filteredCards.map((card) => [
      card.code,
      formatUsd(card.faceCents),
      formatUsd(card.balanceCents),
      CARD_STATUS_LABEL[card.status],
      formatDate(card.issuedAt),
      formatDate(card.expiresAt),
      card.holderMasked,
    ])
    downloadCsv("tarjetas-proveedor.csv", headers, rows)
  }

  return (
    <div className="space-y-8">
      {/* Encabezado y acción de exportar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tarjetas emitidas</h2>
          <p className="text-sm text-muted-foreground">
            Consulta el estado de todas las gift cards de tu tienda y descarga reportes
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadCsv} disabled={filteredCards.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Descargar CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Listado de gift cards</CardTitle>
              <CardDescription>
                Mostrando {filteredCards.length} de {MOCK_PROVIDER_CARDS.length} tarjetas
              </CardDescription>
            </div>

            {/* Buscador por código */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. FYB)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 font-mono uppercase"
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

          {/* Filtros por estado */}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={statusFilter === f.value ? "default" : "outline"}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filteredCards.length === 0 ? (
            /* Estado vacío */
            <div className="rounded-lg border border-dashed p-10 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold">No se encontraron tarjetas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No hay tarjetas que coincidan con los filtros aplicados.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch("")
                  setStatusFilter("all")
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Valor facial</TableHead>
                    <TableHead className="text-right">Saldo restante</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Emitida</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Titular</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono font-medium tracking-wide">
                        {card.code}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatUsd(card.faceCents)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatUsd(card.balanceCents)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={card.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(card.issuedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(card.expiresAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {card.holderMasked}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
