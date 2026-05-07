import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
  "/api/unsubscribe(.*)",
  "/api/onboarding(.*)",
])

const isOnboarding = createRouteMatcher(["/onboarding"])
const isMarketing = createRouteMatcher(["/", "/pricing"])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // Signed-in user hitting marketing pages → send to dashboard
  if (userId && isMarketing(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Protect all non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
