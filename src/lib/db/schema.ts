import {
  pgTable, text, timestamp, boolean, integer, real, date, uuid, jsonb, index, uniqueIndex
} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// ── Tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  businessName: text("business_name").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  replyTo: text("reply_to"),
  logoUrl: text("logo_url"),
  plan: text("plan").notNull().default("starter"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  // CAN-SPAM: the sender's physical mailing address, printed in every note's footer.
  postalAddress: text("postal_address"),
  // A renewal note goes out this many days BEFORE the renewal date; the money date is
  // only useful early. Zero means "on the day".
  renewalLeadDays: integer("renewal_lead_days").notNull().default(30),
  // "N months since close" touches, in months after the closing date.
  milestoneMonths: integer("milestone_months").array(),
  // On by default: nothing leaves the building until the agent has read it.
  alwaysReview: boolean("always_review").notNull().default(true),
  // Minimum days between notes, by contact tier. A is the inner circle and hears
  // about everything; C is the long tail and hears from you a few times a year.
  tierAMinDays: integer("tier_a_min_days").notNull().default(0),
  tierBMinDays: integer("tier_b_min_days").notNull().default(21),
  tierCMinDays: integer("tier_c_min_days").notNull().default(75),
  /** Path segment on the inbound URL an AMS, CRM or Zapier posts contacts to. */
  inboundToken: text("inbound_token"),
  /** The agent's own Google review link. No link, no review requests. */
  googleReviewUrl: text("google_review_url"),
  /** Days after a closing to ask for the review. Zero switches the automatic ask off. */
  reviewRequestDays: integer("review_request_days").notNull().default(30),
  status: text("status").notNull().default("active"),
  // Billing (Stripe)
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").notNull().default("trialing"),
  seats: integer("seats").notNull().default(1),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).default(sql`now() + interval '14 days'`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("tenants_slug_idx").on(t.slug),
}))

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  clerkIdx: uniqueIndex("tenant_users_clerk_idx").on(t.clerkUserId),
}))

// ── Contacts (relationship profile) ───────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Identity
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  nickname: text("nickname"),
  email: text("email"),
  phone: text("phone"),

  // Personal
  birthdate: date("birthdate"),
  birthdateYearUnknown: boolean("birthdate_year_unknown").notNull().default(false),
  placeHometown: text("place_hometown"),
  height: text("height"),
  weight: text("weight"),

  // Family
  spouseName: text("spouse_name"),
  spouseOccupation: text("spouse_occupation"),
  spouseEducation: text("spouse_education"),
  spouseInterests: text("spouse_interests"),
  anniversary: date("anniversary"),

  // ── The money dates ────────────────────────────────────────────────────────
  // The dates a renewal or a referral actually turns on. A birthday is a courtesy;
  // these are the reason the book is worth anything.
  policyRenewalDate: date("policy_renewal_date"),
  policyType: text("policy_type"),
  loanClosedDate: date("loan_closed_date"),
  loanType: text("loan_type"),
  homePurchaseDate: date("home_purchase_date"),

  // Education
  highSchool: text("high_school"),
  highSchoolGradYear: integer("high_school_grad_year"),
  college: text("college"),
  collegeGradYear: integer("college_grad_year"),
  collegeHonors: text("college_honors"),
  degrees: text("degrees"),
  collegeFraternity: text("college_fraternity"),
  collegeSports: text("college_sports"),
  collegeActivities: text("college_activities"),
  collegeSensitive: boolean("college_sensitive").notNull().default(false),

  // Military
  militaryService: text("military_service"),
  militaryRank: text("military_rank"),
  militaryAttitude: text("military_attitude"),

  // Business
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country").default("US"),
  businessPhone: text("business_phone"),
  jobTitle: text("job_title"),
  previousEmployer1: text("previous_employer_1"),
  previousEmployer2: text("previous_employer_2"),
  statusSymbols: text("status_symbols"),
  professionalAssociations: text("professional_associations"),
  officesHeld: text("offices_held"),
  businessObjectiveLongRange: text("business_objective_long_range"),
  businessObjectiveImmediate: text("business_objective_immediate"),
  greatestConcern: text("greatest_concern"),
  presentOrFuture: text("present_or_future"),

  // Special Interests
  clubs: text("clubs"),
  politicallyActive: boolean("politically_active"),
  politicalParty: text("political_party"),
  communityActive: text("community_active"),
  religion: text("religion"),
  religionActive: boolean("religion_active"),
  sensitiveTopics: text("sensitive_topics"),
  strongFeelings: text("strong_feelings"),

  // Lifestyle
  medicalHistory: text("medical_history"),
  drinks: boolean("drinks"),
  drinkType: text("drink_type"),
  smokes: boolean("smokes"),
  favoriteLunchRestaurant: text("favorite_lunch_restaurant"),
  favoriteDinnerRestaurant: text("favorite_dinner_restaurant"),
  favoriteMenuItems: text("favorite_menu_items"),
  hobbies: text("hobbies"),
  vacationHabits: text("vacation_habits"),

  // Personality / Interests
  carType: text("car_type"),
  conversationalInterests: text("conversational_interests"),
  adjectives: text("adjectives"),
  proudestAchievement: text("proudest_achievement"),
  personalObjectiveLongRange: text("personal_objective_long_range"),
  personalObjectiveImmediate: text("personal_objective_immediate"),
  moralConsiderations: text("moral_considerations"),
  customerObligations: text("customer_obligations"),
  requiresHabitChange: text("requires_habit_change"),
  concernsAboutOpinion: boolean("concerns_about_opinion"),
  selfCentered: boolean("self_centered"),
  highlyEthical: boolean("highly_ethical"),
  keyProblems: text("key_problems"),
  managementPriorities: text("management_priorities"),

  // Social Media Links
  facebookUrl: text("facebook_url"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  tiktokUrl: text("tiktok_url"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),

  // Geocoding
  latitude: real("latitude"),
  longitude: real("longitude"),
  geocodedAddress: text("geocoded_address"),

  // Meta
  /** "A" inner circle, "B" the working book, "C" the long tail. Drives cadence. */
  tier: text("tier").notNull().default("B"),
  internalNotes: text("internal_notes"),
  status: text("status").notNull().default("active"),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  tags: text("tags").array(),
  source: text("source").default("manual"),
  externalId: text("external_id"),
  enrichmentScore: integer("enrichment_score").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index("contacts_tenant_idx").on(t.tenantId),
  emailIdx: index("contacts_email_idx").on(t.email),
}))

