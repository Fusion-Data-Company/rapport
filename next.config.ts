import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The card renderer reads two fonts and six plates off disk at request time. Neither
  // is imported, so nothing in the module graph tells Next they are needed, and the
  // lambda shipped without them - the route built clean, deployed READY, and then 500'd
  // on every request with an ENOENT that no build log ever mentioned. Anything read by
  // path rather than by import has to be named here.
  outputFileTracingIncludes: {
    "/api/cards/render": ["./assets/fonts/**", "./public/img/plates/**"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.vercel.app" },
      { protocol: "https", hostname: "**.blob.vercel-storage.com" },
    ],
  },
}

export default nextConfig
