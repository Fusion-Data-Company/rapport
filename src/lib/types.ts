/**
 * Row shapes shared between the server and the client. Everything here is a type
 * only, so a client component can import it without pulling the database driver in.
 */
import type {
  contacts, contactChildren, contactDates, contactSportsTeams, contactTimeline, scheduledSends, cardTemplates,
} from "@/lib/db/schema"

export type ContactRow = typeof contacts.$inferSelect
export type ContactChildRow = typeof contactChildren.$inferSelect
export type ContactSportsTeamRow = typeof contactSportsTeams.$inferSelect
export type ContactDateRow = typeof contactDates.$inferSelect
export type ContactTimelineRow = typeof contactTimeline.$inferSelect
export type ScheduledSendRow = typeof scheduledSends.$inferSelect
export type CardTemplateRow = typeof cardTemplates.$inferSelect

/** A contact as the contacts API returns it: profile plus its children and teams. */
export type ContactWithRelations = ContactRow & {
  children?: ContactChildRow[]
  sportsTeams?: ContactSportsTeamRow[]
  customDates?: ContactDateRow[]
  timeline?: ContactTimelineRow[]
}

/** A scheduled send as the schedule API returns it: the row plus the contact's name. */
export type ScheduledSendView = ScheduledSendRow & {
  contactFirstName: string | null
  contactLastName: string | null
}