export const contactChildren = pgTable("contact_children", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthdate: date("birthdate"),
  birthdateYearUnknown: boolean("birthdate_year_unknown").notNull().default(false),
  ageApprox: integer("age_approx"),
  school: text("school"),
  interests: text("interests"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/** Any other date this contact should be remembered on. Free-form, per contact. */
export const contactDates = pgTable("contact_dates", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  date: date("date").notNull(),
  /** "annual" repeats every year on the same month and day; "once" fires on the date itself. */
  recurrence: text("recurrence").notNull().default("annual"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  contactIdx: index("contact_dates_contact_idx").on(t.contactId),
  tenantIdx: index("contact_dates_tenant_idx").on(t.tenantId),
}))

/**
 * What actually happened with this contact: notes the agent typed, notes Rapport
 * sent, replies pasted back in, calls and meetings. The writer reads the last few
 * entries so a note can reference the real last conversation instead of guessing
 * from a static profile.
 */
export const contactTimeline = pgTable("contact_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  /** "note" | "sent" | "reply" | "call" | "meeting" */
  kind: text("kind").notNull().default("note"),
  /** Short headline: the subject of a note, or the first line of a call log. */
  summary: text("summary"),
  body: text("body").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  /** "manual" when a person typed it, "rapport" when the app wrote it. */
  source: text("source").notNull().default("manual"),
  scheduledSendId: uuid("scheduled_send_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  contactIdx: index("contact_timeline_contact_idx").on(t.contactId, t.occurredAt),
  tenantIdx: index("contact_timeline_tenant_idx").on(t.tenantId),
}))

