"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GiftCardTile } from "@/components/gift-card"
import { pointsFor } from "@/lib/catalog"
import { useCatalog } from "@/lib/catalog-store"

type SortOption = "featured" | "asc" | "desc"

function normalize(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

function ShopContent() {
  const searchParams = useSearchParams()
  const { stores, categories, ready } = useCatalog()

  const catParam = searchParams.get("categoria")
  const initialCategory = catParam && categories.includes(catParam) ? catParam : "Todas"
  const initialQuery = searchParams.get("q") || ""

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [query, setQuery] = useState<string>(initialQuery)
  const [sortOrder, setSortOrder] = useState<SortOption>("featured")

  useEffect(() => {
    const cat = searchParams.get("categoria")
    setSelectedCategory(cat && categories.includes(cat) ? cat : "Todas")
    setQuery(searchParams.get("q") || "")
  }, [searchParams, ready])

  const filteredStores = useMemo(() => {
    const q = normalize(query.trim())

    const list = stores.filter((s) => {
      const matchesCategory = selectedCategory === "Todas" || s.category === selectedCategory
      const matchesQuery =
        !q || normalize(s.name).includes(q) || normalize(s.category).includes(q)
      return matchesCategory && matchesQuery
    })

    return [...list].sort((a, b) => {
      if (sortOrder === "featured") {
        const aFeat = a.featured ? 1 : 0
        const bFeat = b.featured ? 1 : 0
        return bFeat - aFeat
      }
      if (sortOrder === "asc") {
        return pointsFor(a.denoms[0]) - pointsFor(b.denoms[0])
      }
      if (sortOrder === "desc") {
        return pointsFor(b.denoms[0]) - pointsFor(a.denoms[0])
      }
      return 0
    })
  }, [stores, selectedCategory, query, sortOrder])

  const handleClearFilters = () => {
    setQuery("")
    setSelectedCategory("Todas")
    setSortOrder("featured")
  }

  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      {/* Encabezado y breadcrumb */}
      <div className="flex flex-col gap-2">
        <nav className="flex items-center text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-primary">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">Gift cards</span>
        </nav>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Gift cards</h1>
          <span className="text-sm text-muted-foreground">
            {filteredStores.length} {filteredStores.length === 1 ? "tienda" : "tiendas"}
          </span>
        </div>
      </div>

      {/* Barra superior de controles */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tiendas…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar:</span>
          <Select value={sortOrder} onValueChange={(val: SortOption) => setSortOrder(val)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Destacadas</SelectItem>
              <SelectItem value="asc">Menos puntos</SelectItem>
              <SelectItem value="desc">Más puntos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chips de categoría */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro por categoría">
        {["Todas", ...categories].map((cat) => {
          const isActive = selectedCategory === cat
          return (
            <Button
              key={cat}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          )
        })}
      </div>

      {/* Grid de tiendas o estado vacío */}
      {filteredStores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No encontramos tiendas con ese criterio
          </p>
          <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <GiftCardTile key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  )
}
