import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://puntos-three.vercel.app"
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/cuenta",
        "/cliente",
        "/proveedor",
        "/cart",
        "/checkout",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
