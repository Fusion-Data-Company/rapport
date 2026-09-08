import { z } from "zod"
import { TIERS } from "@/lib/tier-labels"

const str = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null))
const dateStr = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().transform((v) => (v ? v : null))

/** The fields a contact may be created or edited with. Nothing else reaches the insert. */
export const ContactInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: str(80),
  nickname: str(80),
  email: z.string().trim().email().max(320).optional().nullable().transform((v) => (v ? v.toLowerCase() : null)),
  phone: str(40),
  tier: z.enum(TIERS).optional(),
  birthdate: dateStr,
  anniversary: dateStr,
  // The money dates
  policyRenewalDate: dateStr,
  policyType: str(80),
  loanClosedDate: dateStr,
  loanType: str(80),
  homePurchaseDate: dateStr,
  placeHometown: str(120),
  spouseName: str(120),
  spouseOccupation: str(120),
  companyName: str(160),
  jobTitle: str(120),
  city: str(80),
  state: str(40),
  zip: str(20),
  college: str(120),
  hobbies: str(500),
  carType: str(80),
  internalNotes: str(4000),
  sensitiveTopics: str(500),
  facebookUrl: str(300),
  linkedinUrl: str(300),
  instagramUrl: str(300),
  twitterUrl: str(300),
  tiktokUrl: str(300),
  websiteUrl: str(300),
})
export type ContactInputT = z.infer<typeof ContactInput>

export { activeContactCount } from "@/lib/tiers"
