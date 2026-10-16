"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Copy, Lock, LogOut, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { GiftCardFace } from "@/components/gift-card"
import { cn } from "@/lib/utils"
import { formatPoints, type Store, type ThemeKey } from "@/lib/catalog"
import { isActive, useCatalog } from "@/lib/catalog-store"
import { adminConfigured, endAdminSession, hasAdminSession, verifyAdmin } from "@/lib/admin-auth"
import { useAdminSettings, useCardPoints } from "@/lib/mock/admin-settings"
import { DenomsEditor } from "@/components/panel/denoms-editor"
import { CardDesignEditor } from "@/components/panel/card-design-editor"

type Draft = {
  id: string | null // null = tienda nueva
  name: string
  category: string
  theme: ThemeKey
  denoms: number[]
  description: string
  featured: boolean
  active: boolean
  image: string | null
  logo: string | null
  colors: { from: string; to: string } | null
}

const EMPTY: Draft = {
  id: null,
  name: "",
  category: "",
  theme: "super",
  denoms: [10, 25, 50],
  description: "",
  featured: false,
  active: true,
  image: null,
  logo: null,
  colors: null,
}

const slugify = (t: string) =>
  t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)

export default function AdminPage() {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking")

  useEffect(() => {
    setState(hasAdminSession() ? "open" : "locked")
  }, [])

  if (state === "checking") return <div className="px-4 py-12 text-center text-muted-foreground">Cargando…</div>
  if (!adminConfigured) return <SetupNotice />
  if (state === "locked") return <LoginForm onSuccess={() => setState("open")} />
  return (
    <Panel
      onLogout={() => {
        endAdminSession()
        setState("locked")
      }}
    />
  )
}

