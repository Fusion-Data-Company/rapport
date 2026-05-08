import { db, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"

export async function getTenantId(clerkUserId: string): Promise<string | null> {
  const u = await db.query.tenantUsers.findFirst({
    where: eq(tenantUsers.clerkUserId, clerkUserId),
  })
  return u?.tenantId ?? null
}
