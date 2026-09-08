-- One send per (tenant, contact, occasion, day); the cron inserts the row first and
-- relies on this index to make retries and overlapping runs harmless.
create unique index if not exists scheduled_sends_once_per_day
  on scheduled_sends (tenant_id, contact_id, occasion_type, scheduled_date);

-- CAN-SPAM footer: the sender's physical address.
alter table tenants add column if not exists postal_address text;
