import { DemoBar } from "@/components/demo/demo-bar"
import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Rapport - renewal and anniversary notes for independent agents and loan officers",
  description: "Rapport watches the dates that pay you - policy renewals, loan and home anniversaries, months since close - writes each note from your real history with that person, and sends it from your own Gmail or Microsoft 365 mailbox. $39 a month, no onboarding call.",
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
          <DemoBar />
        </body>
      </html>
    </ClerkProvider>
  )
}
