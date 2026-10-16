"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Palette, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { THEMES, type ThemeKey } from "@/lib/catalog"
import { prepareCardImage, prepareLogoImage } from "@/lib/image/prepare-card-image"
import { removeFlatBackground } from "@/lib/image/remove-background"
import { cn } from "@/lib/utils"

export const THEME_LABELS: Record<ThemeKey, string> = {
  super: "Violeta–rosa",
  salud: "Celeste",
  deporte: "Naranja–rojo",
  hogar: "Verde",
  juguete: "Ámbar–rosa",
  moda: "Índigo–púrpura",
}

export type CardDesignValue = {
  theme: ThemeKey
  colors: { from: string; to: string } | null
  logo: string | null
  image: string | null
}

export type CardDesignEditorProps = {
  value: CardDesignValue
  onChange: (patch: Partial<CardDesignValue>) => void
  resetKey: string
  disabled?: boolean
}

export function CardDesignEditor({
  value,
  onChange,
  resetKey,
  disabled = false,
}: CardDesignEditorProps) {
  const [singleColor, setSingleColor] = useState(
    Boolean(value.colors && value.colors.from.toLowerCase() === value.colors.to.toLowerCase()),
  )
  const [logoOriginal, setLogoOriginal] = useState<string | null>(null)
  const [removeBg, setRemoveBg] = useState(false)
  const [tolerance, setTolerance] = useState(30)

  const valueLogoRef = useRef(value.logo)
  valueLogoRef.current = value.logo

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    setLogoOriginal(null)
    setRemoveBg(false)
    setTolerance(30)
    setSingleColor(
      Boolean(value.colors && value.colors.from.toLowerCase() === value.colors.to.toLowerCase()),
    )
  }, [resetKey])

  useEffect(() => {
    if (!value.logo) {
      setLogoOriginal(null)
      setRemoveBg(false)
      setTolerance(30)
    }
  }, [value.logo])

  useEffect(() => {
    if (!value.colors) {
      setSingleColor(false)
    }
  }, [value.colors])

  useEffect(() => {
    if (!logoOriginal) return
    if (!removeBg) {
      if (valueLogoRef.current !== logoOriginal) {
        onChangeRef.current({ logo: logoOriginal })
      }
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const cleaned = await removeFlatBackground(logoOriginal, tolerance)
        if (!cancelled) {
          onChangeRef.current({ logo: cleaned })
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "No se pudo quitar el fondo.")
        }
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [removeBg, tolerance, logoOriginal])

  return (
    <div className="space-y-4">
      {/* Imagen completa */}
      <div className="space-y-2">
        <Label htmlFor="cardImage">Imagen completa de la tarjeta (opcional)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="cardImage"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="max-w-xs"
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              try {
                onChange({ image: await prepareCardImage(file) })
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "No se pudo cargar la imagen.")
              }
            }}
          />
          {value.image && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({ image: null })}>
              <Trash2 className="mr-1 h-4 w-4" /> Quitar imagen
            </Button>
          )}
        </div>
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          PNG, JPG o WebP, hasta 5 MB. Se recorta al centro con proporción de tarjeta (1,586:1) y reemplaza el degradado; el valor en dólares se superpone abajo a la derecha. Demo: se guarda solo en este navegador.
        </p>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label htmlFor="cardLogo">Logo (opcional)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="cardLogo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="max-w-xs"
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              try {
                const processed = await prepareLogoImage(file)
                setLogoOriginal(processed)
                setRemoveBg(false)
                setTolerance(30)
                onChange({ logo: processed })
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "No se pudo cargar el logo.")
              }
            }}
          />
          {value.logo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onChange({ logo: null })
                setLogoOriginal(null)
                setRemoveBg(false)
                setTolerance(30)
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Quitar logo
            </Button>
          )}
        </div>
        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Se muestra al centro de la tarjeta, sobre el color. Si subes una imagen completa, esa imagen manda.
        </p>
        {value.logo && (
          <div className="mt-2 space-y-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-white p-1"
                style={{
                  backgroundImage: "conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0)",
                  backgroundSize: "12px 12px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value.logo} alt="Miniatura del logo" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="removeBg"
                    checked={removeBg}
                    disabled={disabled || !logoOriginal}
                    onCheckedChange={(checked) => setRemoveBg(Boolean(checked))}
                  />
                  <Label
                    htmlFor="removeBg"
                    className={cn(
                      "text-sm font-normal",
                      !disabled && logoOriginal ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground",
                    )}
                  >
                    Quitar fondo (fondos lisos)
                  </Label>
                </div>
                {!logoOriginal && (
                  <p className="text-xs text-muted-foreground">
                    Vuelve a subir el logo para quitar el fondo.
                  </p>
                )}
              </div>
            </div>

            {removeBg && logoOriginal && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="tolerance">Tolerancia</Label>
                  <span className="font-mono text-muted-foreground">{tolerance}</span>
                </div>
                <Slider
                  id="tolerance"
                  min={0}
                  max={100}
                  step={1}
                  disabled={disabled}
                  value={[tolerance]}
                  onValueChange={([val]) => setTolerance(val)}
                  aria-label="Tolerancia para quitar el fondo"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Funciona con fondos de un solo color (blanco, negro u otro). Para fotos con fondos complejos, sube un PNG ya transparente.
            </p>
          </div>
        )}
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color de la tarjeta">
          {(Object.keys(THEMES) as ThemeKey[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              disabled={disabled}
              aria-checked={value.colors === null && value.theme === t}
              aria-label={THEME_LABELS[t]}
              title={THEME_LABELS[t]}
              onClick={() => {
                onChange({ theme: t, colors: null })
                setSingleColor(false)
              }}
              className={cn(
                "h-8 w-8 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-background",
                THEMES[t],
                value.colors === null && value.theme === t && "ring-2 ring-primary",
                disabled && "cursor-not-allowed opacity-50",
              )}
            />
          ))}
          <button
            type="button"
            role="radio"
            disabled={disabled}
            aria-checked={value.colors !== null}
            aria-label="Personalizado"
            title="Personalizado"
            onClick={() => {
              if (!value.colors) {
                onChange({ colors: { from: "#7c3aed", to: "#ec4899" } })
                setSingleColor(false)
              }
            }}
            style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background",
              value.colors !== null && "ring-2 ring-primary",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Palette className="h-4 w-4 drop-shadow" />
          </button>
        </div>
        {value.colors && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="singleColor"
                checked={singleColor}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  const isSingle = Boolean(checked)
                  setSingleColor(isSingle)
                  if (isSingle && value.colors) {
                    onChange({ colors: { from: value.colors.from, to: value.colors.from } })
                  }
                }}
              />
              <Label htmlFor="singleColor" className={cn("text-sm font-normal", disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer")}>
                Un solo color
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="colorFrom" className="text-xs text-muted-foreground">
                  Color 1
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="colorFrom"
                    type="color"
                    disabled={disabled}
                    value={value.colors.from}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!value.colors) return
                      onChange({
                        colors: {
                          from: val,
                          to: singleColor ? val : value.colors.to,
                        },
                      })
                    }}
                    className={cn(
                      "h-8 w-8 rounded border border-input bg-transparent p-0",
                      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    )}
                  />
                  <span className="font-mono text-xs uppercase">{value.colors.from}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="colorTo" className="text-xs text-muted-foreground">
                  Color 2
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="colorTo"
                    type="color"
                    value={value.colors.to}
                    disabled={disabled || singleColor}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!value.colors) return
                      onChange({
                        colors: {
                          from: value.colors.from,
                          to: val,
                        },
                      })
                    }}
                    className={cn(
                      "h-8 w-8 rounded border border-input bg-transparent p-0",
                      (disabled || singleColor) ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    )}
                  />
                  <span className="font-mono text-xs uppercase">{value.colors.to}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
