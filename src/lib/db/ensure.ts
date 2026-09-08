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
  // 0004 - the money dates
  await db.execute(sql`
    alter table tenants
      add column if not exists renewal_lead_days integer not null default 30,
      add column if not exists milestone_months integer[],
      add column if not exists always_review boolean not null default true
  `)
  await db.execute(sql`
    alter table contacts
      add column if not exists policy_renewal_date date,
      add column if not exists policy_type text,
      add column if not exists loan_closed_date date,
      add column if not exists loan_type text,
      add column if not exists home_purchase_date date
  `)
  await db.execute(sql`
    create table if not exists contact_dates (
      id uuid primary key default gen_random_uuid(),
      contact_id uuid not null references contacts(id) on delete cascade,
      tenant_id uuid not null references tenants(id) on delete cascade,
      label text not null,
      date date not null,
      recurrence text not null default 'annual',
      notes text,
      is_active boolean not null default true,
      created_at timestamp not null default now()
    )
  `)
  await db.execute(sql`create index if not exists contact_dates_contact_idx on contact_dates (contact_id)`)
  await db.execute(sql`create index if not exists contact_dates_tenant_idx on contact_dates (tenant_id)`)
  await db.execute(sql`create index if not exists contacts_policy_renewal_idx on contacts (tenant_id, policy_renewal_date)`)
  await db.execute(sql`create index if not exists contacts_loan_closed_idx on contacts (tenant_id, loan_closed_date)`)
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
