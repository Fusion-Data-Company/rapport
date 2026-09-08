/**
 * Applies every drizzle/*.sql file, in filename order, before the app builds.
 *
 * The schema grew several columns that production never got, so a signup would
 * insert a tenant against columns that did not exist and the whole onboarding
 * step failed with a 500. Running this as part of the build means a deploy and
 * its database can never drift again, and a freshly provisioned buyer instance
 * comes up complete.
 *
 * Every statement is written to be idempotent (IF NOT EXISTS / OR REPLACE), and
 * each one is applied on its own so a single already-satisfied statement cannot
 * abort the rest. Applied files are recorded in _migrations so re-runs are cheap.
 */
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { neon } from "@neondatabase/serverless"

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, "..", "drizzle")

const url = process.env.DATABASE_URL
if (!url) {
  console.log("[migrate] DATABASE_URL not set, skipping (local build)")
  process.exit(0)
}

const sql = neon(url)

/** Split on semicolons that end a statement, ignoring those inside quotes or $$ blocks. */
function statements(text) {
  // Drop comment-only lines first: an apostrophe inside a comment ("don't")
  // otherwise looks like an opening quote and swallows the rest of the file.
  text = text
    .split("\n")
    .filter((l) => !/^\s*--/.test(l))
    .join("\n")
  const out = []
  let buf = ""
  let quote = null
  let dollar = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (dollar) {
      buf += c
      if (c === "$" && text[i - 1] === "$") dollar = false
      continue
    }
    if (quote) {
      buf += c
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"') { quote = c; buf += c; continue }
    if (c === "$" && text[i + 1] === "$") { dollar = true; buf += c; continue }
    if (c === ";") { if (buf.trim()) out.push(buf.trim()); buf = ""; continue }
    buf += c
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter((s) => !/^\s*--/.test(s) && s.replace(/--[^\n]*/g, "").trim().length > 0)
}

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS "_migrations" (
    "name" text PRIMARY KEY,
    "applied_at" timestamptz NOT NULL DEFAULT now()
  )`

  const done = new Set(
    (await sql`SELECT name FROM "_migrations"`).map((r) => r.name),
  )

  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
  let applied = 0

  for (const file of files) {
    if (done.has(file)) continue
    const body = readFileSync(join(dir, file), "utf8")
    let ok = 0
    let skipped = 0
    for (const stmt of statements(body)) {
      try {
        await sql.query(stmt)
        ok++
      } catch (e) {
        // Idempotent statements can still trip on "already exists" in older
        // Postgres paths; anything else is worth failing the build over.
        const msg = String(e?.message || e)
        if (/already exists|duplicate/i.test(msg)) { skipped++; continue }
        console.error(`[migrate] ${file} failed on:\n${stmt.slice(0, 200)}\n${msg}`)
        process.exit(1)
      }
    }
    await sql`INSERT INTO "_migrations" (name) VALUES (${file}) ON CONFLICT DO NOTHING`
    console.log(`[migrate] ${file}: ${ok} applied, ${skipped} already present`)
    applied++
  }

  console.log(applied ? `[migrate] ${applied} file(s) applied` : "[migrate] database already current")
}

main().catch((e) => {
  console.error("[migrate] failed", e)
  process.exit(1)
})
