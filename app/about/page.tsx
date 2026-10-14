import Link from "next/link"
import { Gift, Zap, ShieldCheck, Heart, Sparkles, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container px-4 py-8 md:px-6 md:py-12 space-y-16">
      {/* Encabezado y Breadcrumbs */}
      <div>
        <nav className="flex items-center text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary transition-colors">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">Nosotros</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight">Sobre Regala</h1>
      </div>

      {/* Misión e Historia */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Nuestra razón de ser
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Hacer fácil regalar en Ecuador
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            En Regala transformamos la experiencia de dar y recibir obsequios en el país. Creemos firmemente que el mejor regalo es aquel que la persona realmente desea y elige por sí misma.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Nuestra plataforma digital basada en Puntos conecta a los usuarios con las tiendas más queridas y reconocidas de Ecuador, eliminando la incertidumbre, las filas y las demoras de los envíos físicos tradicionales.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Ya sea para un cumpleaños, un aniversario, un agradecimiento o una recompensa especial, Regala te permite elegir el monto exacto y entregar el código digital al instante.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base">100% Digital</h3>
              <p className="text-xs text-muted-foreground">
                Códigos inmediatos entregados en tu pantalla.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base">Marcas líderes</h3>
              <p className="text-xs text-muted-foreground">
                Supermercados, salud, deportes, moda, hogar y juguetes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base">Sin demoras</h3>
              <p className="text-xs text-muted-foreground">
                Canjea en segundos cuando y donde quieras.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base">Transparente</h3>
              <p className="text-xs text-muted-foreground">
                Tus Puntos no caducan en esta demo y son fáciles de gestionar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Valores */}
      <div className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Nuestros valores</h2>
          <p className="text-muted-foreground">
            Los principios que guían cada decisión en nuestra plataforma.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card rounded-2xl border p-6 text-center space-y-3">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Empatía y cercanía</h3>
            <p className="text-sm text-muted-foreground">
              Pensamos en las necesidades reales de quienes regalan y quienes reciben en Ecuador.
            </p>
          </div>

          <div className="bg-card rounded-2xl border p-6 text-center space-y-3">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Inmediatez</h3>
            <p className="text-sm text-muted-foreground">
              Respuestas y canjes sin fricción, diseñados para el ritmo de vida actual.
            </p>
          </div>

          <div className="bg-card rounded-2xl border p-6 text-center space-y-3">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Confianza</h3>
            <p className="text-sm text-muted-foreground">
              Transparencia en cada canje: ves cuántos Puntos usas y cuál es tu saldo.
            </p>
          </div>

          <div className="bg-card rounded-2xl border p-6 text-center space-y-3">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto">
              <Gift className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Libertad de elección</h3>
            <p className="text-sm text-muted-foreground">
              El destinatario siempre tiene el poder de decidir exactamente lo que necesita.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-12 text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold">Empieza a regalar hoy</h2>
        <p className="max-w-xl mx-auto text-primary-foreground/90 text-sm md:text-base">
          Explora nuestro catálogo de gift cards de las tiendas favoritas de Ecuador y canjea con tus Puntos.
        </p>
        <div className="pt-2">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/shop">Explorar gift cards</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
