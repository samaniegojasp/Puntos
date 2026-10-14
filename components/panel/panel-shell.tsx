"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"

export type PanelTab = { href: string; label: string }

/** Marco común de los paneles: título, pestañas (rutas) y aviso de prototipo. */
export default function PanelShell({
  title,
  subtitle,
  tabs,
  children,
}: {
  title: string
  subtitle?: string
  tabs: PanelTab[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // La pestaña activa es la de coincidencia más larga con la ruta actual.
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 sm:inline-flex">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Prototipo · datos de ejemplo
        </span>
      </div>

      <nav aria-label="Secciones" className="-mx-4 mb-6 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-1">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active?.href === t.href ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  active?.href === t.href
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  )
}
