import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/terms",
  "/privacy",
  "/refunds",
  "/robots.txt",
  "/sitemap.xml",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/api/webhooks(.*)",
  "/api/stripe/webhook",
  "/api/cron(.*)",
  "/api/unsubscribe(.*)",
  "/api/onboarding(.*)",
  // The OAuth start and callback routes check the Clerk session (start) and a signed
  // state parameter (callback) themselves; the provider's redirect must reach them.
  "/api/oauth(.*)",
  // Inbound contacts from an AMS, a CRM or Zapier. Authorised by the per-tenant
  // token in the path, which is why it cannot sit behind a session check.
  "/api/inbound(.*)",
  // The card image itself. This is the <img> src in a note, so the people who fetch
  // it are mail clients and image proxies, months after the send, with no session
  // and no cookie - a session check here means every card in every inbox is a broken
  // image. It is authorised by the HMAC over occasion, name and subline, which is
  // what stops anyone minting a new one.
  "/api/cards/render",
])

const isMarketing = createRouteMatcher(["/", "/pricing", "/terms", "/privacy", "/refunds"])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // Signed-in user hitting marketing pages → send to dashboard
  if (userId && isMarketing(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Protect all non-public routes. Doing the redirect here rather than leaning on
  // auth.protect() means a signed-out visitor to /schedule lands on the sign-in page
  // and comes back to where they were going, instead of the 404 protect() falls back
  // to when it cannot work out a sign-in URL for itself.
  if (!isPublicRoute(req) && !userId) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const signIn = new URL("/sign-in", req.url)
    signIn.searchParams.set("redirect_url", `${req.nextUrl.pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(signIn)
  }

  // Expose the pathname to server layouts (used by the billing gate in app/(app)/layout.tsx).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", req.nextUrl.pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
