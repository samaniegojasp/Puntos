"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import KpiCard from "@/components/panel/kpi-card"
import { MOCK_PUBLIC_PACKS, MOCK_SETTLEMENTS, MOCK_USERS } from "@/lib/mock/data"
import { MOCK_ADMIN_MONTHS, MOCK_ADMIN_SUMMARY, type MonthPoint } from "@/lib/mock/admin-kpis"
import { useAdminSettings } from "@/lib/mock/admin-settings"
import { formatPct, formatPts, formatUsd } from "@/lib/domain/format"
import { validatePricing } from "@/lib/domain/pricing"
import { cn } from "@/lib/utils"

// Colores de las series, validados con el validador de paletas (claro y oscuro). La identidad nunca depende solo del color:
// hay leyenda, etiquetas y vista en tabla.
const SERIES_A = "fill-[#7c3aed] dark:fill-[#9a78f5]"
const SERIES_A_BG = "bg-[#7c3aed] dark:bg-[#9a78f5]"
const SERIES_B = "fill-[#0d9488] dark:fill-[#17a899]"
const SERIES_B_BG = "bg-[#0d9488] dark:bg-[#17a899]"

const monthLabel = (m: string) =>
  new Intl.DateTimeFormat("es-EC", { month: "short" }).format(new Date(`${m}-15T12:00:00`)).replace(".", "")
const monthLong = (m: string) => {
  const s = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(new Date(`${m}-15T12:00:00`))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Rectángulo con las dos esquinas superiores redondeadas (el extremo de datos); la base queda recta sobre el eje. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

/** Máximo "redondo" para el eje y cuatro marcas. */
function niceScale(max: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(max || 1)))
  const n = max / pow
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
  const top = Math.ceil(max / (step / 2)) * (step / 2)
  return { top, ticks: [0, top / 4, top / 2, (top * 3) / 4, top] }
}

type BarDatum = { label: string; long: string; a: number; b?: number }

