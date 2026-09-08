/**
 * Demo-mode sample book. When NEXT_PUBLIC_DEMO_MODE=true every new tenant is
 * seeded with a dozen fictional contacts (birthdays, anniversaries, teams,
 * kids) so the dashboard, calendar and send queue have something to show the
 * moment a stranger signs up. Names, companies and emails are invented; the
 * email addresses use reserved example domains so nothing can ever deliver.
 */
import { db, contacts, contactChildren, contactDates, contactSportsTeams } from "@/lib/db"

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

function soon(daysFromNow: number, yearsAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const y = d.getFullYear() - yearsAgo
  return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const BOOK = [
  { firstName: "Dana", lastName: "Whitfield", email: "dana@example.com", companyName: "Whitfield Roofing", jobTitle: "Owner", birth: 3, born: 47, anniv: 40, spouse: "Marcus", hometown: "Tulsa, OK", team: "Kansas City Chiefs", kids: ["Ella (12)", "Owen (9)"], policy: 34, policyType: "Commercial auto" },
  { firstName: "Luis", lastName: "Ortega", email: "luis@example.com", companyName: "Ortega & Sons Plumbing", jobTitle: "President", birth: 9, born: 52, anniv: 120, spouse: "Carmen", hometown: "El Paso, TX", team: "Dallas Cowboys", kids: ["Mateo (16)"], policy: 12, policyType: "General liability", closed: 3, closedDay: 5 },
  { firstName: "Priya", lastName: "Raman", email: "priya@example.com", companyName: "Raman Dental Group", jobTitle: "Managing Partner", birth: 14, born: 41, anniv: 6, spouse: "Arjun", hometown: "Edison, NJ", team: "New York Knicks", kids: [], home: 6, homeDay: 8, customDate: "Practice anniversary", customDay: 26 },
  { firstName: "Tom", lastName: "Becker", email: "tom@example.com", companyName: "Becker Auto Body", jobTitle: "Owner", birth: 21, born: 58, anniv: 200, spouse: "Linda", hometown: "Green Bay, WI", team: "Green Bay Packers", kids: ["Josh (24)", "Katie (21)"], policy: 41, policyType: "Garage liability" },
  { firstName: "Aisha", lastName: "Bell", email: "aisha@example.com", companyName: "Bell Family Insurance", jobTitle: "Agency Principal", birth: 2, born: 39, anniv: 33, spouse: "Devon", hometown: "Atlanta, GA", team: "Atlanta Braves", kids: ["Zoe (5)"], closed: 1, closedDay: 2 },
  { firstName: "Greg", lastName: "Halvorsen", email: "greg@example.com", companyName: "Halvorsen Landscaping", jobTitle: "Founder", birth: 30, born: 44, anniv: 75, spouse: "Britt", hometown: "Duluth, MN", team: "Minnesota Vikings", kids: ["Sven (14)", "Ingrid (11)", "Leif (7)"], policy: 19, policyType: "Workers comp", home: 4, homeDay: 19 },
  { firstName: "Mei", lastName: "Chen", email: "mei@example.com", companyName: "Chen Realty Partners", jobTitle: "Broker", birth: 45, born: 36, anniv: 12, spouse: "Kevin", hometown: "San Jose, CA", team: "Golden State Warriors", kids: [], home: 2, homeDay: 11, customDate: "Licence renewal", customDay: 44 },
  { firstName: "Robert", lastName: "Okafor", email: "robert.o@example.com", companyName: "Okafor Logistics", jobTitle: "CEO", birth: 6, born: 50, anniv: 18, spouse: "Grace", hometown: "Houston, TX", team: "Houston Texans", kids: ["Chidi (19)", "Amara (17)"], policy: 7, policyType: "Fleet" },
  { firstName: "Hannah", lastName: "Fitzgerald", email: "hannah@example.com", companyName: "Fitzgerald CPA", jobTitle: "Partner", birth: 60, born: 45, anniv: 90, spouse: "Sean", hometown: "Boston, MA", team: "Boston Red Sox", kids: ["Liam (10)"], closed: 2, closedDay: 15 },
  { firstName: "Carlos", lastName: "Mendes", email: "carlos@example.com", companyName: "Mendes Pool & Spa", jobTitle: "Owner", birth: 11, born: 43, anniv: 27, spouse: "Ana", hometown: "Orlando, FL", team: "Orlando Magic", kids: ["Sofia (8)"], policy: 27, policyType: "Homeowners" },
  { firstName: "Janet", lastName: "Kowalski", email: "janet@example.com", companyName: "Kowalski Title Co", jobTitle: "Owner", birth: 25, born: 55, anniv: 150, spouse: "Ed", hometown: "Chicago, IL", team: "Chicago Bears", kids: ["Nick (26)"], home: 9, homeDay: 23 },
  { firstName: "Sam", lastName: "Nakamura", email: "sam.n@example.com", companyName: "Nakamura Electric", jobTitle: "Master Electrician", birth: 17, born: 38, anniv: 55, spouse: "Jess", hometown: "Portland, OR", team: "Portland Trail Blazers", kids: ["Kai (3)"], closed: 5, closedDay: 31, customDate: "Shop opened", customDay: 13 },
]

/** Idempotent per tenant: skips if the tenant already has contacts. */
export async function seedDemoBook(tenantId: string) {
  if (!isDemoMode) return 0
  const existing = await db.query.contacts.findFirst({ where: (c, { eq }) => eq(c.tenantId, tenantId) })
  if (existing) return 0
  let n = 0
  for (const p of BOOK) {
    const [c] = await db.insert(contacts).values({
      tenantId,
      firstName: p.firstName, lastName: p.lastName, email: p.email,
      companyName: p.companyName, jobTitle: p.jobTitle,
      birthdate: soon(p.birth, p.born), anniversary: soon(p.anniv, 10),
      spouseName: p.spouse, placeHometown: p.hometown,
      // The money dates, spread across the next few weeks so the schedule has renewals
      // and closing anniversaries in it and not only birthdays.
      policyRenewalDate: p.policy ? soon(p.policy, 0) : null,
      policyType: p.policyType ?? null,
      loanClosedDate: p.closed != null ? soon(p.closedDay ?? 0, p.closed) : null,
      loanType: p.closed != null ? "30-year fixed" : null,
      homePurchaseDate: p.home != null ? soon(p.homeDay ?? 0, p.home) : null,
      internalNotes: "Sample contact from the Rapport demo book. Replace with your own.",
    }).returning()
    if (p.customDate) {
      await db.insert(contactDates).values({
        contactId: c.id, tenantId, label: p.customDate, date: soon(p.customDay ?? 20, 1), recurrence: "annual",
      })
    }
    for (const k of p.kids) {
      const m = k.match(/^(.+?) \((\d+)\)$/)
      await db.insert(contactChildren).values({ contactId: c.id, tenantId, name: m ? m[1] : k, ageApprox: m ? Number(m[2]) : null })
    }
    if (p.team) await db.insert(contactSportsTeams).values({ contactId: c.id, tenantId, sport: /Chiefs|Cowboys|Packers|Vikings|Texans|Bears/.test(p.team) ? "football" : /Braves|Red Sox/.test(p.team) ? "baseball" : "basketball", teamName: p.team })
    n++
  }
  return n
}
