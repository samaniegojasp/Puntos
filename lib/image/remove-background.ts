import { isValidImage } from "@/lib/catalog-store"

/**
 * Quita el fondo liso de una imagen raster usando un relleno por inundación
 * desde los bordes y suavizado periférico. No requiere librerías externas.
 *
 * @param dataUrl Imagen en formato data URL (PNG/JPEG/WebP)
 * @param tolerance Tolerancia de 0 a 100 (por defecto 30)
 * @returns Promise con el PNG resultante en data URL
 */
export function removeFlatBackground(dataUrl: string, tolerance: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Solo disponible en el navegador."))
    }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        if (!w || !h) {
          return reject(new Error("Dimensiones de imagen inválidas."))
        }

        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return reject(new Error("No se pudo obtener el contexto 2D."))
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, w, h)
        const data = imageData.data

        // 1. Recopilar píxeles del borde y encontrar el color de fondo más frecuente
        // agrupando cada canal en saltos de 8 (cuantización a múltiplos de 8).
        type Bucket = { count: number; rSum: number; gSum: number; bSum: number }
        const buckets = new Map<string, Bucket>()

        const borderIndices = new Set<number>()
        for (let x = 0; x < w; x++) {
          borderIndices.add(x) // borde superior (y = 0)
          borderIndices.add((h - 1) * w + x) // borde inferior (y = h - 1)
        }
        for (let y = 0; y < h; y++) {
          borderIndices.add(y * w) // borde izquierdo (x = 0)
          borderIndices.add(y * w + (w - 1)) // borde derecho (x = w - 1)
        }

        for (const i of borderIndices) {
          const idx = i * 4
          const a = data[idx + 3]
          // Solo consideramos píxeles con suficiente opacidad para el color de fondo
          if (a >= 32) {
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const qr = (r >> 3) << 3
            const qg = (g >> 3) << 3
            const qb = (b >> 3) << 3
            const key = `${qr},${qg},${qb}`
            let bucket = buckets.get(key)
            if (!bucket) {
              bucket = { count: 0, rSum: 0, gSum: 0, bSum: 0 }
              buckets.set(key, bucket)
            }
            bucket.count++
            bucket.rSum += r
            bucket.gSum += g
            bucket.bSum += b
          }
        }

        let bestBucket: Bucket | null = null
        let maxCount = -1
        for (const bucket of buckets.values()) {
          if (bucket.count > maxCount) {
            maxCount = bucket.count
            bestBucket = bucket
          }
        }

        // Si todos los bordes ya son transparentes o no hay píxeles, tomamos blanco por defecto
        const bgR = bestBucket ? Math.round(bestBucket.rSum / bestBucket.count) : 255
        const bgG = bestBucket ? Math.round(bestBucket.gSum / bestBucket.count) : 255
        const bgB = bestBucket ? Math.round(bestBucket.bSum / bestBucket.count) : 255

        const umbral = Math.max(0, tolerance * 2.2)

        // 2. Relleno por inundación (cola de índices + Uint8Array de visitados) desde todos los píxeles del borde
        const visited = new Uint8Array(w * h)
        const queue: number[] = []

        for (const i of borderIndices) {
          const idx = i * 4
          const a = data[idx + 3]
          if (a === 0) {
            visited[i] = 1
            queue.push(i)
          } else {
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
            if (dist <= umbral) {
              visited[i] = 1
              queue.push(i)
            }
          }
        }

        let head = 0
        while (head < queue.length) {
          const curr = queue[head++]
          const cx = curr % w
          const cy = Math.floor(curr / w)

          // 4-conexos: izquierda, derecha, arriba, abajo
          const neighbors: number[] = []
          if (cx > 0) neighbors.push(curr - 1)
          if (cx < w - 1) neighbors.push(curr + 1)
          if (cy > 0) neighbors.push(curr - w)
          if (cy < h - 1) neighbors.push(curr + w)

          for (const n of neighbors) {
            if (visited[n] === 0) {
              const nIdx = n * 4
              const na = data[nIdx + 3]
              if (na === 0) {
                visited[n] = 1
                queue.push(n)
              } else {
                const nr = data[nIdx]
                const ng = data[nIdx + 1]
                const nb = data[nIdx + 2]
                const dist = Math.sqrt((nr - bgR) ** 2 + (ng - bgG) ** 2 + (nb - bgB) ** 2)
                if (dist <= umbral) {
                  visited[n] = 1
                  queue.push(n)
                }
              }
            }
          }
        }

        // 3. Modificación de alfa:
        // Los píxeles alcanzados quedan con alfa 0.
        // Los vecinos de esos píxeles con distancia <= umbral * 1.5 quedan con alfa proporcional (borde suave).
        const origAlphas = new Uint8ClampedArray(w * h)
        for (let i = 0; i < w * h; i++) {
          origAlphas[i] = data[i * 4 + 3]
          if (visited[i] === 1) {
            data[i * 4 + 3] = 0
          }
        }

        if (umbral > 0) {
          const maxDist = umbral * 1.5
          const softSpan = umbral * 0.5 // Rango entre umbral y umbral * 1.5

          for (let i = 0; i < w * h; i++) {
            if (visited[i] === 1) {
              const cx = i % w
              const cy = Math.floor(i / w)

              const neighbors: number[] = []
              if (cx > 0) neighbors.push(i - 1)
              if (cx < w - 1) neighbors.push(i + 1)
              if (cy > 0) neighbors.push(i - w)
              if (cy < h - 1) neighbors.push(i + w)

              for (const n of neighbors) {
                if (visited[n] === 0 && origAlphas[n] > 0) {
                  const nIdx = n * 4
                  const nr = data[nIdx]
                  const ng = data[nIdx + 1]
                  const nb = data[nIdx + 2]
                  const dist = Math.sqrt((nr - bgR) ** 2 + (ng - bgG) ** 2 + (nb - bgB) ** 2)
                  if (dist <= maxDist) {
                    const factor = Math.max(0, Math.min(1, (dist - umbral) / softSpan))
                    const newAlpha = Math.round(origAlphas[n] * factor)
                    if (newAlpha < data[nIdx + 3]) {
                      data[nIdx + 3] = newAlpha
                    }
                  }
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0)
        const out = canvas.toDataURL("image/png")
        if (!isValidImage(out)) {
          return reject(new Error("El logo es demasiado grande; prueba con una imagen más simple."))
        }
        resolve(out)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."))
    img.src = dataUrl
  })
}
