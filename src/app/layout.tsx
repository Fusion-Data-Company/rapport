import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Rapport — The McKay 66 Relationship Engine",
  description: "Every client. Every milestone. Every time. Rapport automates hyper-personalized relationship touchpoints so your clients feel like your only client.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
