"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Gem, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { formatPoints, pointsFor, usdForPoints } from "@/lib/catalog"
import { useCatalog } from "@/lib/catalog-store"
import { usePoints } from "@/lib/points-store"

// Canje con Puntos: sin pasarela bancaria.
export default function CheckoutPage() {
  const router = useRouter()
  const { cart, cartTotal, balance, ready, redeem } = usePoints()
  const { findStore } = useCatalog()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const missing = cartTotal - balance

  if (!ready) return <div className="container px-4 py-12 text-center text-muted-foreground">Cargando…</div>

  if (!cart.length)
    return (
      <div className="container px-4 py-12 text-center">
        <h1 className="mb-4 text-2xl font-semibold">No hay gift cards para canjear</h1>
        <Button asChild>
          <Link href="/shop">Ver gift cards</Link>
        </Button>
      </div>
    )

  function onRedeem() {
    if (busy) return
    setBusy(true)
    const r = redeem({ recipientEmail: email.trim() || undefined, message: message.trim() || undefined })
    if (r.ok) router.push(`/checkout/success?order=${r.order.id}`)
    else setBusy(false)
  }

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-8 text-3xl font-bold">Confirmar canje</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardContent className="grid gap-4 p-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Mail className="h-5 w-5" /> ¿Es un regalo? (opcional)
              </h2>
              <div className="space-y-2">
                <Label htmlFor="email">Correo del destinatario</Label>
                <Input id="email" type="email" placeholder="nombre@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea id="message" maxLength={200} placeholder="¡Feliz cumpleaños!" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Demo: no se envía correo; los códigos aparecen al instante en pantalla.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Resumen</h2>
            {cart.map((i) => (
              <div key={`${i.storeId}-${i.usd}`} className="flex justify-between text-sm">
                <span>
                  {findStore(i.storeId)?.name} ${i.usd} × {i.qty}
                </span>
                <span className="tabular-nums">{formatPoints(pointsFor(i.usd) * i.qty)} pts</span>
              </div>
            ))}
            <Separator />
            <Row label="Total" value={`${formatPoints(cartTotal)} pts`} bold />
            <Row label="Tu saldo" value={`${formatPoints(balance)} pts`} />
            <Row label="Saldo después" value={missing > 0 ? "—" : `${formatPoints(balance - cartTotal)} pts`} />
            {missing > 0 ? (
              <>
                <p className="text-sm text-destructive">Te faltan {formatPoints(missing)} pts.</p>
                <Button className="w-full" size="lg" asChild>
                  <Link href={`/recargar?faltan=${missing}`}>
                    Comprar los {formatPoints(missing)} pts que faltan (${usdForPoints(missing)})
                  </Link>
                </Button>
              </>
            ) : (
              <Button className="w-full" size="lg" onClick={onRedeem} disabled={busy}>
                <Gem className="mr-2 h-4 w-4" /> Canjear {formatPoints(cartTotal)} puntos
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-semibold" : "text-sm text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
