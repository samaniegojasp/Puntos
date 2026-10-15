"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Copy, ImagePlus, Lock, LogOut, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { GiftCardFace } from "@/components/gift-card"
import { cn } from "@/lib/utils"
import { THEMES, formatPoints, type Store, type ThemeKey } from "@/lib/catalog"
import { isActive, isValidImage, useCatalog } from "@/lib/catalog-store"
import { adminConfigured, endAdminSession, hasAdminSession, verifyAdmin } from "@/lib/admin-auth"
import { useAdminSettings, useCardPoints } from "@/lib/mock/admin-settings"

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
}

const THEME_LABELS: Record<ThemeKey, string> = {
  super: "Violeta–rosa",
  salud: "Celeste",
  deporte: "Naranja–rojo",
  hogar: "Verde",
  juguete: "Ámbar–rosa",
  moda: "Índigo–púrpura",
}

const slugify = (t: string) =>
  t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const CARD_W = 640
const CARD_H = 404 // proporción de tarjeta 1,586:1

/** Lee la imagen, la recorta al centro con proporción de tarjeta y la reduce a JPEG (quita metadatos y pesa poco). */
function prepareCardImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES.includes(file.type)) return reject(new Error("Usa una imagen PNG, JPG o WebP."))
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error("La imagen pesa más de 5 MB."))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement("canvas")
      canvas.width = CARD_W
      canvas.height = CARD_H
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("No se pudo procesar la imagen."))
      const scale = Math.max(CARD_W / img.width, CARD_H / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (CARD_W - w) / 2, (CARD_H - h) / 2, w, h)
      const out = canvas.toDataURL("image/jpeg", 0.85)
      isValidImage(out) ? resolve(out) : reject(new Error("La imagen es demasiado grande; prueba con una más simple."))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo leer la imagen."))
    }
    img.src = url
  })
}

/** Lee la imagen, la encaja dentro de 256×256 manteniendo la proporción y la exporta como PNG (conserva transparencia). */
function prepareLogoImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES.includes(file.type)) return reject(new Error("Usa una imagen PNG, JPG o WebP."))
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error("La imagen pesa más de 5 MB."))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(256 / img.width, 256 / img.height, 1)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("No se pudo procesar la imagen."))
      ctx.drawImage(img, 0, 0, w, h)
      const out = canvas.toDataURL("image/png")
      isValidImage(out) ? resolve(out) : reject(new Error("El logo es demasiado grande; prueba con una imagen más simple."))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo leer la imagen."))
    }
    img.src = url
  })
}

