"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart, Search, ChevronDown, Gift, User, Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import PointsBalance from "@/components/points-balance"
import { usePoints } from "@/lib/points-store"
import { useCatalog } from "@/lib/catalog-store"
import { useMockSession } from "@/lib/mock/session"
import { ROLE_LABEL } from "@/lib/domain/types"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopSearch, setDesktopSearch] = useState("")
  const [mobileSearch, setMobileSearch] = useState("")
  const router = useRouter()
  const { cartCount, ready } = usePoints()
  const { categories } = useCatalog()
  const { role, profile } = useMockSession()

  const handleDesktopSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (desktopSearch.trim()) {
      router.push(`/shop?q=${encodeURIComponent(desktopSearch.trim())}`)
    }
  }

  const handleMobileSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mobileSearch.trim()) {
      router.push(`/shop?q=${encodeURIComponent(mobileSearch.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Gift className="h-5 w-5" />
            </span>
            <span className="hidden text-xl font-bold sm:inline">Regala</span>
          </Link>
          <nav className="hidden lg:flex gap-6">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Inicio
            </Link>
            <Link href="/shop" className="text-sm font-medium transition-colors hover:text-primary">
              Gift cards
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary">
                Categorías <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map((c) => (
                  <DropdownMenuItem key={c} asChild>
                    <Link href={`/shop?categoria=${encodeURIComponent(c)}`} className="w-full">
                      {c}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/recargar" className="text-sm font-medium transition-colors hover:text-primary">
              Recargar Puntos
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
              Nosotros
            </Link>
            <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
              Contacto
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <PointsBalance />
          <div className="hidden lg:flex">
            <form onSubmit={handleDesktopSearch} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={desktopSearch}
                onChange={(e) => setDesktopSearch(e.target.value)}
                placeholder="Buscar tiendas…"
                className="w-[200px] pl-8 md:w-[250px] rounded-full bg-muted"
              />
            </form>
          </div>

          {/* Menú de usuario con Dropdown por rol */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hidden sm:inline-flex"
                aria-label="Cuenta de usuario"
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Cuenta de usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.fullName || "Usuario"}</p>
                  <p className="text-xs leading-none text-muted-foreground">Rol: {ROLE_LABEL[role]}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/cuenta" className="w-full cursor-pointer">
                  Mi cuenta
                </Link>
              </DropdownMenuItem>
              {(role === "cliente" || role === "admin") && (
                <DropdownMenuItem asChild>
                  <Link href="/cliente" className="w-full cursor-pointer">
                    Panel de Cliente
                  </Link>
                </DropdownMenuItem>
              )}
              {(role === "proveedor" || role === "admin") && (
                <DropdownMenuItem asChild>
                  <Link href="/proveedor" className="w-full cursor-pointer">
                    Panel de Proveedor
                  </Link>
                </DropdownMenuItem>
              )}
              {role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/clientes" className="w-full cursor-pointer">
                    Administración
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/login" className="w-full cursor-pointer">
                  Iniciar sesión
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                Cerrar sesión (prototipo)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {ready && cartCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary">
                  {cartCount}
                </Badge>
              )}
              <span className="sr-only">Carrito</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Menú</span>
          </Button>
        </div>
      </div>
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t p-4 space-y-4 bg-background">
          <form onSubmit={handleMobileSearch} className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Buscar tiendas…"
              className="w-full pl-8 rounded-full bg-muted"
            />
          </form>
          <nav className="flex flex-col space-y-4">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/shop"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Gift cards
            </Link>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium transition-colors hover:text-primary">
                Categorías <ChevronDown className="h-4 w-4" />
              </summary>
              <nav className="mt-2 ml-4 flex flex-col space-y-2">
                {categories.map((c) => (
                  <Link
                    key={c}
                    href={`/shop?categoria=${encodeURIComponent(c)}`}
                    className="text-sm transition-colors hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {c}
                  </Link>
                ))}
              </nav>
            </details>
            <Link
              href="/recargar"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Recargar Puntos
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Nosotros
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contacto
            </Link>

            {/* Sección de usuario en móvil */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-col space-y-0.5 px-1">
                <span className="text-sm font-semibold text-foreground">
                  {profile?.fullName || "Usuario"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Rol: {ROLE_LABEL[role]}
                </span>
              </div>
              <div className="flex flex-col space-y-2">
                <Link
                  href="/cuenta"
                  className="text-sm font-medium transition-colors hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mi cuenta
                </Link>
                {(role === "cliente" || role === "admin") && (
                  <Link
                    href="/cliente"
                    className="text-sm font-medium transition-colors hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Panel de Cliente
                  </Link>
                )}
                {(role === "proveedor" || role === "admin") && (
                  <Link
                    href="/proveedor"
                    className="text-sm font-medium transition-colors hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Panel de Proveedor
                  </Link>
                )}
                {role === "admin" && (
                  <Link
                    href="/admin/clientes"
                    className="text-sm font-medium transition-colors hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Administración
                  </Link>
                )}
                <Link
                  href="/login"
                  className="text-sm font-medium transition-colors hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <span className="text-sm text-muted-foreground/60 cursor-not-allowed">
                  Cerrar sesión (prototipo)
                </span>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
