# Rapport: what is sold, to whom, and for how much

Written 2026-09-08, from the September comps.

---

## 1. The position

**The $39 version of the $349 tool, for the agent who will never buy the $349 tool.**

The category leader proved the exact mechanic Rapport uses - a plain personal email
from the agent's own inbox, fired by tag-driven dates - and sells it at roughly ten
times this price with a human success specialist attached and an annual contract.
Capterra lists it at $349 a month flat; the other insurance-native option is
quote-only. Below that there is a cliff: a full realtor CRM at about $49 a month whose
birthday touch is a generic drip, a card-mailing service at $1.25 to $3 a card, and a
spreadsheet.

The agent under about 1,000 contacts is priced out of the top and underserved at the
bottom. That gap is the whole business.

What makes it defensible at $39 is not the birthday note - anyone can send those. It is
that the money dates are first-class (renewal, closing anniversary, months since close),
that the note is drafted from what actually happened with that person rather than a
profile form, and that it goes out of the agent's own Gmail or Microsoft 365 mailbox on
a send-only OAuth grant, so it reaches the inbox and reads like they wrote it.

## 2. The buyer

In order:

1. **Independent P&C and life agents**, one to three people, 300 to 2,000 clients. They
   have a renewal date on every policy and no assistant whose job it is to watch them.
   They find tools on insurance-forums.com, in carrier and cluster newsletters, and on
   Capterra. They already believe in the touch - many of them are buying stamps - so the
   sale is not "should you stay in touch", it is "here is that, without your evening".
2. **Solo loan officers.** Same shape, different date: the closing anniversary and the
   months-since-close check-in. Smaller population, higher deal value per client, and a
   CRM market ($99 to $249 a month) that has priced them the same way.
3. **Realtors working alongside those two.** Not targeted, will arrive anyway, welcome.

Explicitly not targeted: agencies with staff, recruiters, account managers, anyone who
wants a CRM. Selling to all of them is what made the old page say nothing.

## 3. The model: self-serve hosted seats

No one in this category sells a licence, and nobody one-operator-sized can sell the
specialist-led model. So: monthly, self-serve, card at signup, no call.

| Plan | Contacts | Price | Stripe |
|---|---|---|---|
| Trial | 500 | Free, 14 days, no card | none |
| **Solo** | **1,000** | **$39 / month** | 1 seat |
| **Book** | **5,000** | **$79 / month** | 2 seats |

Billing stays one Stripe price with a seat quantity; the plan is read off the seat
count, so nothing in Stripe had to change to ship the ladder.

**The contact figures are soft.** Going over never refuses a contact, never fails an
import, and never stops a send. It shows the count, the allowance and the next step.
A cap that locks a paying customer out of their own book is how a tool gets cancelled
in month three, and the old 250-per-seat cap was exactly that.

### Why not $29

$29 with a 250-contact cap undercut a full CRM at $49 while offering a fraction of one,
and the cap made the product look like a trap. The number was wrong in both directions.
$39 sits above the impulse line, below the "I need to think about this" line, and leaves
room for the second rung.

### Why $79 for the second rung

Not because 5,000 contacts costs more to serve - it barely does - but because that
buyer has a book worth defending and will carry the two channels that cost real money
(texting, mailed cards) when they ship. The rung exists so a growing book has somewhere
to go that is not "call us".

### Unit economics, per seat per month

| | |
|---|---|
| Revenue | $39.00 |
| Stripe | ~$1.43 |
| LLM (about 40 notes a month, small model, ~700 tokens each) | under $0.05 |
| Hosting and database, marginal | under $0.50 |
| Mail | $0, it leaves the customer's own mailbox |
| **Gross margin** | **~95%** |

Mail costing nothing is the structural advantage over every card and postcard vendor in
the comps, all of whom carry a per-piece cost of $0.64 to $3.75 that never goes away.

### What has to be true

- Churn under 4% a month. The risk is month three, when the novelty is gone: the money
  dates are the answer, because a renewal touch has a consequence a birthday does not.
- Support under 10 minutes per customer per month. No onboarding call, ever. The
  product has to be finishable in an evening by someone who has never used it.
- Deliverability holds. This is the single point of failure: it is the customer's own
  domain reputation, which is why the daily cap, the warm-up ramp, plain-text bodies
  and the SPF/DKIM/DMARC check exist before any growth feature does.

### Not the model

- **Per-seat expansion.** One agent, one mailbox. Seats are a billing mechanism here,
  not a growth story.
- **Agency plans.** The moment a plan needs roles, permissions and a shared inbox it
  needs a support person, and there isn't one.
- **A one-time licence.** Nobody in the category sells one, and the value is the daily
  run, not the software.

---

## 4. Texting (10DLC) - designed, not built

Nothing in the repo talks to a carrier or an SMS vendor, and nothing should until the
Book plan has customers on it. This is the design.

### Why it belongs on the Book plan and not on Solo

The forums say the same thing in two voices: agents start with cards, and as the book
grows they drift to texts because cards became too much work. Texting is what a 5,000
contact book uses. It is also the only feature here with a real per-message cost and a
registration process the customer must personally complete, which makes it a natural
second-rung feature rather than a $39 one.

### The shape

**Registration is the product, not the plumbing.** A2P 10DLC requires a registered brand
and a registered campaign before a single message moves. That is an EIN, a legal business
name, a website with a visible privacy policy, sample message copy, and a description of
how consent was obtained. It takes days, it gets rejected for vague answers, and it is
where a solo agent gives up. So the feature ships as a guided registration:

