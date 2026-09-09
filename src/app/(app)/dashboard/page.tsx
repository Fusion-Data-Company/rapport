"use client"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  Mail, Users, TrendingUp, CalendarClock, CheckCircle2, Inbox, Upload,
  ArrowRight, Sparkles, ShieldCheck, MailCheck, AlertTriangle,
} from "lucide-react"
import { Counter, Reveal, StatusChip } from "@/elite/motion"
import type { Status } from "@/elite/motion"
import { cardThumbFor, cardFor } from "@/lib/occasion-card"
import type { ScheduleItem } from "@/app/api/schedule/upcoming/route"
import type { BookHealth, RecentSend } from "@/app/api/dashboard/route"

/* ═══════════════════════════════════════════════════════════════════════════
   The dashboard is the page that has to prove the product.
   Four flat tiles and two empty panels proved nothing. What an agent needs to
   see on opening it, in this order: what is going out today and what the card
   looks like, what is coming, whether the book is in a state to be worked, and
   what actually left the mailbox. Every figure is tabular and counts up; every
   panel that can be empty has a designed empty state with the next action in it.
   ═══════════════════════════════════════════════════════════════════════════ */

const OCCASION_TONE: Record<string, Status> = {
  policy_renewal: "warn",
  loan_anniversary: "info",
  home_anniversary: "info",
  months_since_close: "warn",
  review_request: "info",
  birthday: "ok",
  child_birthday: "ok",
  anniversary: "ok",
}

const SEND_TONE: Record<string, Status> = {
  sent: "ok", approved: "ok", pending_approval: "warn", pending: "warn",
  deferred: "idle", skipped: "idle", projected: "idle", failed: "bad",
}

