import { NextResponse } from "next/server"
import { db, contacts, contactSportsTeams, sportsEvents, sportsNotificationsSent, scheduledSends, tenants, tenantLlmConfig } from "@/lib/db"
import { fetchCompletedGames } from "@/lib/sports/espn"
import { eq, and, gte, sql } from "drizzle-orm"
import { generateEmailContent, type LLMConfig } from "@/lib/llm"

export const runtime = "nodejs"
export const maxDuration = 300

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let processed = 0; let queued = 0

  try {
    const games = await fetchCompletedGames()
    if (games.length === 0) return NextResponse.json({ ok: true, games: 0 })

    for (const game of games) {
      // Skip if already in DB
      const existing = await db.query.sportsEvents.findFirst({
        where: eq(sportsEvents.espnEventId, game.espnEventId),
      })
      let eventId: string

      if (existing) {
        eventId = existing.id
      } else {
        const [ev] = await db.insert(sportsEvents).values(game).returning()
        eventId = ev.id
      }

      processed++

      // Find contacts who follow either team
      const teams = [game.homeTeamId, game.awayTeamId].filter(Boolean)
      const fans = await db.query.contactSportsTeams.findMany({
        where: sql`${contactSportsTeams.teamId} = ANY(ARRAY[${teams.join(",")}])`,
        with: { contact: { with: { tenant: true } } },
      })

      for (const fan of fans) {
        const contact = fan.contact as any
        if (!contact || contact.status !== "active") continue

        const tenantId = contact.tenantId

        // Rate limit: 1 sports email per contact per 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        const recent = await db.query.sportsNotificationsSent.findFirst({
          where: and(
            eq(sportsNotificationsSent.contactId, contact.id),
            eq(sportsNotificationsSent.tenantId, tenantId),
            gte(sportsNotificationsSent.sentAt, new Date(sevenDaysAgo)),
          ),
        })
        if (recent) continue

        const isWin = game.winnerTeamId === fan.teamId
        const occasion = isWin ? "sports_win" : "sports_loss"

        // Get tenant LLM config
        const llmCfg = await db.query.tenantLlmConfig.findFirst({
          where: eq(tenantLlmConfig.tenantId, tenantId),
        })
        const llmConfig: LLMConfig = {
          provider: llmCfg?.provider ?? "openrouter",
          model: llmCfg?.model ?? "google/gemma-4-26b-a4b-it",
          apiKey: llmCfg?.apiKeyEncrypted ?? process.env.OPENROUTER_API_KEY,
          temperature: llmCfg?.temperature ?? 0.7,
        }

        const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })

        try {
          const { subject, body } = await generateEmailContent({
            occasion: isWin
              ? `${fan.teamName} win (${game.awayTeamName} ${game.awayScore} vs ${game.homeTeamName} ${game.homeScore})`
              : `${fan.teamName} loss`,
            contactFirstName: contact.firstName,
            context: {
              "favorite team": fan.teamName,
              "sport": fan.sport,
              hobbies: contact.hobbies,
              city: contact.city,
            },
            businessName: tenant?.businessName ?? "your business",
            sensitiveTopics: contact.sensitiveTopics,
            llmConfig,
          })

          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)

          await db.insert(scheduledSends).values({
            tenantId,
            contactId: contact.id,
            occasionType: occasion,
            occasionLabel: isWin ? `${fan.teamName} Win!` : `${fan.teamName} Loss`,
            scheduledDate: tomorrow.toISOString().split("T")[0],
            emailSubject: subject,
            emailBodyHtml: `<p>${body}</p>`,
            emailBodyText: body,
            sportsEventId: eventId,
          })

          await db.insert(sportsNotificationsSent).values({
            tenantId, contactId: contact.id, sportsEventId: eventId, outcome: isWin ? "win" : "loss",
          })

          queued++
        } catch (e) {
          console.error("Sports email gen failed:", e)
        }
      }
    }

    return NextResponse.json({ ok: true, games: processed, queued })
  } catch (e) {
    console.error("Sports cron error:", e)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}
