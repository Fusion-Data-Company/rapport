# Getting data in and out of Rapport

Two doors. Contacts come in through one URL or a CSV; send events go out through
signed webhooks. Both are shaped so a Zapier zap can use them with no code step.

Everything below is per tenant and is set up under Settings, Integrations.

---

## Contacts in

`POST https://<your Rapport host>/api/inbound/<your token>`

The token is in Settings, Integrations. It is the only credential: treat the URL as
a secret, and press "New URL" if it leaks. There is no other authentication, which
is what makes it work as a Zapier or AMS webhook target.

**Body.** JSON, either one object or an array, or a plain form post. A wrapper of
`{"contacts": [...]}` or `{"data": [...]}` is unwrapped for you. At most 500 records
per request.

**Matching.** `external_id` first, then `email`. A record that matches updates the
existing contact; anything else creates one. A field you leave out is left alone, so
a partial export never blanks a filled field.

**Fields**

| Field | Notes |
|---|---|
| `first_name`, `last_name` | Or a single `name`, split on the first space |
| `email` | Where notes go. No address, no note |
| `external_id` | Your system's id. Send it and re-sends update instead of duplicating |
| `tier` | `A`, `B` or `C`. Defaults to `B` |
| `birthdate` | `2026-03-15`, `3/15/2026` and `March 15, 2026` all read |
| `anniversary` | Wedding anniversary |
| `policy_renewal_date`, `policy_type` | The renewal note fires ahead of this date |
| `loan_closed_date`, `loan_type` | Closing anniversaries and the months-since-close check-ins |
| `home_purchase_date` | Home anniversary |
| `custom_date`, `custom_date_label` | Any other date worth remembering, annual |
| `company`, `title`, `phone` | |
| `city`, `state`, `zip` | |
| `spouse_name`, `hometown`, `notes` | |
| `source` | Free text, shows on the contact |

**Response.** `{"ok":true,"created":N,"updated":N,"rejected":N}`. A record is rejected
when it has neither a usable name nor an email.

```bash
curl -X POST https://rapport.example.com/api/inbound/YOUR_TOKEN \
  -H 'Content-Type: application/json' \
  -d '[{"external_id":"HS-10421","first_name":"Dana","last_name":"Whitfield",
        "email":"dana@example.com","company":"Whitfield Roofing","tier":"A",
        "policy_renewal_date":"2026-11-04","policy_type":"Commercial auto"}]'
```

### From the named systems

- **HawkSoft.** Export the client list to CSV (Reports, Client List), then either drop
  it into Contacts, Import, or run it through a Zapier "New CSV row" trigger into a
  webhook action pointed at the inbound URL. Map the expiration or X-date column to
  `policy_renewal_date` and the line of business to `policy_type`.
- **EZLynx.** Applicant or policy export to CSV. `Effective Date` or `Expiration Date`
  maps to `policy_renewal_date`. Keep the EZLynx applicant id in `external_id` so the
  next export updates rather than duplicates.
- **Follow Up Boss.** Either the People CSV export, or a Follow Up Boss Zapier trigger
  ("New Contact", "Updated Contact") into a webhook action. Map the FUB person id to
  `external_id`. For loan officers, the closing date custom field maps to
  `loan_closed_date`; for agents, the anniversary field maps to `home_purchase_date`.

The CSV importer at Contacts, Import understands the same names plus the usual
spellings those systems export (`X Date`, `Expiration Date`, `Close Date`,
`Funded Date`, `LOB`), so a field map made once works for either route.

---

## Send events out

Add an endpoint under Settings, Integrations. It must be `https`. You choose which
events it receives; choosing none means all of them.

| Event | When |
|---|---|
| `note.sent` | A note went out |
| `note.held` | A note was written and is waiting for approval |
| `note.failed` | A note could not be sent |
| `note.skipped` | A note was dropped, for example the contact unsubscribed |

**Request.** `POST` with `Content-Type: application/json` and these headers:

```
X-Rapport-Event: note.sent
X-Rapport-Delivery: <uuid, unique per attempt>
X-Rapport-Signature: t=1789200000,v1=<hex>
```

**Body.** Flat, one level, no nesting to unwrap:

```json
{
  "event": "note.sent",
  "id": "6f1c...",
  "created_at": "2026-09-08T14:03:11.244Z",
  "tenant_id": "b2a9...",
  "business_name": "Bell Family Insurance",
  "contact_id": "1d40...",
  "contact_first_name": "Dana",
  "contact_last_name": "Whitfield",
  "contact_email": "dana@example.com",
  "contact_company": "Whitfield Roofing",
  "contact_tier": "A",
  "occasion": "policy_renewal",
  "occasion_label": "Commercial auto renews November 4",
  "subject": "Quick note before your renewal",
  "body": "Dana, your commercial auto comes up next month...",
  "scheduled_date": "2026-10-05",
  "sent_at": "2026-10-05T14:03:11.244Z",
  "error": null
}
```

**Verifying.** Take the `t` value and the raw request body, join them with a dot, and
compute `HMAC-SHA256(secret, "<t>.<raw body>")` as hex. Compare it to `v1` with a
constant-time comparison, and reject anything where `t` is more than five minutes old.
The secret is shown once, when you add the endpoint.

```js
const [t, v1] = header.split(",").map(p => p.split("=")[1])
const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")
const ok = crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"))
```

**Delivery.** One attempt, six second timeout, fired after the note is already
recorded as sent, so a slow or broken receiver can never turn a delivered note into a
failed one. There are no retries. Answer `2xx` quickly and do the work on your side.
After twenty failures in a row an endpoint stops being tried and says so in Settings;
resuming it clears the count.

### In Zapier

1. New Zap, trigger "Webhooks by Zapier", event "Catch Hook". Copy the URL Zapier gives you.
2. In Rapport, Settings, Integrations, add that URL as an endpoint.
3. Press "Send sample" on the endpoint. Zapier catches it and every field above appears
   as a mappable value.

Going the other way, use a "Webhooks by Zapier" POST action to the Rapport inbound URL
with the fields from the first table.
