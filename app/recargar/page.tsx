"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Gem, Lock, ShieldCheck, Info } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatPoints, usdForPoints, type PointsPack } from "@/lib/catalog"
import { usePublicOffer } from "@/lib/mock/admin-settings"
import { usePoints } from "@/lib/points-store"
import { formatCardNumber, formatExp, validateCard, type CardErrors, type CardInput } from "@/lib/payment"

// ÚNICA página del sitio con pago en dinero real (simulado).
export default function RecargarPage() {
  const { balance, ready, topUp, topUpCustom } = usePoints()
  const { packs: PACKS, custom } = usePublicOffer()
  const CUSTOM_MIN_USD = custom.minUsd
  const CUSTOM_MAX_USD = custom.maxUsd
  const CUSTOM_POINTS_PER_USD = custom.pointsPerUsd
  const [pack, setPack] = useState<PointsPack | null>(null)
  // "A tu medida": dólares enteros al precio del paquete más pequeño (100 pts por $1)
  const [customUsd, setCustomUsd] = useState("")
  const [missing, setMissing] = useState(0)
  const customN = Number(customUsd)
  const customValid = Number.isInteger(customN) && customN >= CUSTOM_MIN_USD && customN <= CUSTOM_MAX_USD
  const isCustom = pack?.id === "custom"

  // Si llegas desde el carrito con "faltan N puntos", se propone exactamente el monto que cubre lo que falta
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("faltan"))
    if (Number.isInteger(n) && n > 0) {
      const usd = usdForPoints(n, custom)
      setMissing(n)
      setCustomUsd(String(usd))
      setPack({ id: "custom", points: Math.floor(usd * custom.pointsPerUsd), usd })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chooseCustom = (value: string) => {
    setCustomUsd(value)
    const n = Number(value)
    if (Number.isInteger(n) && n >= CUSTOM_MIN_USD && n <= CUSTOM_MAX_USD) {
      setPack({ id: "custom", points: Math.floor(n * CUSTOM_POINTS_PER_USD), usd: n })
    } else {
      setPack(null)
    }
  }
  const [card, setCard] = useState<CardInput>({ holder: "", number: "", exp: "", cvv: "" })
  const [errors, setErrors] = useState<CardErrors>({})
  const [processing, setProcessing] = useState(false)

  const set = (k: keyof CardInput, v: string) => setCard((c) => ({ ...c, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pack || processing) return
    const errs = validateCard(card)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setProcessing(true)
    // DEMO: aquí se llamaría a la pasarela. No se guarda ni envía la tarjeta.
    await new Promise((r) => setTimeout(r, 1200))
    const last4 = card.number.replace(/\D/g, "").slice(-4)
    if (pack.id === "custom") topUpCustom(pack.usd, last4)
    else topUp(pack.id, last4)
    toast.success(`+${formatPoints(pack.points)} Puntos añadidos a tu saldo`)
    setCard({ holder: "", number: "", exp: "", cvv: "" })
    setPack(null)
    setCustomUsd("")
    setMissing(0)
    setProcessing(false)
  }

  return (
    <div className="container max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Recargar Puntos</h1>
        <p className="text-muted-foreground">
          Saldo actual:{" "}
          <span className="font-semibold text-foreground tabular-nums">{ready ? formatPoints(balance) : "…"} pts</span>
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">
        <Info className="h-4 w-4 shrink-0" />
        Modo demostración: no se realiza ningún cobro real. Prueba con 4242 4242 4242 4242.
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Paquetes de Puntos">
        {PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pack?.id === p.id}
            onClick={() => setPack(p)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary",
              pack?.id === p.id && "border-primary shadow-lg",
            )}
          >
            {p.badge && (
              <span className="absolute -top-3 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">{p.badge}</span>
            )}
            <Gem className="h-10 w-10 text-primary" />
            <span className="text-2xl font-extrabold tabular-nums">{formatPoints(p.points)}</span>
            <span className="text-sm text-muted-foreground">Puntos</span>
            <span className="mt-2 text-lg font-semibold">${p.usd}</span>
          </button>
        ))}

        {/* A tu medida */}
        <div
          role="radio"
          aria-checked={isCustom}
          tabIndex={0}
          onClick={() => customUsd && chooseCustom(customUsd)}
          className={cn(
            "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary",
            isCustom && "border-primary shadow-lg",
          )}
        >
          <span className="absolute -top-3 rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-secondary-foreground">
            A tu medida
          </span>
          <Gem className="h-10 w-10 text-primary" />
          <span className="text-2xl font-extrabold tabular-nums">
            {customValid ? formatPoints(Math.floor(customN * CUSTOM_POINTS_PER_USD)) : "—"}
          </span>
          <span className="text-sm text-muted-foreground">Puntos</span>
          <div className="mt-2 flex items-center gap-1 text-lg font-semibold">
            $
            <Input
              aria-label="Monto en dólares"
              inputMode="numeric"
              placeholder="0"
              value={customUsd}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => chooseCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="h-9 w-20 text-center"
            />
          </div>
          {customUsd && !customValid && (
            <span className="text-xs text-destructive">Entre ${CUSTOM_MIN_USD} y ${CUSTOM_MAX_USD}</span>
          )}
        </div>
      </div>

      {missing > 0 && isCustom && (
        <p className="mb-6 rounded-lg bg-primary/10 p-3 text-center text-sm">
          Te faltan <strong>{formatPoints(missing)} pts</strong>. Con <strong>${pack?.usd}</strong> compras{" "}
          <strong>{formatPoints(pack?.points ?? 0)} pts</strong>
          {pack && pack.points > missing ? ` (te sobran ${formatPoints(pack.points - missing)})` : ""}.
        </p>
      )}

      {pack && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={onSubmit} noValidate className="grid gap-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Lock className="h-4 w-4" /> Pago con tarjeta
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatPoints(pack.points)} Puntos por <span className="font-semibold text-foreground">${pack.usd}</span>
              </p>
              <Field id="holder" label="Titular" error={errors.holder}>
                <Input id="holder" autoComplete="cc-name" value={card.holder} onChange={(e) => set("holder", e.target.value)} />
              </Field>
              <Field id="number" label="Número de tarjeta" error={errors.number}>
                <Input id="number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => set("number", formatCardNumber(e.target.value))} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field id="exp" label="Vence" error={errors.exp}>
                  <Input id="exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.exp} onChange={(e) => set("exp", formatExp(e.target.value))} />
                </Field>
                <Field id="cvv" label="CVV" error={errors.cvv}>
                  <Input id="cvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => set("cvv", e.target.value.replace(/\D/g, ""))} />
                </Field>
              </div>
              <Button type="submit" size="lg" disabled={processing}>
                {processing ? "Procesando…" : `Pagar $${pack.usd}`}
              </Button>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Tus datos de tarjeta no se almacenan.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        ¿Ya tienes Puntos? <Link href="/shop" className="text-primary hover:underline">Explora las gift cards</Link>
      </p>
    </div>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