1. A form that collects brand details (legal name, EIN, address, website, contact) and
   validates them against the shapes that actually get approved.
2. Pre-written campaign copy for this exact use case - low-volume mixed, conversational,
   customer-care - with sample messages generated from the agent's own occasions, since
   generic samples are the common rejection reason.
3. A consent-capture story the agent can honestly attest to: a checkbox and wording for
   their own quote form, an import attestation for existing clients, and a stored record
   of which of the two each contact came in under. No attestation, no texting to that
   contact.
4. Status tracking with the rejection reason in plain words and a one-click resubmit.

**Consent, stored per contact, not per tenant.** New columns: `sms_consent` (`none`,
`implied`, `express`), `sms_consent_source` (free text: "quote form 2026-03-14",
"imported, existing client"), `sms_consent_at`. A contact with `none` never receives a
message, whatever the tenant's settings say. STOP, START and HELP are handled before any
application logic and STOP writes `none` back to the contact and unsubscribes them from
email too, because a person who says stop means stop.

**Quiet hours and frequency, enforced server-side.** No message before 8am or after 9pm
in the contact's own timezone (derived from area code, overridable). One SMS per contact
per 30 days, hard, regardless of how many occasions land. The daily cap and the tier gap
apply to SMS exactly as they apply to email.

**Which occasions text.** Not all of them. Birthdays and the renewal reminder read fine
as a text; a months-since-close check-in reads as a sales call. The tenant picks per
occasion type, default: birthday and policy renewal on, everything else off.

**The queue is the same queue.** A text is a row in `scheduled_sends` with
`channel = "sms"`, it appears in the same morning approval list, and it is approved,
edited or skipped the same way. One review, both channels.

**Where it plugs in.** `src/lib/mailer.ts` already hides how mail moves behind a
`MailDriver` interface; SMS gets the same treatment - a `MessageDriver` resolved per
tenant, with `deliver.ts` choosing by channel. No page and no cron learns a vendor name.

**Cost.** Roughly $0.008 a segment plus about $2 a month in carrier fees per campaign,
against a $40 gap between the plans. At one text per contact per month on a 2,000
contact book that is about $16, which is why the frequency cap is a hard rule and not a
preference.

**What it is not.** Not two-way. Not a conversation inbox. Replies go to the agent's own
phone number or a forwarded number and Rapport does not read them. The moment it becomes
an inbox it needs a support person.

---

## 5. Mailed cards - designed, not built

Physical mail is the premium tier of this category and the one thing agents say clients
keep and show people. It is also the one thing that turns a software margin into a
fulfilment margin, so it ships as a pass-through, not a product line.

### The shape

**Pass-through, at cost plus a flat handling fee.** A print-and-mail partner charges
roughly $0.64 to $1.35 a piece at volume for a card or letter with postage. Rapport bills
that through at cost plus a fixed handling fee per piece, shown before anything is sent.
Never marked up as a percentage: the moment the margin is in the postage, the incentive
is to send more mail than the relationship warrants.

**Prepaid credit, not a surprise invoice.** The agent buys a block of card credit; a card
is only queued when there is credit. Running out pauses the card channel and leaves email
running, and says so on the schedule. Nobody gets a bill they did not expect.

**Which occasions get a card.** Per occasion type, per tier, chosen by the agent. The
sensible default, and the one the onboarding suggests: tier A only, birthdays and the
loan or home anniversary. That is roughly 40 cards a year for a 20-person inner circle,
about $60, and it is the version an agent will actually keep paying for.

**Address is the hard part, not printing.** A card needs a verified postal address, and
half an imported book will not have one. So: an address completeness column on the
contacts table, a filter for "tier A, no address", and an import that maps the address
columns the AMS exports. A card occasion for a contact with no address degrades to email
and says why on the card in the queue, rather than failing silently.

**Lead time changes the schedule.** Print and mail takes five to seven days. A card for a
renewal 30 days out has to be queued at day 37, which means the occasion engine gains a
per-channel lead time and the approval queue shows cards a week before it shows the
emails for the same date. This is the single largest piece of work in the feature and the
reason it is designed rather than half-built.

**The note is the same note.** Same writer, same interaction history, same approval queue,
one extra step: a card front chosen from the existing card gallery. What is printed
inside is what was approved.

**Where it plugs in.** A `CardDriver` beside `MailDriver`, resolved per tenant, with the
vendor's own template and address model behind it. `scheduled_sends.channel = "card"`,
plus `card_cost_cents` and `card_status` for the fulfilment lifecycle.

**Why not now.** Three reasons, in order: it needs a vendor account and a real payment
relationship; the address data problem is a product problem and not a small one; and the
lead-time change touches the occasion engine, which is the piece everything else now
depends on. Email deliverability and the approval loop have to be boring and reliable
first, because a card that arrives late is a disappointment and an email that lands in
spam is a refund.

---

## 6. The order the money arrives in

1. **Now.** $39 Solo, self-serve, email only, on the money dates. This is a complete
   product and it is what the comps say is missing at this price.
2. **Next.** The Book rung at $79 with texting, once there are Solo customers asking for
   it by name. Not before: 10DLC registration support is a real support load and it
   should be carried by revenue that already exists.
3. **After that.** Cards as prepaid pass-through credit, tier A by default.
4. **Never, unless the whole thesis changes.** Agency plans, a shared inbox, two-way
   messaging, quoting. Each of those turns a one-operator business into a staffed one.
