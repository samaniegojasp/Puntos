"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  RotateCcw,
  Send,
  Upload,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import KpiCard from "@/components/panel/kpi-card"
import { PurchaseDialog } from "@/components/panel/purchase-dialog"
import { useAdminSettings, useCurrentClient } from "@/lib/mock/admin-settings"
import { formatDate, formatPts, formatUsd } from "@/lib/domain/format"
import { normalizeDocument } from "@/lib/domain/documento"
import { readGrantFile } from "@/lib/domain/grant-file"
import { buildGrantBatch, purchaseForMissing } from "@/lib/domain/grants"
import { DOC_TYPE_LABEL, type GrantBatch, type GrantedItem } from "@/lib/domain/types"
import { downloadCsv } from "@/lib/domain/csv"
import { downloadGrantTemplate } from "@/lib/domain/xlsx-template"
import { toast } from "sonner"

export default function ClienteRepartirPage() {
  const { base, bag, addToBag } = useCurrentClient()
  const { setGrantedItems, sentBatches, setSentBatches } = useAdminSettings()

  // Estado para la generación de plantilla Excel
  const [rowCountInput, setRowCountInput] = useState("100")
  const [generating, setGenerating] = useState(false)

  const rowCountNum = Number(rowCountInput.trim())
  const isRowCountValid = Number.isInteger(rowCountNum) && rowCountNum >= 1 && rowCountNum <= 1000

  // Estado de subida y lectura
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado del lote en revisión
  const [reviewedBatch, setReviewedBatch] = useState<GrantBatch | null>(null)

  // Casillas de confirmación
  const [authChecked, setAuthChecked] = useState(false)
  const [duplicateChecked, setDuplicateChecked] = useState(false)

  // Estado de diálogo de compra de faltante
  const [purchaseOpen, setPurchaseOpen] = useState(false)

  // Estado de diálogo de envío
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const isSendingRef = useRef(false)
  const [isSent, setIsSent] = useState(false)
  const [bagAfterSent, setBagAfterSent] = useState<number | null>(null)

  // Paso 1: Descargar plantilla Excel (.xlsx) o CSV
  const handleDownloadExcel = async () => {
    if (!isRowCountValid || generating) return
    setGenerating(true)
    try {
      await downloadGrantTemplate(rowCountNum)
    } catch (err) {
      console.error(err)
      toast.error("No se pudo generar la plantilla. Prueba de nuevo.")
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadTemplate = () => {
    const headers = [
      "Tipo de documento",
      "Número de documento",
      "Correo electrónico",
      "Valor de comisión ($)",
      "Referencia",
    ]
    downloadCsv("plantilla-reparto-puntos.csv", headers, [])
  }

  // Paso 2: Revisar archivo
  const handleReviewFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || reviewing) return
    setReviewing(true)
    try {
      const { rows, fileHash } = await readGrantFile(selectedFile)
      const batch = buildGrantBatch(rows, base, selectedFile.name, fileHash)
      const prior = sentBatches.find((b) => b.hash === fileHash)
      if (prior) {
        batch.alreadySentAt = prior.sentAt
      }
      setReviewedBatch(batch)
      setAuthChecked(false)
      setDuplicateChecked(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al leer el archivo"
      toast.error(msg)
      setReviewedBatch(null)
    } finally {
      setReviewing(false)
    }
  }

  // Paso 4: Confirmación y envío del reparto
  const handleConfirmSend = () => {
    if (isSendingRef.current || isSending || !reviewedBatch) return
    if (bag < reviewedBatch.totalPoints) {
      toast.error("Saldo insuficiente en tu bolsa.")
      return
    }

    isSendingRef.current = true
    setIsSending(true)

    // Regla 7: Simular 800 ms de procesamiento
    setTimeout(() => {
      const total = reviewedBatch.totalPoints
      addToBag(-total)

      const sentAt = new Date().toISOString()
      const newItems: GrantedItem[] = reviewedBatch.rows
        .filter((r) => !r.error && r.points != null)
        .map((r) => ({
          id: `g-${Date.now()}-${r.rowNo}`,
          batchId: reviewedBatch.id,
          docType: r.docType ?? "cedula",
          docNumber: normalizeDocument(r.docNumber),
          email: r.email,
          reference: r.reference,
          points: r.points ?? 0,
          pointsUsed: 0,
          sentAt,
        }))

      setGrantedItems((prev) => [...newItems, ...prev])
      setSentBatches((prev) => [...prev, { hash: reviewedBatch.fileHash, sentAt }])
      setBagAfterSent(bag - total)

      setIsSending(false)
      isSendingRef.current = false
      setDialogOpen(false)
      setIsSent(true)
    }, 800)
  }

  // Reiniciar flujo para nuevo reparto
  const handleResetFlow = () => {
    setIsSent(false)
    setReviewedBatch(null)
    setSelectedFile(null)
    setAuthChecked(false)
    setDuplicateChecked(false)
    setReviewing(false)
    setBagAfterSent(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Descarga del resumen del lote enviado
  const handleDownloadSummary = () => {
    if (!reviewedBatch) return
    const headers = [
      "Fila",
      "Tipo de documento",
      "Número de documento",
      "Correo electrónico",
      "Valor de comisión ($)",
      "Puntos",
      "Referencia",
      "Estado",
    ]
    const rows = reviewedBatch.rows.map((r) => [
      r.rowNo,
      r.docType ? DOC_TYPE_LABEL[r.docType] : "Cédula",
      r.docNumber,
      r.email || "",
      r.commissionCents != null ? (r.commissionCents / 100).toFixed(2) : "—",
      r.points ?? 0,
      r.reference ?? "—",
      "Enviado",
    ])
    downloadCsv(`resumen-reparto-${reviewedBatch.id}.csv`, headers, rows)
  }

  // Si ya fue enviado, mostrar la pantalla de éxito "Reparto enviado"
  if (isSent && reviewedBatch) {
    const finalBagBalance = bagAfterSent ?? (bag - reviewedBatch.totalPoints)

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Reparto enviado</h2>
          <p className="text-sm text-muted-foreground">
            Los puntos se han descontado de tu bolsa y entregado a tus canjeadores
          </p>
        </div>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <h3 className="mt-4 text-2xl font-bold text-foreground">Reparto procesado con éxito</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Se procesaron todas las filas del archivo <strong>{reviewedBatch.fileName}</strong> y se descontaron los
              puntos de tu bolsa corporativa.
            </p>

            {/* Tarjetas de resultado */}
            <div className="mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-background p-4 text-center shadow-sm">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Puntos repartidos
                </span>
                <p className="mt-1 text-2xl font-extrabold text-primary">
                  {formatPts(reviewedBatch.totalPoints)}
                </p>
              </div>

              <div className="rounded-xl border bg-background p-4 text-center shadow-sm">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Filas procesadas
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {reviewedBatch.rows.length}
                </p>
              </div>

              <div className="rounded-xl border bg-background p-4 text-center shadow-sm">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nueva bolsa
                </span>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {formatPts(finalBagBalance)} pts
                </p>
              </div>
            </div>

            {/* Acciones finales */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={handleDownloadSummary}>
                <Download className="mr-2 h-4 w-4" /> Descargar resumen (CSV)
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cliente/repartido">
                  <History className="mr-2 h-4 w-4" /> Ver lo repartido
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleResetFlow}>
                <RotateCcw className="mr-2 h-4 w-4" /> Hacer otro reparto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Cálculos de validación sobre el lote revisado (la bolsa se lee viva de useCurrentClient)
  const total = reviewedBatch ? reviewedBatch.totalPoints : 0
  const missing = Math.max(0, total - bag)
  const after = bag - total
  const hasErrors = reviewedBatch ? reviewedBatch.rows.some((r) => !!r.error) : false
  const isDuplicate = !!reviewedBatch?.alreadySentAt
  const buy = purchaseForMissing(missing, base)

  // Condiciones para habilitar el botón "Enviar reparto"
  const canSend =
    reviewedBatch !== null &&
    !hasErrors &&
    missing === 0 &&
    authChecked &&
    (!isDuplicate || duplicateChecked) &&
    !isSending

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Repartir puntos</h2>
        <p className="text-sm text-muted-foreground">
          Entrega de puntos en lote a clientes o colaboradores mediante archivo Excel
        </p>
      </div>

      {/* Paso 1: Descargar plantilla */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Paso 1 — Plantilla</CardTitle>
          </div>
          <CardDescription>
            Descarga el formato oficial para estructurar la lista de personas y puntos a entregar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Tipo de documento:</strong> elige de la lista. <strong>Valor de comisión ($):</strong> los dólares que quieres entregar a cada persona; nosotros los convertimos a puntos. Referencia es opcional.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rowCountInput">Cantidad de filas de la plantilla</Label>
            <Input
              id="rowCountInput"
              type="number"
              min={1}
              max={1000}
              value={rowCountInput}
              onChange={(e) => setRowCountInput(e.target.value)}
              className="w-28"
            />
            <p className="text-xs text-muted-foreground">
              Entre 1 y 1.000. Cada fila tiene su lista desplegable de tipo de documento.
            </p>
            {!isRowCountValid && (
              <p className="text-xs text-destructive">
                Escribe un número entero entre 1 y 1.000.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={handleDownloadExcel}
              disabled={!isRowCountValid || generating}
            >
              {generating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Generando…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Descargar plantilla Excel (.xlsx)
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              Descargar versión CSV (sin lista desplegable)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Paso 2: Subir y revisar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Paso 2 — Subir y revisar</CardTitle>
          </div>
          <CardDescription>
            Selecciona el archivo completado en tu equipo y revisa su contenido antes de procesar el reparto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReviewFile} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fileInput">Archivo de reparto (.xlsx o .csv)</Label>
              <Input
                id="fileInput"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setSelectedFile(file || null)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Máximo 5 MB y 1.000 filas.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Revisar el archivo no realiza ningún cambio ni descuenta puntos de tu bolsa.
              </p>
              <Button type="submit" disabled={!selectedFile || reviewing}>
                {reviewing && <Spinner className="mr-2 h-4 w-4" />}
                Revisar archivo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Paso 3 & 4: Revisión del archivo y envío */}
      {reviewedBatch && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Paso 3 — Revisión del reparto</CardTitle>
                  <CardDescription>
                    Archivo analizado: <strong className="text-foreground">{reviewedBatch.fileName}</strong>
                  </CardDescription>
                </div>
                {hasErrors ? (
                  <Badge variant="destructive" className="w-fit">
                    Con errores ({reviewedBatch.rows.filter((r) => r.error).length})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit border-emerald-300 bg-emerald-50 text-emerald-700">
                    Filas sin errores
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 5 Tarjetas de resumen del archivo */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                  label="Filas"
                  value={String(reviewedBatch.rows.length)}
                  hint="Beneficiarios en el archivo"
                />
                <KpiCard
                  label="Puntos necesarios"
                  value={formatPts(total)}
                  hint="A descontar de tu bolsa"
                />
                <KpiCard
                  label="Tu saldo actual"
                  value={formatPts(bag)}
                  hint="Saldo actual disponible"
                />
                <KpiCard
                  label="Faltante"
                  value={formatPts(missing)}
                  hint={missing === 0 ? "Sin faltante" : "Faltan puntos"}
                />
                <KpiCard
                  label="Saldo después"
                  value={missing > 0 ? "—" : formatPts(after)}
                  hint={missing > 0 ? "Saldo insuficiente" : "Saldo restante estimado"}
                />
              </div>

              {/* Avisos de validación según el escenario */}
              {hasErrors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Archivo con errores</AlertTitle>
                  <AlertDescription>
                    Corrige el archivo y vuelve a subirlo. No se envía nada hasta que todas las filas estén correctas.
                  </AlertDescription>
                </Alert>
              )}

              {/* Si missing > 0: tarjeta destacada */}
              {missing > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-destructive">
                        Te faltan {formatPts(missing)} puntos
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tu bolsa tiene {formatPts(bag)} y este reparto necesita {formatPts(total)}.
                        {hasErrors && " (Calculado con las filas correctas)"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={() => setPurchaseOpen(true)}>
                        Comprar ${buy.usd} ({formatPts(buy.points)} pts)
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/cliente/comprar">
                          Ver paquetes de puntos
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isDuplicate && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900 font-semibold">Reparto ya enviado anteriormente</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    Este archivo ya se envió el {formatDate(reviewedBatch.alreadySentAt!)}.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabla de filas del archivo */}
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Fila</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead className="text-right">Comisión ($)</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewedBatch.rows.map((row) => (
                      <TableRow
                        key={row.rowNo}
                        className={row.error ? "bg-destructive/5 hover:bg-destructive/10" : undefined}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.rowNo}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.docType ? DOC_TYPE_LABEL[row.docType] : "Cédula"} {row.docNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.email || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.commissionCents != null ? formatUsd(row.commissionCents) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {row.points != null ? formatPts(row.points) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.reference ? row.reference : "—"}
                        </TableCell>
                        <TableCell>
                          {row.error ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              {row.error}
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                            >
                              Correcta
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Casillas obligatorias de confirmación */}
              <div className="space-y-4 rounded-lg bg-muted/30 p-4 border">
                {isDuplicate && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="duplicateCheckbox"
                      checked={duplicateChecked}
                      onCheckedChange={(checked) => setDuplicateChecked(checked === true)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="duplicateCheckbox" className="text-sm font-medium leading-none cursor-pointer">
                        Entiendo que se enviará de nuevo
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Confirma que deseas emitir una nueva entrega de puntos con el mismo archivo.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="authCheckbox"
                    checked={authChecked}
                    onCheckedChange={(checked) => setAuthChecked(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="authCheckbox" className="text-sm font-medium leading-none cursor-pointer">
                      Declaro estar autorizado a entregar estos puntos a estas personas y a tratar sus datos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Conforme a la normativa de protección de datos personales aplicable.
                    </p>
                  </div>
                </div>
              </div>

              {/* Paso 4: Botón de envío */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end border-t pt-4">
                <Button
                  size="lg"
                  disabled={!canSend}
                  onClick={() => setDialogOpen(true)}
                >
                  <Send className="mr-2 h-4 w-4" /> Enviar reparto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AlertDialog de confirmación irreversible (Regla 7) */}
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !isSending) setDialogOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar envío del reparto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se descontarán {reviewedBatch ? formatPts(reviewedBatch.totalPoints) : 0} puntos de tu bolsa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              disabled={isSending}
              onClick={handleConfirmSend}
            >
              {isSending && <Spinner className="mr-2" />}
              Confirmar envío
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de compra de puntos faltantes */}
      {missing > 0 && (
        <PurchaseDialog
          open={purchaseOpen}
          onOpenChange={setPurchaseOpen}
          usd={buy.usd}
          points={buy.points}
          onApproved={() => {
            addToBag(buy.points)
            toast.success(`+${formatPts(buy.points)} puntos en tu bolsa`)
          }}
        />
      )}
    </div>
  )
}
