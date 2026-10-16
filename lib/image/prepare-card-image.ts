import { isValidImage } from "@/lib/catalog-store"

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const CARD_W = 640
export const CARD_H = 404 // proporción de tarjeta 1,586:1

/** Lee la imagen, la recorta al centro con proporción de tarjeta y la reduce a JPEG (quita metadatos y pesa poco). */
export function prepareCardImage(file: File): Promise<string> {
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
export function prepareLogoImage(file: File): Promise<string> {
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
