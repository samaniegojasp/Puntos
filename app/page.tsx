import Link from "next/link"
import {
  ShoppingBasket,
  HeartPulse,
  Dumbbell,
  Hammer,
  ToyBrick,
  Shirt,
  Gem,
  Gift,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { GiftCardFace, GiftCardTile } from "@/components/gift-card"
import { CATEGORIES, PACKS, STORES, formatPoints } from "@/lib/catalog"

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Supermercado: ShoppingBasket,
  "Salud y belleza": HeartPulse,
  Deportes: Dumbbell,
  "Hogar y ferretería": Hammer,
  Juguetes: ToyBrick,
  Moda: Shirt,
}

export default function HomePage() {
  const featuredStores = STORES.filter((s) => s.featured)

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero */}
      <section className="bg-gradient-to-br from-primary/15 via-background to-pink-500/10 py-16 md:py-24 border-b">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6 text-center md:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                Regala lo que realmente quieren
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl max-w-xl mx-auto md:mx-0">
                Canjea tus Puntos por gift cards de las tiendas favoritas de Ecuador. Entrega digital inmediata.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
                <Button size="lg" asChild>
                  <Link href="/shop">Ver gift cards</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/recargar">Recargar Puntos</Link>
                </Button>
              </div>
            </div>

            <div className="relative hidden md:flex items-center justify-center h-80 overflow-hidden">
              {featuredStores.length >= 3 && (
                <div className="relative w-80 h-64">
                  <div className="absolute top-0 left-0 w-64 transform rotate-[-8deg] shadow-xl transition-transform hover:rotate-0 hover:z-20">
                    <GiftCardFace store={featuredStores[0]} usd={featuredStores[0].denoms[0]} />
                  </div>
                  <div className="absolute top-6 left-10 w-64 transform rotate-[4deg] shadow-xl transition-transform hover:rotate-0 hover:z-20">
                    <GiftCardFace store={featuredStores[1]} usd={featuredStores[1].denoms[0]} />
                  </div>
                  <div className="absolute top-12 left-20 w-64 transform rotate-[-2deg] shadow-xl transition-transform hover:rotate-0 hover:z-20">
                    <GiftCardFace store={featuredStores[2]} usd={featuredStores[2].denoms[0]} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Categorías */}
      <section className="py-12 md:py-16">
        <div className="container px-4 md:px-6 space-y-8">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
            <p className="text-muted-foreground">Explora gift cards por tus categorías preferidas</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || ShoppingBasket
              return (
                <Link
                  key={cat}
                  href={`/shop?categoria=${encodeURIComponent(cat)}`}
                  className="group flex flex-col items-center justify-center rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {cat}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3. Destacadas */}
      <section className="py-12 md:py-16 bg-muted/30 border-y">
        <div className="container px-4 md:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">Tiendas destacadas</h2>
              <p className="text-muted-foreground">Las marcas más populares de Ecuador listas para canjear</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/shop">Ver todas</Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredStores.map((store) => (
              <GiftCardTile key={store.id} store={store} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Cómo funciona */}
      <section id="como-funciona" className="py-12 md:py-20 scroll-mt-20">
        <div className="container px-4 md:px-6 space-y-10">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Cómo funciona</h2>
            <p className="text-muted-foreground max-w-xl">
              Regalar o canjear tus marcas favoritas es fácil, rápido y 100% digital.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl border bg-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gem className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold">1. Recarga Puntos</h3>
              <p className="text-sm text-muted-foreground">
                Adquiere paquetes de Puntos con tu tarjeta de forma segura y obtén bonificaciones.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl border bg-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold">2. Elige tu gift card</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona tu tienda favorita de Ecuador y el monto que deseas canjear.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl border bg-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold">3. Recibe tu código al instante</h3>
              <p className="text-sm text-muted-foreground">
                Obtén tu código digital de inmediato listo para usar o enviar como regalo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Paquetes */}
      <section className="py-12 md:py-20 bg-muted/30 border-y">
        <div className="container px-4 md:px-6 space-y-10">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Paquetes de Puntos</h2>
            <p className="text-muted-foreground max-w-xl">
              Ahorra más adquiriendo paquetes de Puntos para tus próximos canjes.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {PACKS.map((pack) => (
              <Card
                key={pack.id}
                className="relative flex flex-col justify-between overflow-hidden transition-all hover:shadow-xl"
              >
                {pack.badge && (
                  <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                    {pack.badge}
                  </Badge>
                )}
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Paquete</span>
                    <div className="text-3xl font-extrabold text-foreground">
                      {formatPoints(pack.points)}{" "}
                      <span className="text-lg font-normal text-muted-foreground">pts</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    ${pack.usd}
                  </div>
                  <Button className="w-full" asChild>
                    <Link href="/recargar">Recargar Puntos</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" className="py-12 md:py-20 scroll-mt-20">
        <div className="container px-4 md:px-6 max-w-3xl space-y-8">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
            <p className="text-muted-foreground">
              Todo lo que necesitas saber sobre el uso de Puntos y gift cards.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Qué son los Puntos?</AccordionTrigger>
              <AccordionContent>
                Los Puntos son la moneda digital de Regala con la que puedes canjear gift cards de las mejores tiendas de Ecuador sin complicaciones.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>¿Los Puntos caducan?</AccordionTrigger>
              <AccordionContent>
                En esta demo, no. Tus Puntos permanecerán guardados en tu saldo para cuando decidas utilizarlos.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>¿Cómo recibo mi gift card?</AccordionTrigger>
              <AccordionContent>
                Una vez confirmado el canje, recibirás de inmediato tu código digital en pantalla y podrás copiarlo para utilizarlo en tus compras.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>¿Puedo regalarla a otra persona?</AccordionTrigger>
              <AccordionContent>
                ¡Sí! Al momento del canje en el checkout puedes especificar el correo del destinatario y un mensaje personalizado.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 7. Newsletter */}
      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Recibe promociones de Puntos
              </h2>
              <p className="text-primary-foreground/90 md:text-lg">
                Suscríbete para recibir ofertas exclusivas, novedades de nuevas tiendas y bonificaciones de Puntos.
              </p>
            </div>
            <div className="w-full max-w-md space-y-2">
              <form className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Ingresa tu correo"
                  className="bg-primary-foreground text-foreground placeholder:text-muted-foreground"
                />
                <Button variant="secondary" type="submit" className="shrink-0">
                  Suscribirme
                </Button>
              </form>
              <p className="text-xs text-primary-foreground/80">
                No enviamos spam. Puedes cancelar tu suscripción en cualquier momento.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