/** Barras (apiladas si hay dos series). Muestra el detalle al pasar el cursor o al enfocar con teclado. */
function BarChart({
  data,
  nameA,
  nameB,
  format,
  axisFormat,
  ariaLabel,
}: {
  data: BarDatum[]
  nameA: string
  nameB?: string
  format: (n: number) => string
  /** Formato corto para las marcas del eje (por defecto, el mismo del detalle) */
  axisFormat?: (n: number) => string
  ariaLabel: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 240
  const M = { top: 12, right: 8, bottom: 28, left: 64 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom
  const maxVal = Math.max(...data.map((d) => d.a + (d.b ?? 0)), 1)
  const { top, ticks } = niceScale(maxVal)
  const slot = innerW / data.length
  const bw = Math.min(40, slot * 0.55)
  const y = (v: number) => M.top + innerH - (v / top) * innerH
  const GAP = 2

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {(axisFormat ?? format)(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = M.left + slot * i + slot / 2
          const x = cx - bw / 2
          const hasB = d.b !== undefined
          const bH = hasB ? ((d.b ?? 0) / top) * innerH : 0
          const aH = (d.a / top) * innerH
          const bTop = M.top + innerH - bH
          return (
            <g
              key={d.label}
              tabIndex={0}
              role="img"
              aria-label={`${d.long}: ${nameA} ${format(d.a)}${hasB ? `, ${nameB} ${format(d.b ?? 0)}` : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              {/* Zona de impacto más grande que la barra */}
              <rect x={cx - slot / 2} y={M.top} width={slot} height={innerH} fill="transparent" />
              {hasB ? (
                <>
                  <rect x={x} y={bTop} width={bw} height={Math.max(bH, 0)} className={SERIES_B} />
                  <path
                    d={topRoundedBar(x, bTop - GAP - aH, bw, aH, 4)}
                    className={SERIES_A}
                  />
                </>
              ) : (
                <path d={topRoundedBar(x, M.top + innerH - aH, bw, aH, 4)} className={SERIES_A} />
              )}
              {hover === i && (
                <rect x={cx - slot / 2 + 2} y={M.top} width={slot - 4} height={innerH} className="fill-foreground/5" />
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {d.label}
              </text>
            </g>
          )
        })}
        <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} className="stroke-foreground/40" strokeWidth={1} />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[150px] rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
          style={{
            left: `${((M.left + slot * hover + slot / 2) / W) * 100}%`,
            top: 0,
            // En la mitad derecha el detalle se abre hacia la izquierda para no salirse de la tarjeta
            transform: hover >= data.length / 2 ? "translateX(-100%)" : "translateX(-20%)",
          }}
        >
          <p className="mb-1 font-semibold text-foreground first-letter:uppercase">{data[hover].long}</p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", SERIES_A_BG)} />
            {nameA}: <span className="ml-auto font-mono text-foreground">{format(data[hover].a)}</span>
          </p>
          {data[hover].b !== undefined && nameB && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", SERIES_B_BG)} />
              {nameB}: <span className="ml-auto font-mono text-foreground">{format(data[hover].b ?? 0)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Legend({ items }: { items: { name: string; bg: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", i.bg)} /> {i.name}
        </li>
      ))}
    </ul>
  )
}

/** Alternativa en tabla de un gráfico (accesibilidad y lectura exacta). */
function TableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] text-left">
          <thead>
            <tr className="border-b text-muted-foreground">
              {headers.map((h) => (
                <th key={h} className="py-1 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((cell, j) => (
                  <td key={j} className={cn("py-1 pr-4", j > 0 && "font-mono")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

const pctChange = (now: number, before: number) => (before > 0 ? (now - before) / before : 0)
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${formatPct(Math.abs(v))}`

export default function AdminResumenPage() {
  const [loading, setLoading] = useState(true)
  const { settings, providers, products, clients, publicPacks, standardPacks } = useAdminSettings()

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const months: MonthPoint[] = MOCK_ADMIN_MONTHS
  const cur = months[months.length - 1]
  const prev = months[months.length - 2]
  const revenue = (m: MonthPoint) => m.revenueCanjeadorCents + m.revenueClienteCents
  const S = MOCK_ADMIN_SUMMARY

  // Liquidaciones por pagar a Proveedores (de todos): pendientes y facturadas
  const settlementsDue = MOCK_SETTLEMENTS.filter((s) => s.status !== "paid")
  const settlementsDueCents = settlementsDue.reduce((sum, s) => sum + s.amountCents, 0)

  // Alertas calculadas con los datos vivos del panel
  const pricingErrors = validatePricing({
    settings,
    providers,
    products,
    standardPacks,
    publicPacks,
    clients,
  }).filter((i) => i.severity === "error")
  const clientsEmpty = clients.filter((c) => c.active && c.bagPoints === 0)
  const clientsLow = clients.filter((c) => c.active && c.bagPoints > 0 && c.bagPoints < 5000)
  const blockedUsers = MOCK_USERS.filter((u) => u.blocked)

  const alerts: { text: string; href: string }[] = []
  if (pricingErrors.length)
    alerts.push({
      text: `${pricingErrors.length} ${pricingErrors.length === 1 ? "regla de precios incumplida" : "reglas de precios incumplidas"}`,
      href: "/admin/precios",
    })
  if (clientsEmpty.length)
    alerts.push({ text: `${clientsEmpty.length} cliente(s) activo(s) con la bolsa en cero: ${clientsEmpty.map((c) => c.name).join(", ")}`, href: "/admin/clientes" })
  if (clientsLow.length)
    alerts.push({ text: `${clientsLow.length} cliente(s) con la bolsa casi vacía (menos de 5.000 pts): ${clientsLow.map((c) => c.name).join(", ")}`, href: "/admin/clientes" })
  if (settlementsDue.length)
    alerts.push({ text: `${settlementsDue.length} liquidación(es) por pagar a proveedores: ${formatUsd(settlementsDueCents)}`, href: "/admin/liquidaciones" })
  if (blockedUsers.length)
    alerts.push({ text: `${blockedUsers.length} cuenta(s) bloqueada(s)`, href: "/admin/usuarios" })

  const revNow = revenue(cur)
  const revChange = pctChange(revNow, revenue(prev))
  const marginPctOfRevenue = revNow > 0 ? cur.grossMarginCents / revNow : 0
  const topMax = Math.max(...S.topStores.map((t) => t.redemptions))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Resumen del negocio</h2>
        <p className="text-sm text-muted-foreground">
          {monthLong(cur.month)} frente al mes anterior. <strong>Cifras ilustrativas</strong>: los datos reales vendrán del sistema.
        </p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" /> Requiere atención ({alerts.length})
            </p>
            <ul className="space-y-1 text-sm text-amber-900">
              {alerts.map((a) => (
                <li key={a.text}>
                  • {a.text}{" "}
                  <Link href={a.href} className="font-medium underline underline-offset-2">
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardContent className="flex items-center gap-2 p-4 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4" /> Todo en orden: no hay alertas.
          </CardContent>
        </Card>
      )}

      {/* Dinero */}
      <section className="space-y-3" aria-labelledby="k-dinero">
        <h3 id="k-dinero" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Dinero
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Ingresos del mes" value={formatUsd(revNow)} hint={`${signed(revChange)} frente al mes anterior`} />
          <KpiCard
            label="Margen bruto del mes"
            value={formatUsd(cur.grossMarginCents)}
            hint={`${formatPct(marginPctOfRevenue)} de los ingresos`}
          />
          <KpiCard label="Recargo por cambios de tarjeta" value={formatUsd(cur.exchangeFeeCents)} hint="Tarjetas caducadas cambiadas por puntos" />
          <KpiCard
            label="Canjes del mes"
            value={formatPts(cur.redemptions)}
            hint={`Ticket promedio ${formatUsd(Math.round(revNow / cur.redemptions))} de ingreso por canje`}
          />
        </div>
      </section>

      {/* Lo que debemos */}
      <section className="space-y-3" aria-labelledby="k-deuda">
        <h3 id="k-deuda" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lo que debemos
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Puntos vivos (pasivo)" value={`${formatPts(S.pointsLive)} pts`} hint={`≈ ${formatUsd(S.pointsLiveCents)} al precio promedio de venta`} />
          <KpiCard label="Saldo en tarjetas vivas" value={formatUsd(S.cardsLiveBalanceCents)} hint={`${formatPts(S.cardsLiveCount)} tarjetas`} />
          <KpiCard
            label="Por pagar a proveedores"
            value={formatUsd(settlementsDueCents)}
            hint={`${settlementsDue.length} liquidación(es) pendiente(s) o facturada(s)`}
          />
          <KpiCard
            label="Caducan en 30 días"
            value={`${formatPts(S.expiringPoints30d)} pts`}
            hint={`${S.expiringCards30d} tarjetas por caducar`}
          />
        </div>
      </section>

      {/* Crecimiento */}
      <section className="space-y-3" aria-labelledby="k-crec">
        <h3 id="k-crec" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Crecimiento
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Usuarios totales" value={formatPts(S.usersTotal)} hint={`${formatPts(S.usersByRole.canjeador)} canjeadores · ${S.usersByRole.cliente} clientes · ${S.usersByRole.proveedor} proveedores`} />
          <KpiCard
            label="Usuarios nuevos del mes"
            value={formatPts(cur.newUsers)}
            hint={`${signed(pctChange(cur.newUsers, prev.newUsers))} frente al mes anterior`}
          />
          <KpiCard label="Clientes activos" value={String(clients.filter((c) => c.active).length)} hint={`${clients.length} registrados`} />
          <KpiCard
            label="Puntos en bolsas de clientes"
            value={`${formatPts(clients.reduce((sum, c) => sum + c.bagPoints, 0))} pts`}
            hint="Disponibles para repartir"
          />
        </div>
      </section>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ingresos por mes</CardTitle>
            <CardDescription>Venta de puntos, en USD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <Legend
                items={[
                  { name: "Canjeadores", bg: SERIES_A_BG },
                  { name: "Clientes", bg: SERIES_B_BG },
                ]}
              />
            </div>
            <BarChart
              ariaLabel="Ingresos por mes: Canjeadores y Clientes"
              nameA="Canjeadores"
              nameB="Clientes"
              format={(n) => formatUsd(Math.round(n))}
              axisFormat={(n) => `$${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(n / 100)}`}
              data={months.map((m) => ({
                label: monthLabel(m.month),
                long: monthLong(m.month),
                a: m.revenueCanjeadorCents,
                b: m.revenueClienteCents,
              }))}
            />
            <TableView
              headers={["Mes", "Canjeadores", "Clientes", "Total"]}
              rows={months.map((m) => [
                monthLong(m.month),
                formatUsd(m.revenueCanjeadorCents),
                formatUsd(m.revenueClienteCents),
                formatUsd(revenue(m)),
              ])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuarios nuevos por mes</CardTitle>
            <CardDescription>Registros de todos los roles</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              ariaLabel="Usuarios nuevos por mes"
              nameA="Usuarios nuevos"
              format={(n) => formatPts(Math.round(n))}
              data={months.map((m) => ({ label: monthLabel(m.month), long: monthLong(m.month), a: m.newUsers }))}
            />
            <TableView
              headers={["Mes", "Usuarios nuevos"]}
              rows={months.map((m) => [monthLong(m.month), formatPts(m.newUsers)])}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tiendas más canjeadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tiendas más canjeadas del mes</CardTitle>
          <CardDescription>Cantidad de tarjetas canjeadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {S.topStores.map((t) => (
              <li key={t.name} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate">{t.name}</span>
                <span className="h-2 rounded-full bg-muted" aria-hidden>
                  <span
                    className={cn("block h-2 rounded-full", SERIES_A_BG)}
                    style={{ width: `${(t.redemptions / topMax) * 100}%` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums">{t.redemptions}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
