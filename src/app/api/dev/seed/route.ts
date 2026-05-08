import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  db, contacts, contactChildren, contactSportsTeams,
  scheduledSends,
} from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { getTenantId } from "@/lib/auth"

export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_ROUTES !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 403 })
  }

  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    // Idempotent — wipe existing test contact by email (cascade deletes children, teams, sends)
    await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.email, "alex.testfield@example.com"),
        )
      )

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    const [contact] = await db
      .insert(contacts)
      .values({
        tenantId,
        firstName: "Alex",
        lastName: "Testfield",
        nickname: "Al",
        email: "alex.testfield@example.com",
        phone: "(555) 867-5309",
        birthdate: "1981-05-08",
        birthdateYearUnknown: false,
        placeHometown: "Austin, TX",
        height: "6'1\"",
        weight: "185 lbs",
        spouseName: "Jordan Testfield",
        spouseOccupation: "Architect",
        spouseEducation: "M.Arch, UT Austin",
        spouseInterests: "Interior design, hiking",
        anniversary: "2008-06-14",
        highSchool: "McCallum High School",
        highSchoolGradYear: 1999,
        college: "University of Texas",
        collegeGradYear: 2003,
        collegeHonors: "Cum Laude",
        degrees: "B.S. Business Administration",
        collegeFraternity: "Sigma Chi",
        collegeSports: "Intramural basketball",
        collegeActivities: "Student government, debate",
        collegeSensitive: false,
        militaryService: "None",
        companyName: "Testfield Ventures LLC",
        companyAddress: "1234 Congress Ave",
        city: "Austin",
        state: "TX",
        zip: "78701",
        country: "US",
        businessPhone: "(512) 555-0192",
        jobTitle: "Managing Partner",
        previousEmployer1: "Dell Technologies",
        previousEmployer2: "Accenture",
        statusSymbols: "Tesla Model S, lake house",
        professionalAssociations: "Austin Chamber of Commerce",
        officesHeld: "Board Member, Austin Tech Council",
        businessObjectiveLongRange: "Build and exit a SaaS company by 2030",
        businessObjectiveImmediate: "Close Series A by Q3",
        greatestConcern: "Talent retention",
        presentOrFuture: "Future-oriented",
        clubs: "Austin Country Club, Rotary",
        politicallyActive: false,
        communityActive: "Big Brothers Big Sisters volunteer",
        religion: "Catholic",
        religionActive: true,
        sensitiveTopics: "Divorce (first marriage)",
        strongFeelings: "Strong on border policy",
        medicalHistory: "Knee surgery 2019, fully recovered",
        drinks: true,
        drinkType: "Scotch, IPA beer",
        smokes: false,
        favoriteLunchRestaurant: "Uchi",
        favoriteDinnerRestaurant: "Fogo de Chão",
        favoriteMenuItems: "Wagyu, old fashioned",
        hobbies: "Golf, woodworking, fly fishing",
        vacationHabits: "Annual ski trip to Telluride, Caribbean summer",
        carType: "Tesla Model S, '68 Mustang (weekend)",
        conversationalInterests: "Tech startups, UT football, fishing",
        adjectives: "Driven, generous, competitive",
        proudestAchievement: "Sold first company at 34",
        personalObjectiveLongRange: "Semi-retire by 55",
        personalObjectiveImmediate: "Spend more time with kids",
        moralConsiderations: "Highly ethical in business",
        customerObligations: "Expects follow-through; ghosting is a dealbreaker",
        requiresHabitChange: "Working on delegation — tends to micromanage",
        concernsAboutOpinion: false,
        selfCentered: false,
        highlyEthical: true,
        keyProblems: "Work-life balance, too many meetings",
        managementPriorities: "Growth, talent, culture",
        facebookUrl: "https://facebook.com/alex.testfield",
        linkedinUrl: "https://linkedin.com/in/alex-testfield",
        instagramUrl: "https://instagram.com/altestfield",
        internalNotes:
          "Met at Austin Chamber mixer March 2026. Refer to spouse as Jordan, not \"wife.\" Remembers everything — prep well.",
        tags: ["vip", "prospect", "golfer"],
        source: "manual",
        enrichmentScore: 82,
        status: "active",
      })
      .returning()

    await db.insert(contactChildren).values([
      {
        contactId: contact.id,
        tenantId,
        name: "Emma Testfield",
        birthdate: "2010-03-22",
        birthdateYearUnknown: false,
        school: "Westlake High School",
        interests: "Soccer, art",
      },
      {
        contactId: contact.id,
        tenantId,
        name: "Liam Testfield",
        birthdate: "2013-11-05",
        birthdateYearUnknown: false,
        school: "Hill Country Middle School",
        interests: "Minecraft, baseball",
      },
    ])

    await db.insert(contactSportsTeams).values({
      contactId: contact.id,
      tenantId,
      sport: "Football",
      teamName: "Dallas Cowboys",
      teamId: "dal",
      league: "NFL",
      level: "pro",
    })

    // Birthday card going out tomorrow — will show in "Coming Up" immediately
    await db.insert(scheduledSends).values({
      tenantId,
      contactId: contact.id,
      occasionType: "birthday",
      occasionLabel: "🎂 Birthday",
      scheduledDate: tomorrowStr,
      status: "pending",
      emailSubject: "Happy Birthday, Alex!",
    })

    return NextResponse.json({ success: true, contactId: contact.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