export const contactSportsTeams = pgTable("contact_sports_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sport: text("sport").notNull(),
  teamName: text("team_name").notNull(),
  teamId: text("team_id"),
  league: text("league"),
  level: text("level").notNull().default("pro"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ── Card Templates ────────────────────────────────────────────────────────────

export const cardTemplates = pgTable("card_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  occasionType: text("occasion_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ── Scheduled Sends ───────────────────────────────────────────────────────────

export const scheduledSends = pgTable("scheduled_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  occasionType: text("occasion_type").notNull(),
  occasionLabel: text("occasion_label").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  status: text("status").notNull().default("pending"),
  cardTemplateId: uuid("card_template_id").references(() => cardTemplates.id),
  emailSubject: text("email_subject"),
  emailBodyHtml: text("email_body_html"),
  emailBodyText: text("email_body_text"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  sportsEventId: uuid("sports_event_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  tenantDateIdx: index("scheduled_sends_tenant_date_idx").on(t.tenantId, t.scheduledDate),
}))

// ── Sports Events ─────────────────────────────────────────────────────────────

export const sportsEvents = pgTable("sports_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  espnEventId: text("espn_event_id"),
  sport: text("sport").notNull(),
  league: text("league").notNull(),
  homeTeamName: text("home_team_name").notNull(),
  homeTeamId: text("home_team_id"),
  awayTeamName: text("away_team_name").notNull(),
  awayTeamId: text("away_team_id"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  winnerTeamId: text("winner_team_id"),
  winnerTeamName: text("winner_team_name"),
  gameDate: date("game_date").notNull(),
  gameStatus: text("game_status").notNull().default("scheduled"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  espnIdx: uniqueIndex("sports_events_espn_idx").on(t.espnEventId),
}))

export const sportsNotificationsSent = pgTable("sports_notifications_sent", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  sportsEventId: uuid("sports_event_id").notNull().references(() => sportsEvents.id),
  outcome: text("outcome").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
})

// ── Provider Configs ──────────────────────────────────────────────────────────

export const tenantEmailConfig = pgTable("tenant_email_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // "google" and "microsoft" send through the provider API on an OAuth refresh token.
  // "smtp" is the fallback for every other mailbox.
  provider: text("provider").notNull().default("smtp"),
  apiKeyEncrypted: text("api_key_encrypted"),
  gmailRefreshToken: text("gmail_refresh_token"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  isVerified: boolean("is_verified").notNull().default(false),

  // OAuth mailbox (Gmail API / Microsoft Graph). Only the refresh token is stored, sealed.
  oauthEmail: text("oauth_email"),
  oauthRefreshTokenEncrypted: text("oauth_refresh_token_encrypted"),
  oauthScope: text("oauth_scope"),
  oauthConnectedAt: timestamp("oauth_connected_at", { withTimezone: true }),

  // Deliverability guardrails
  dailyCap: integer("daily_cap").notNull().default(40),
  warmupStartedAt: timestamp("warmup_started_at", { withTimezone: true }),
  // "plain" sends a text-only note, which is what a personal email from a real
  // person looks like. "card" adds the branded HTML with the card image.
  bodyStyle: text("body_style").notNull().default("plain"),

  // Last DNS check for the sending domain: "pass" | "warn" | "fail" | null
  spfStatus: text("spf_status"),
  dkimStatus: text("dkim_status"),
  dmarcStatus: text("dmarc_status"),
  dnsDetail: jsonb("dns_detail"),
  dnsCheckedAt: timestamp("dns_checked_at", { withTimezone: true }),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  tenantIdx: uniqueIndex("tenant_email_config_tenant_idx").on(t.tenantId),
}))

export const tenantLlmConfig = pgTable("tenant_llm_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("openrouter"),
  apiKeyEncrypted: text("api_key_encrypted"),
  model: text("model").notNull().default("google/gemma-4-26b-a4b-it"),
  temperature: real("temperature").notNull().default(0.7),
  customBaseUrl: text("custom_base_url"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  tenantIdx: uniqueIndex("tenant_llm_config_tenant_idx").on(t.tenantId),
}))

export const tenantAgentConfig = pgTable("tenant_agent_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  agentId: text("agent_id"),
  voiceId: text("voice_id").default("kPzsL2i3teMYv0FxEYQ6"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  tenantIdx: uniqueIndex("tenant_agent_config_tenant_idx").on(t.tenantId),
}))

// ── Agent Sessions ────────────────────────────────────────────────────────────

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id"),
  sessionType: text("session_type").notNull().default("onboarding"),
  transcript: jsonb("transcript"),
  actionsTaken: jsonb("actions_taken"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * Where send events go when they leave Rapport. Payloads are flat enough for Zapier
 * and signed so the receiver can prove they came from here.
 */
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  /** Sealed with ENCRYPTION_KEY; shown to the agent once, at creation. */
  secretEncrypted: text("secret_encrypted").notNull(),
  description: text("description"),
  events: text("events").array(),
  isActive: boolean("is_active").notNull().default(true),
  lastStatus: integer("last_status"),
  lastError: text("last_error"),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index("webhook_endpoints_tenant_idx").on(t.tenantId),
}))

// ── Send Log ──────────────────────────────────────────────────────────────────

export const sendLog = pgTable("send_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  scheduledSendId: uuid("scheduled_send_id").references(() => scheduledSends.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index("send_log_tenant_idx").on(t.tenantId),
}))

// ── Relations ─────────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(tenantUsers),
  contacts: many(contacts),
  cardTemplates: many(cardTemplates),
  scheduledSends: many(scheduledSends),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [contacts.tenantId], references: [tenants.id] }),
  children: many(contactChildren),
  sportsTeams: many(contactSportsTeams),
  customDates: many(contactDates),
  timeline: many(contactTimeline),
  scheduledSends: many(scheduledSends),
}))

export const contactTimelineRelations = relations(contactTimeline, ({ one }) => ({
  contact: one(contacts, { fields: [contactTimeline.contactId], references: [contacts.id] }),
}))

export const contactDatesRelations = relations(contactDates, ({ one }) => ({
  contact: one(contacts, { fields: [contactDates.contactId], references: [contacts.id] }),
}))

export const contactChildrenRelations = relations(contactChildren, ({ one }) => ({
  contact: one(contacts, { fields: [contactChildren.contactId], references: [contacts.id] }),
}))

export const contactSportsTeamsRelations = relations(contactSportsTeams, ({ one }) => ({
  contact: one(contacts, { fields: [contactSportsTeams.contactId], references: [contacts.id] }),
}))

export const scheduledSendsRelations = relations(scheduledSends, ({ one }) => ({
  tenant: one(tenants, { fields: [scheduledSends.tenantId], references: [tenants.id] }),
  contact: one(contacts, { fields: [scheduledSends.contactId], references: [contacts.id] }),
  cardTemplate: one(cardTemplates, { fields: [scheduledSends.cardTemplateId], references: [cardTemplates.id] }),
}))
