import Link from "next/link"
import { Gift } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Gift className="h-5 w-5" />
              </span>
              <span className="text-xl font-bold">Regala</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Gift cards digitales de las tiendas favoritas de Ecuador, canjeables con Puntos.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Explorar</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/shop" className="text-sm text-muted-foreground hover:text-primary">
                Gift cards
              </Link>
              <Link href="/recargar" className="text-sm text-muted-foreground hover:text-primary">
                Recargar Puntos
              </Link>
              <Link href="/#como-funciona" className="text-sm text-muted-foreground hover:text-primary">
                Cómo funciona
              </Link>
            </nav>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Ayuda</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                Contacto
              </Link>
              <Link href="/#faq" className="text-sm text-muted-foreground hover:text-primary">
                Preguntas frecuentes
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
                Términos
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
                Privacidad
              </Link>
            </nav>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contacto</h3>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <p>Quito, Ecuador</p>
              <a href="mailto:hola@regala.ec" className="hover:text-primary">
                hola@regala.ec
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-8">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Regala. Las marcas mencionadas pertenecen a sus respectivos dueños.
          </p>
        </div>
      </div>
    </footer>
  )
}