function SetupNotice() {
  return (
    <div className="max-w-2xl space-y-4 px-4 py-12">
      <h1 className="text-2xl font-bold">Panel de administración sin configurar</h1>
      <p className="text-muted-foreground">
        Define tu clave de administrador. En PowerShell, dentro de la carpeta del proyecto (cambia el texto de ejemplo por una frase larga y propia):
      </p>
      <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">{`$clave = "cambia-esta-frase-larga-y-unica"
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($clave)) | ForEach-Object { $_.ToString("x2") })
"NEXT_PUBLIC_ADMIN_HASH=$hash" | Out-File -Encoding ascii .env.local`}</pre>
      <p className="text-sm text-muted-foreground">
        Luego detén el servidor (Ctrl+C) y vuelve a ejecutar <code>npm run dev</code>. El archivo <code>.env.local</code> no se sube a GitHub.
      </p>
    </div>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [pass, setPass] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    const ok = await verifyAdmin(pass)
    if (ok) return onSuccess()
    await new Promise((r) => setTimeout(r, 1000)) // frena la fuerza bruta casual
    setError("Clave incorrecta.")
    setBusy(false)
  }

  return (
    <div className="max-w-sm px-4 py-16">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Lock className="h-5 w-5" /> Administración
        </div>
        <div className="space-y-2">
          <Label htmlFor="pass">Clave de administrador</Label>
          <Input id="pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy || !pass}>
          {busy ? "Verificando…" : "Entrar"}
        </Button>
      </form>
    </div>
  )
}

function Panel({ onLogout }: { onLogout: () => void }) {
  const { allStores, customized, saveStore, removeStore, resetCatalog } = useCatalog()
  const { settings } = useAdminSettings()
  const cardPoints = useCardPoints()
  const min = settings.cardDenomMinUsd ?? 5
  const max = settings.cardDenomMaxUsd ?? 500

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})

  const categories = Array.from(new Set(allStores.map((s) => s.category)))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  function edit(s: Store) {
    setErrors({})
    setDraft({
      id: s.id,
      name: s.name,
      category: s.category,
      theme: s.theme,
      denoms: [...s.denoms],
      description: s.description,
      featured: s.featured === true,
      active: isActive(s),
      image: s.image ?? null,
      logo: s.logo ?? null,
      colors: s.colors ? { ...s.colors } : null,
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    const name = draft.name.trim()
    const category = draft.category.trim()
    if (name.length < 2 || name.length > 40) errs.name = "Entre 2 y 40 caracteres."
    if (category.length < 2 || category.length > 30) errs.category = "Entre 2 y 30 caracteres."
    if (draft.description.length > 120) errs.description = "Máximo 120 caracteres."
    if (draft.denoms.length < 1 || draft.denoms.length > 6) {
      errs.denoms = "Ingresa entre 1 y 6 valores."
    } else if (new Set(draft.denoms).size !== draft.denoms.length) {
      errs.denoms = "Hay valores repetidos."
    } else if (draft.denoms.some((d) => d < min || d > max || d % 5 !== 0)) {
      errs.denoms = `Todos los valores deben ser múltiplos de 5 entre $${min} y $${max}.`
    }
    let id = draft.id
    if (!id) {
      const base = slugify(name)
      if (!base) errs.name = "El nombre debe tener letras o números."
      id = base
      for (let n = 2; allStores.some((s) => s.id === id); n++) id = `${base}-${n}`
    }
    setErrors(errs)
    if (Object.keys(errs).length || !id) return
    const sortedDenoms = [...draft.denoms].sort((a, b) => a - b)
    const saved = saveStore({
      id,
      name,
      category,
      theme: draft.theme,
      denoms: sortedDenoms,
      description: draft.description.trim(),
      featured: draft.featured,
      active: draft.active,
      ...(draft.image ? { image: draft.image } : {}),
      ...(draft.logo ? { logo: draft.logo } : {}),
      ...(draft.colors ? { colors: draft.colors } : {}),
    })
    if (!saved) toast.error("No se pudo guardar en este navegador (almacenamiento lleno o modo privado). Prueba con una imagen más liviana.")
    else toast.success(draft.id ? "Tienda actualizada" : "Tienda añadida")
    setDraft(EMPTY)
  }

  function remove(s: Store) {
    if (!window.confirm(`¿Eliminar "${s.name}"? Para ocultarla sin borrarla, desactívala.`)) return
    removeStore(s.id)
    if (draft.id === s.id) {
      setDraft(EMPTY)
    }
    toast.success("Tienda eliminada")
  }

  const preview = [...draft.denoms].sort((a, b) => a - b)
  const previewStore: Store = {
    id: "x",
    name: draft.name.trim() || "Nombre de la tienda",
    category: draft.category,
    theme: draft.theme,
    denoms: preview,
    description: draft.description,
    ...(draft.image ? { image: draft.image } : {}),
    ...(draft.logo ? { logo: draft.logo } : {}),
    ...(draft.colors ? { colors: draft.colors } : {}),
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Catálogo de gift cards</h2>
          <p className="text-sm text-muted-foreground">
            {allStores.length} tiendas · {allStores.filter(isActive).length} visibles{customized ? " · catálogo personalizado" : " · catálogo original"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(allStores, null, 2)).then(() => toast.success("Catálogo copiado (JSON)"), () => toast.error("No se pudo copiar"))}
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!customized}
            onClick={() => {
              if (window.confirm("¿Restaurar el catálogo original? Se pierden tus cambios en este navegador.")) {
                resetCatalog()
                setDraft(EMPTY)
                toast.success("Catálogo restaurado")
              }
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar original
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        Modo demostración: los cambios se guardan solo en este navegador. Para que todos los visitantes vean tu catálogo, usa «Copiar JSON» y pégalo en <code>DEFAULT_STORES</code> de <code>lib/catalog.ts</code>.
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {allStores.length === 0 && <li className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No hay tiendas. Añade la primera.</li>}
          {allStores.map((s) => (
            <li key={s.id} className={cn("flex items-center gap-4 rounded-xl border bg-card p-3", !isActive(s) && "opacity-60")}>
              <GiftCardFace store={s} usd={s.denoms[0]} compact className="w-28 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  {s.featured && <Badge variant="secondary">Destacada</Badge>}
                  {!isActive(s) && <Badge variant="outline">Oculta</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{s.category}</p>
                <p className="text-xs text-muted-foreground">{s.denoms.map((d) => `$${d} = ${formatPoints(cardPoints(d, s.id))} pts`).join(" · ")}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => edit(s)} aria-label={`Editar ${s.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => remove(s)} aria-label={`Eliminar ${s.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="p-6">
            <form onSubmit={submit} noValidate className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{draft.id ? "Editar tienda" : "Nueva tienda"}</h2>
                {draft.id && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setErrors({}); setDraft(EMPTY) }}>
                    <Plus className="mr-1 h-4 w-4" /> Nueva
                  </Button>
                )}
              </div>
              <GiftCardFace store={previewStore} usd={preview[0] ?? 0} className="w-full" />
              <Field id="name" label="Nombre" error={errors.name}>
                <Input id="name" value={draft.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field id="category" label="Categoría" error={errors.category}>
                <Input id="category" list="categorias" value={draft.category} maxLength={30} onChange={(e) => set("category", e.target.value)} />
                <datalist id="categorias">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <DenomsEditor
                value={draft.denoms}
                onChange={(next) => set("denoms", next)}
                min={min}
                max={max}
                error={errors.denoms}
                hint={
                  preview.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {preview.map((d) => `$${d} = ${formatPoints(cardPoints(d, draft.id || undefined))} pts`).join(" · ")}
                    </p>
                  ) : null
                }
              />
              <Field id="description" label="Descripción" error={errors.description}>
                <Input id="description" value={draft.description} maxLength={120} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <CardDesignEditor
                value={draft}
                onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                resetKey={draft.id ?? "nueva"}
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Visible en la tienda</Label>
                <Switch id="active" checked={draft.active} onCheckedChange={(v) => set("active", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Destacada en el inicio</Label>
                <Switch id="featured" checked={draft.featured} onCheckedChange={(v) => set("featured", v)} />
              </div>
              <Button type="submit">{draft.id ? "Guardar cambios" : "Añadir tienda"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/shop" className="text-primary hover:underline">Ver la tienda</Link>
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
