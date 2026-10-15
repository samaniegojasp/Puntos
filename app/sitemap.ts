import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://puntos-three.vercel.app"
  return [
    { url: `${baseUrl}/` },
    { url: `${baseUrl}/shop` },
    { url: `${baseUrl}/recargar` },
    { url: `${baseUrl}/about` },
    { url: `${baseUrl}/contact` },
    { url: `${baseUrl}/terminos` },
    { url: `${baseUrl}/privacidad` },
  ]
}
