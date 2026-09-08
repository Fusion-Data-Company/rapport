/**
 * Idempotent schema top-up.
 *
 * The deployment has no migration step in front of it, so every column this code
 * depends on is added here with `if not exists` and the whole thing runs once per
 * process, behind a flag. It is the runtime twin of the files in /drizzle: when you
 * add a column there, add it here too.
 */
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

let done: Promise<void> | null = null

async function run() {
  // 0002 - one send per (tenant, contact, occasion, day) and the CAN-SPAM address
  await db.execute(sql`
    create unique index if not exists scheduled_sends_once_per_day
      on scheduled_sends (tenant_id, contact_id, occasion_type, scheduled_date)
  `)
  await db.execute(sql`alter table tenants add column if not exists postal_address text`)

  // 0003 - OAuth mailbox and deliverability guardrails
  await db.execute(sql`
    alter table tenant_email_config
      add column if not exists oauth_email text,
      add column if not exists oauth_refresh_token_encrypted text,
      add column if not exists oauth_scope text,
      add column if not exists oauth_connected_at timestamptz,
      add column if not exists daily_cap integer not null default 40,
      add column if not exists warmup_started_at timestamptz,
      add column if not exists body_style text not null default 'plain',
      add column if not exists spf_status text,
      add column if not exists dkim_status text,
      add column if not exists dmarc_status text,
      add column if not exists dns_detail jsonb,
      add column if not exists dns_checked_at timestamptz
  `)
}

/** Runs the top-up once per process. Safe to await from any request path. */
export function ensureSchema(): Promise<void> {
  if (!done) {
    done = run().catch((e) => {
      done = null // a transient failure should not poison the process
      throw e
    })
  }
  return done
}