const SEND_WORD: Record<string, string> = {
  sent: "Sent", approved: "Approved", pending_approval: "Waiting on you",
  pending: "Waiting on you", deferred: "Held", skipped: "Skipped",
  projected: "Scheduled", failed: "Failed",
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const initials = (a?: string | null, b?: string | null) =>
  `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "??"

function Tile({ label, value, suffix, sub, tone = "accent", icon: Icon }: {
  label: string; value: number; suffix?: string; sub: string
  tone?: "accent" | "trim" | "info" | "ok"; icon: React.ElementType
}) {
  const ink = tone === "trim" ? "var(--gold)" : tone === "info" ? "var(--sky)"
    : tone === "ok" ? "var(--elite-ok)" : "var(--teal-light)"
  return (
    <div className="stat-card-trim glossy-top rp-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-2" style={{ color: ink }}>
            <Counter to={value} />{suffix}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.7]" style={{ color: "var(--text-muted)" }}>{sub}</p>
        </div>
        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
          style={{ background: `color-mix(in srgb, ${ink} 16%, transparent)`, color: ink }}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
    </div>
  )
}

/** A note in the queue, with the card that goes out beside it. */
function QueueRow({ item }: { item: ScheduleItem }) {
  const tone = OCCASION_TONE[item.occasionType] ?? "idle"
  const line = (item.emailBodyText ?? "").split("\n").filter(Boolean).slice(0, 2).join(" ")
  return (
    <article className="rp-queue-row hover-lift">
      <img
        src={cardThumbFor(item.occasionType, item.cardImageUrl)}
        alt={item.cardLine}
        loading="lazy"
        className="rp-queue-card"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rp-avatar">{initials(item.contactFirstName, item.contactLastName)}</span>
          <p className="text-[15px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
            {item.contactFirstName} {item.contactLastName}
          </p>
          <StatusChip status={tone}>{item.occasionLabel}</StatusChip>
          <StatusChip status={SEND_TONE[item.status] ?? "idle"} live={item.status === "pending_approval"}>
            {SEND_WORD[item.status] ?? item.status}
          </StatusChip>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.65] rp-clamp-2" style={{ color: "var(--text-secondary)" }}>
          {item.emailSubject ? <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.emailSubject} · </span> : null}
          {line || `The card reads "${item.cardLine}". Rapport writes the note the morning it goes.`}
        </p>
        <p className="mt-1 text-[11px] font-mono tracking-wide" style={{ color: "var(--text-faint)" }}>
          {item.contactEmail ?? "no email on file"}
        </p>
      </div>
      <Link href="/schedule" className="rp-queue-go" aria-label={`Open ${item.contactFirstName ?? "this note"} in today's queue`}>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </article>
  )
}

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/analytics/stats").then(r => r.json()),
  })
  const { data: upcoming = [], isLoading: loadingSchedule } = useQuery<ScheduleItem[]>({
    queryKey: ["upcoming"],
    queryFn: () => fetch("/api/schedule/upcoming").then(r => r.json()),
  })
  const { data: dash } = useQuery<{ book: BookHealth; recent: RecentSend[] }>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then(r => r.json()),
  })

  const s = stats ?? {}
  const book = dash?.book
  const recent = dash?.recent ?? []

  const today = iso(new Date())
  const weekEnd = iso(new Date(Date.now() + 7 * 864e5))
  const list = Array.isArray(upcoming) ? upcoming : []
  const todays = list.filter(i => i.scheduledDate <= today)
  const thisWeek = list.filter(i => i.scheduledDate > today && i.scheduledDate <= weekEnd)
  const later = list.filter(i => i.scheduledDate > weekEnd)
  const waiting = todays.filter(i => i.status === "pending_approval" || i.status === "pending").length
  const nextUp = thisWeek[0] ?? later[0]

  const dateLine = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="rp-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Reveal>
        <header className="rp-head">
          <div>
            <p className="stat-label">{dateLine}</p>
            <h1 className="rp-h1 mt-1.5">
              {waiting > 0
                ? <>There {waiting === 1 ? "is" : "are"} <span className="rp-h1-accent">{waiting}</span> waiting for you</>
                : todays.length > 0
                  ? <>Today&apos;s notes are <span className="rp-h1-accent">ready</span></>
                  : <>The book is <span className="rp-h1-accent">quiet</span> today</>}
            </h1>
            <p className="mt-2 text-[15px] leading-[1.6] max-w-[62ch]" style={{ color: "var(--text-secondary)" }}>
              {todays.length > 0
                ? "Read them, change the line that is not how you would put it, and tap approve. Approving sends straight away."
                : nextUp
                  ? `Nothing due until ${new Date(nextUp.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, when ${nextUp.contactFirstName}'s ${nextUp.occasionLabel.toLowerCase()} comes up.`
                  : "No occasion is due in the next thirty days. Load a book with renewal and closing dates in it and the queue fills itself."}
            </p>
          </div>
          <Link href="/schedule" className="btn-primary shrink-0">
            Open today&apos;s queue <ArrowRight className="w-4 h-4" />
          </Link>
        </header>
      </Reveal>

      {/* ── Figures ────────────────────────────────────────────────────── */}
      <Reveal delay={60}>
        <section className="rp-tiles">
          <Tile label="Due today" value={todays.length} sub={waiting > 0 ? `${waiting} waiting on your approval` : "all approved or already gone"} icon={CalendarClock} />
          <Tile label="Next seven days" value={thisWeek.length} sub={`${later.length} more inside thirty days`} tone="trim" icon={Sparkles} />
          <Tile label="Sent this month" value={Number(s.sentThisMonth ?? 0)} sub="notes that left your own mailbox" tone="info" icon={Mail} />
          <Tile label="Opened" value={Number(s.openRate ?? 0)} suffix="%" sub="against a 21% industry average" tone="ok" icon={TrendingUp} />
        </section>
      </Reveal>

      {/* ── Queue + the book ───────────────────────────────────────────── */}
      <div className="rp-cols">
        <Reveal delay={90} className="min-w-0">
          <section className="rp-panel inner-ring">
            <div className="rp-panel-head">
              <span className="rp-live" aria-hidden />
              <h2 className="rp-panel-title">Going out today</h2>
              <span className="ml-auto text-[12px] font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>
                {todays.length} {todays.length === 1 ? "note" : "notes"}
              </span>
            </div>

            {loadingSchedule ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="skeleton rp-skel" />)}
              </div>
            ) : todays.length === 0 ? (
              <div className="elite-empty">
                <span className="elite-empty__mark">
                  {book && book.active === 0 ? <Upload className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </span>
                <p className="elite-empty__title">
                  {book && book.active === 0
                    ? "There is no book here yet"
                    : nextUp ? "Nothing is due today" : "No dates to watch yet"}
                </p>
                <p className="elite-empty__body">
                  {book && book.active === 0
                    ? "Rapport works off a CSV out of HawkSoft, EZLynx, Follow Up Boss or a spreadsheet. It reads the renewal, closing and purchase columns under the names those systems actually export."
                    : nextUp
                      ? `The next one is ${nextUp.contactFirstName} ${nextUp.contactLastName ?? ""} on ${new Date(nextUp.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${nextUp.occasionLabel.toLowerCase()}. Nothing for you to do until then.`
                      : "Your contacts have no birthdays, renewals or closing dates on them, so there is nothing for the scheduler to raise. Add a date to one contact and it will appear here."}
                </p>
                <Link href={book && book.active === 0 ? "/contacts/import" : "/contacts"} className="btn-primary mt-1">
                  {book && book.active === 0 ? "Import your book" : "Open contacts"} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="rp-queue">
                {todays.slice(0, 6).map(item => (
                  <QueueRow key={item.id ?? `${item.contactId}-${item.occasionType}-${item.scheduledDate}`} item={item} />
                ))}
                {todays.length > 6 && (
                  <Link href="/schedule" className="rp-more">
                    {todays.length - 6} more today <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}
          </section>
        </Reveal>

        <div className="rp-side">
          {/* Book health */}
          <Reveal delay={120}>
            <section className="rp-panel">
              <div className="rp-panel-head">
                <ShieldCheck className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <h2 className="rp-panel-title">The book&apos;s health</h2>
              </div>
              <div className="p-5">
                <div className="flex items-baseline gap-2">
                  <span className="stat-value" style={{ fontSize: 34, color: "var(--gold)" }}>
                    <Counter to={book?.coverage ?? 0} />%
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>workable</span>
                </div>
                <div className="rp-meter" role="img"
                  aria-label={`${book?.coverage ?? 0} percent of the book has both an address and a date`}>
                  <span style={{ width: `${book?.coverage ?? 0}%` }} />
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.65]" style={{ color: "var(--text-secondary)" }}>
                  {book?.reachable ?? 0} of {book?.active ?? 0} contacts have both an address Rapport can send to
                  and a date it can watch. The rest are dark.
                </p>

                <dl className="rp-facts">
                  <div><dt>Money dates</dt><dd className="num">{book?.withMoneyDate ?? 0}</dd></div>
                  <div><dt>Any date</dt><dd className="num">{book?.withAnyDate ?? 0}</dd></div>
                  <div><dt>With an email</dt><dd className="num">{book?.withEmail ?? 0}</dd></div>
                  <div><dt>Unsubscribed</dt><dd className="num">{book?.unsubscribed ?? 0}</dd></div>
                </dl>

                <div className="rp-tiers">
                  <span className="chip chip-ok">A · {book?.tierA ?? 0}</span>
                  <span className="chip chip-info">B · {book?.tierB ?? 0}</span>
                  <span className="chip chip-idle">C · {book?.tierC ?? 0}</span>
                </div>

                {book && book.active > 0 && book.coverage < 100 && (
                  <p className="rp-nudge">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--gold)" }} />
                    <span>
                      {book.active - book.reachable} contact{book.active - book.reachable === 1 ? " is" : "s are"} missing
                      an address or a date. <Link href="/contacts">Fix them in the table</Link>.
                    </span>
                  </p>
                )}
              </div>
            </section>
          </Reveal>

          {/* Coming up */}
          <Reveal delay={150}>
            <section className="rp-panel">
              <div className="rp-panel-head">
                <CalendarClock className="w-4 h-4" style={{ color: "var(--teal-light)" }} />
                <h2 className="rp-panel-title">This week</h2>
                <span className="ml-auto text-[12px] font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {thisWeek.length}
                </span>
              </div>
              {thisWeek.length === 0 ? (
                <div className="elite-empty" style={{ padding: "34px 20px" }}>
                  <span className="elite-empty__mark"><Inbox className="w-5 h-5" /></span>
                  <p className="elite-empty__title" style={{ fontSize: 15 }}>Clear until next week</p>
                  <p className="elite-empty__body" style={{ fontSize: 13 }}>
                    {later.length > 0
                      ? `${later.length} occasions sit further out inside the thirty-day window.`
                      : "Add renewal and closing dates to your contacts and this fills itself."}
                  </p>
                </div>
              ) : (
                <ul className="rp-week">
                  {thisWeek.slice(0, 7).map(item => (
                    <li key={item.id ?? `${item.contactId}-${item.occasionType}-${item.scheduledDate}`}>
                      <span className="rp-daychip">
                        <b>{new Date(item.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}</b>
                        <i>{new Date(item.scheduledDate + "T12:00:00").getDate()}</i>
                      </span>
                      <img src={cardThumbFor(item.occasionType, item.cardImageUrl)} alt="" loading="lazy" className="rp-week-card" />
                      <span className="min-w-0">
                        <span className="rp-week-name">{item.contactFirstName} {item.contactLastName}</span>
                        <span className="rp-week-why">{item.occasionLabel}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Reveal>
        </div>
      </div>

      {/* ── What actually went ─────────────────────────────────────────── */}
      <Reveal delay={80}>
        <section className="rp-panel">
          <div className="rp-panel-head">
            <MailCheck className="w-4 h-4" style={{ color: "var(--elite-ok)" }} />
            <h2 className="rp-panel-title">Recently sent</h2>
            <Link href="/schedule" className="ml-auto text-[12px]" style={{ color: "var(--teal-light)" }}>The send log</Link>
          </div>
          {recent.length === 0 ? (
            <div className="elite-empty">
              <span className="elite-empty__mark"><Users className="w-5 h-5" /></span>
              <p className="elite-empty__title">Nothing has gone out yet</p>
              <p className="elite-empty__body">
                Rapport holds your first batch until you have read it. Connect the mailbox you send
                from and the first approved note lands in your own Sent folder like anything else you send.
              </p>
              <Link href="/settings/email" className="btn-primary mt-1">Connect your mailbox <ArrowRight className="w-4 h-4" /></Link>
            </div>
          ) : (
            <div className="rp-sent">
              {recent.map(r => (
                <figure key={r.id} className="rp-sent-card hover-lift">
                  <img src={cardFor(r.occasionType, r.cardImageUrl)} alt={`The card sent to ${r.name}`} loading="lazy" />
                  <figcaption>
                    <span className="rp-sent-name">{r.name}</span>
                    <span className="rp-sent-why">{r.occasionLabel}</span>
                    <span className="rp-sent-meta">
                      <StatusChip status={r.opened ? "ok" : "idle"}>{r.opened ? "Opened" : "Delivered"}</StatusChip>
                      <time dateTime={r.sentAt ?? undefined}>
                        {r.sentAt ? new Date(r.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </time>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </div>
  )
}