function getNextDenom(current: number[], min: number, max: number): number | null {
  if (current.length >= 6) return null
  const maxVal = current.length > 0 ? Math.max(...current) : min - 5
  const startAbove = Math.floor((maxVal + 5) / 5) * 5
  for (let v = startAbove; v <= max; v += 5) {
    if (!current.includes(v)) return v
  }
  const startMin = Math.ceil(min / 5) * 5
  for (let v = startMin; v <= max; v += 5) {
    if (!current.includes(v)) return v
  }
  return null
}

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

  function updateDenom(idx: number, val: number) {
    setDraft((d) => {
      const next = [...d.denoms]
      next[idx] = val
      return { ...d, denoms: next }
    })
  }

  function removeDenom(idx: number) {
    if (draft.denoms.length <= 1) return
    setDraft((d) => ({ ...d, denoms: d.denoms.filter((_, i) => i !== idx) }))
  }

  function addDenom() {
    if (draft.denoms.length >= 6) return
    const nextVal = getNextDenom(draft.denoms, min, max)
    if (nextVal !== null) {
      setDraft((d) => ({ ...d, denoms: [...d.denoms, nextVal] }))
    }
  }

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
    })
    if (!saved) toast.error("No se pudo guardar en este navegador (almacenamiento lleno o modo privado). Prueba con una imagen más liviana.")
    else toast.success(draft.id ? "Tienda actualizada" : "Tienda añadida")
    setDraft(EMPTY)
  }

  function remove(s: Store) {
    if (!window.confirm(`¿Eliminar "${s.name}"? Para ocultarla sin borrarla, desactívala.`)) return
    removeStore(s.id)
    if (draft.id === s.id) setDraft(EMPTY)
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
                <p className="text-xs text-muted-foreground">{s.denoms.map((d) => `$${d} = ${formatPoints(cardPoints(d))} pts`).join(" · ")}</p>
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
              <div className="space-y-2">
                <Label htmlFor="cardImage">Imagen completa de la tarjeta (opcional)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="cardImage"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="max-w-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (!file) return
                      try {
                        set("image", await prepareCardImage(file))
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "No se pudo cargar la imagen.")
                      }
                    }}
                  />
                  {draft.image && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => set("image", null)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Quitar imagen
                    </Button>
                  )}
                </div>
                <p className="flex items-start gap-1 text-xs text-muted-foreground">
                  <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  PNG, JPG o WebP, hasta 5 MB. Se recorta al centro con proporción de tarjeta (1,586:1) y reemplaza el degradado; el valor en dólares se superpone abajo a la derecha. Demo: se guarda solo en este navegador.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardLogo">Logo (opcional)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="cardLogo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="max-w-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (!file) return
                      try {
                        set("logo", await prepareLogoImage(file))
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "No se pudo cargar el logo.")
                      }
                    }}
                  />
                  {draft.logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => set("logo", null)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Quitar logo
                    </Button>
                  )}
                </div>
                <p className="flex items-start gap-1 text-xs text-muted-foreground">
                  <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Se muestra arriba a la izquierda sobre el color de la tarjeta. Si subes una imagen completa, esa imagen manda.
                </p>
              </div>
              <Field id="name" label="Nombre" error={errors.name}>
                <Input id="name" value={draft.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field id="category" label="Categoría" error={errors.category}>
                <Input id="category" list="categorias" value={draft.category} maxLength={30} onChange={(e) => set("category", e.target.value)} />
                <datalist id="categorias">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Valores en USD (máx. 6)</Label>
                  <span className="text-xs text-muted-foreground">
                    {draft.denoms.length}/6 valores
                  </span>
                </div>
                <div className="space-y-2">
                  {draft.denoms.map((denom, idx) => {
                    const rowError =
                      denom < min || denom > max
                        ? `Fuera de los límites de Ajustes ($${min}–$${max})`
                        : denom % 5 !== 0
                          ? "Debe ser múltiplo de 5"
                          : null

                    return (
                      <div key={idx} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold">${denom}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateDenom(idx, Math.min(max, Math.max(min, denom - 5)))}
                              disabled={denom <= min}
                              aria-label="Restar 5"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateDenom(idx, Math.min(max, Math.max(min, denom + 5)))}
                              disabled={denom >= max}
                              aria-label="Sumar 5"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeDenom(idx)}
                              disabled={draft.denoms.length <= 1}
                              aria-label="Eliminar valor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Slider
                          min={min}
                          max={max}
                          step={5}
                          value={[Math.min(Math.max(denom, min), max)]}
                          onValueChange={([val]) => updateDenom(idx, val)}
                          aria-label={`Valor ${idx + 1}`}
                        />
                        {rowError && <p className="text-xs text-destructive">{rowError}</p>}
                      </div>
                    )
                  })}
                </div>
                {errors.denoms && <p className="text-sm text-destructive">{errors.denoms}</p>}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addDenom}
                  disabled={draft.denoms.length >= 6}
                >
                  <Plus className="mr-1 h-4 w-4" /> Agregar valor
                </Button>
                {preview.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {preview.map((d) => `$${d} = ${formatPoints(cardPoints(d))} pts`).join(" · ")}
                  </p>
                )}
              </div>
              <Field id="description" label="Descripción" error={errors.description}>
                <Input id="description" value={draft.description} maxLength={120} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de la tarjeta">
                  {(Object.keys(THEMES) as ThemeKey[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={draft.theme === t}
                      aria-label={THEME_LABELS[t]}
                      title={THEME_LABELS[t]}
                      onClick={() => set("theme", t)}
                      className={cn("h-8 w-8 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-background", THEMES[t], draft.theme === t && "ring-2 ring-primary")}
                    />
                  ))}
                </div>
              </div>
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
