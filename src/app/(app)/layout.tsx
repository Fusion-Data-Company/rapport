import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import AppShell from "@/components/layout/AppShell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  // Check if user has completed onboarding (has a tenant)
  const tenantUser = await db.query.tenantUsers.findFirst({
    where: eq(tenantUsers.clerkUserId, userId),
  })

  if (!tenantUser) {
    redirect("/onboarding")
  }

  return <AppShell>{children}</AppShell>
}
