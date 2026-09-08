import type { MetadataRoute } from "next"

const SITE = (process.env.NEXT_PUBLIC_APP_URL || "https://rapport.fusiondataco.com").replace(/\/+$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/terms", "/privacy", "/refunds"], disallow: ["/api/", "/dashboard", "/contacts", "/schedule", "/settings", "/cards", "/sports", "/billing", "/onboarding", "/test"] },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
