import Link from "next/link"
import {
  Heart, ArrowRight, CheckCircle, Mail, CalendarClock, Upload, ShieldCheck, Check,
  Pencil, X as XIcon, Gauge, Star, Plug,
} from "lucide-react"
import { Reveal, Counter, Pinned, Marquee, Grain } from "@/elite/motion"

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

const css = `
.rp{--teal:#2BA8A2;--teal2:#1E8C86;--teal3:#3CC4BD;--gold:#FFD23F;--ink:#F1F5F9;--dim:#C3D2E2;--card:rgba(15,28,48,.88);--line:rgba(43,168,162,.14);background:#09111F;color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.rp .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.rp h1,.rp h2{font-family:'Playfair Display',Georgia,serif;font-weight:800;letter-spacing:-.01em}
.rp h2{font-size:clamp(1.7rem,3.4vw,2.4rem);margin:0 0 14px}
.rp h3{font-family:'Playfair Display',Georgia,serif}
.rp .sub{color:var(--dim);font-size:17px;line-height:1.65;max-width:62ch}
.rp .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:999px;font-weight:700;text-decoration:none;font-size:15px}
.rp .btn.p{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;box-shadow:0 8px 32px rgba(43,168,162,.35)}
.rp .btn.g{border:1px solid rgba(43,168,162,.3);color:var(--dim)}
.rp .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:26px}
.rp .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.rp .grid2{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center}
.rp .sec{padding:72px 0}
.rp .kick{display:inline-block;padding:5px 14px;border-radius:999px;border:1px solid rgba(43,168,162,.3);background:rgba(43,168,162,.08);color:var(--teal3);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
.rp .pain{border-left:3px solid #EF6C4A;padding:14px 18px;background:rgba(239,108,74,.06);border-radius:0 12px 12px 0;color:var(--ink);font-size:15px;line-height:1.6}
.rp .row{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:rgba(9,17,31,.7);border:1px solid var(--line);margin-bottom:10px}
.rp .row .when{font-size:11px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rp .row .to{font-weight:700;font-size:14px;color:#fff}
.rp .row .why{font-size:13px;color:var(--dim);line-height:1.5}
.rp .shot{background:rgba(9,17,31,.86);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.rp .shot .bar{display:flex;align-items:center;gap:6px;padding:9px 14px;border-bottom:1px solid var(--line);background:rgba(15,28,48,.9)}
.rp .shot .dot{width:9px;height:9px;border-radius:50%}
.rp .shot .body{padding:16px}
.rp .note{font-family:Georgia,serif;font-size:14.5px;line-height:1.7;color:#e2e8f0;white-space:pre-line}
.rp .chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--dim)}
.rp .heroshot{margin:0;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:var(--card);box-shadow:0 24px 70px rgba(0,0,0,.5)}
.rp .heroshot img{display:block;width:100%;height:auto}
.rp .heroshot figcaption{padding:14px 20px;font-size:13.5px;color:var(--dim);border-top:1px solid var(--line);font-family:Georgia,serif;font-style:italic}
.rp .flowshot{margin:22px 0 6px;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#0a1420}
.rp .flowshot img{display:block;width:100%;height:auto}
.rp .step b{display:block;font-size:26px;color:var(--teal3);font-family:'Playfair Display',serif;margin-bottom:6px}
.rp .faq p{color:var(--dim);font-size:14px;line-height:1.6;margin:4px 0 0}
.rp .faq h4{margin:0;font-size:15px;color:#fff}
.rp table.cmp{width:100%;border-collapse:collapse;font-size:14px}
.rp table.cmp th,.rp table.cmp td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);color:var(--dim)}
.rp table.cmp th{color:#fff;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.rp table.cmp td:first-child{color:var(--ink);font-weight:600}
@media(max-width:860px){.rp .grid3{grid-template-columns:1fr}.rp .grid2{grid-template-columns:1fr}.rp .sec{padding:52px 0}}

/* ── The card set: the artefact, and the whole of the argument ───────────────
   A greeting card is portrait and is NEVER cropped. object-fit:cover on a 3:2
   tile cut the printed name off the bottom of every one of them, which is the
   one thing on this page a buyer is here to see. */
.rp .cardset{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.rp .cardset figure{margin:0;border-radius:14px;overflow:hidden;background:rgba(9,17,31,.7);border:1px solid var(--line);transition:transform 420ms cubic-bezier(.22,1,.36,1),border-color 420ms,box-shadow 420ms}
.rp .cardset figure:hover{transform:translateY(-4px);border-color:rgba(43,168,162,.45);box-shadow:0 26px 48px -24px rgba(0,0,0,.85)}
.rp .cardset img{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;background:#fff}
.rp .cardset figcaption{padding:11px 13px}
.rp .cardset .line{display:block;font-family:Georgia,serif;font-style:italic;font-size:13.5px;color:#fff;line-height:1.4}
.rp .cardset .occ{display:block;margin-top:4px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#9BB0C6}
@media(max-width:860px){.rp .cardset{grid-template-columns:repeat(2,1fr)}}

/* ── The numbers band ──────────────────────────────────────────────────────── */
.rp .numbers{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.rp .numbers .n{padding:22px 20px;border-radius:16px;background:rgba(15,28,48,.7);border:1px solid var(--line)}
.rp .numbers .fig{font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;font-size:clamp(28px,4vw,42px);line-height:1.05;font-weight:700;color:var(--teal3)}
.rp .numbers .fig.gold{color:var(--gold)}
.rp .numbers .cap{margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--dim)}
@media(max-width:860px){.rp .numbers{grid-template-columns:repeat(2,1fr)}}

/* ── The occasion belt ─────────────────────────────────────────────────────── */
.rp .belt{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0;background:rgba(9,17,31,.6)}
.rp .belt span{display:inline-flex;align-items:center;gap:10px;padding:0 22px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9BB0C6;white-space:nowrap}
.rp .belt b{color:var(--gold);font-weight:700}
`

const DUE_TODAY = [
  {
    when: "Policy renewal · in 30 days",
    to: "Dana Whitfield, Whitfield Roofing",
    why: "Her commercial auto renews November 4. The note goes out a month early, while it is still a conversation and not a bill.",
  },
  {
    when: "3 years since closing",
    to: "Luis Ortega, Ortega & Sons Plumbing",
    why: "Three years to the day since Luis closed. No rate talk, no pitch, just the date remembered.",
  },
  {
    when: "6 months since close",
    to: "Hannah Fitzgerald, Fitzgerald CPA",
    why: "The check-in that keeps a closed file warm, and the one nobody ever gets round to.",
  },
  {
    when: "Kid's birthday · Saturday",
    to: "Tom Becker, Becker Auto Body",
    why: "Ava turns nine. Two lines to Tom, in his voice, before his first coffee.",
  },
]

/* The eight cards Rapport actually sends, and the line each one prints. The
   name in the artwork is set at send time; these are the real files out of
   public/img/cards, not mockups. A buyer should be able to see the product
   before signing up, because the card IS the product. */
const CARD_SET = [
  ["policy-renewal",     "Here's to Another Year, Rob",     "Policy renewal"],
  ["loan-anniversary",   "Happy Closing Anniversary, Rob",  "Loan anniversary"],
  ["home-anniversary",   "Happy Home Anniversary, Rob",     "Home anniversary"],
  ["months-since-close", "Good to Know You, Rob",           "Months since close"],
  ["birthday",           "Happy Birthday, Rob",             "Birthday"],
  ["child-birthday",     "Happy Birthday, Maddie",          "A child's birthday"],
  ["anniversary",        "Happy Anniversary, Rob",          "Wedding anniversary"],
  ["review-request",     "Thank You, Rob",                  "Review request"],
] as const

const SAMPLE_NOTE = `Dana,

Your commercial auto comes up on the 4th of November. Nothing to do yet, but I have it on my calendar and I will pull the numbers a week out so we can look at it together.

Hope the Chiefs give you a quiet Sunday for once.`

export default function HomePage() {
  return (
    <div className="rp">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* Inline-SVG noise, no network request, pointer-events:none, and skipped
          entirely on saveData — grain is the definition of a nice-to-have and
          it is a full-viewport composited layer. */}
      <Grain grain dust />

      {/* Nav */}
      <nav className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1E8C86,#2BA8A2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color="white" />
          </div>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 20, color: "white" }}>Rapport</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/sign-in" className="btn g" style={{ padding: "8px 18px", fontSize: 14 }}>Sign in</Link>
          <Link href="/sign-up" className="btn p" style={{ padding: "8px 18px", fontSize: 14 }}>{isDemo ? "Try the demo" : "Start free trial"}</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="sec wrap" style={{ paddingTop: 64 }}>
        <div className="grid2">
          <div>
            <span className="kick">For independent insurance agents and loan officers</span>
            <h1 style={{ fontSize: "clamp(2.3rem,5.2vw,4rem)", lineHeight: 1.06, margin: "0 0 20px" }}>
              The renewal went to the agent<br />
              <span style={{ background: "linear-gradient(135deg,#3CC4BD,#2BA8A2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>who stayed in touch.</span>
            </h1>
            <p className="sub" style={{ marginBottom: 26 }}>
              Rapport watches the dates that pay you: policy renewals, loan and home anniversaries,
              the check-in six months after a file closes. It writes each note from what has actually
              happened with that person and sends it from your own Gmail or Microsoft 365 mailbox,
              so it lands in the inbox and reads like you wrote it. You read them on your phone and
              tap approve.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/sign-up" className="btn p">{isDemo ? "Open the demo, no card" : "Start 14-day free trial"} <ArrowRight size={18} /></Link>
              <a href="#how" className="btn g">See how it works</a>
            </div>
            <p style={{ fontSize: 13, color: "#9BB0C6", marginTop: 16 }}>
              $39 a month up to 1,000 contacts · no onboarding call · cancel any time
            </p>
          </div>

          {/* What is due */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Waiting for you this morning</span>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>4 notes</span>
            </div>
            {DUE_TODAY.map((s) => (
              <div className="row" key={s.to}>
                <CalendarClock size={16} color="#FFD23F" style={{ marginTop: 3, flex: "none" }} />
                <div>
                  <div className="when">{s.when}</div>
                  <div className="to">{s.to}</div>
                  <div className="why">{s.why}</div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#9BB0C6", margin: "8px 0 0" }}>From the demo book. Names are fictional.</p>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="grid3">
          <div className="pain">The renewal came up in March. You found out in May, when the declaration page arrived from somebody else.</div>
          <div className="pain">Four hundred past clients, one spreadsheet you stopped opening, and a referral pipeline that runs on the twelve people you already talk to.</div>
          <div className="pain">The tools built for agencies start around $349 a month and come with a specialist you have to schedule a call with. You are one person.</div>
        </div>
      </section>

      {/* The numbers, counted up */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="numbers">
            <div className="n">
              <p className="fig">$<Counter to={39} /></p>
              <p className="cap">A month, up to a thousand contacts. No onboarding call, no annual contract, cancel from the billing portal.</p>
            </div>
            <div className="n">
              <p className="fig gold">$<Counter to={349} /></p>
              <p className="cap">Where the agency platforms start, per Capterra&apos;s listing for Levitate — with a specialist you schedule a call with.</p>
            </div>
            <div className="n">
              <p className="fig"><Counter to={8} /></p>
              <p className="cap">Occasions watched, and five of them are the money dates rather than birthdays.</p>
            </div>
            <div className="n">
              <p className="fig gold"><Counter to={14} /></p>
              <p className="cap">Days free, no card to start. Your first batch is held until you have read every note in it.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* THE ARTEFACT — the card set */}
      <section id="cards" className="sec wrap" style={{ paddingTop: 0 }}>
        <Reveal>
          <span className="kick">What arrives</span>
          <h2>Every note carries a card, and the card carries their name.</h2>
          <p className="sub" style={{ marginBottom: 24 }}>
            These are the eight Rapport cards, exactly as they go out. The name is printed into the
            artwork in gold foil script at send time — not typed underneath it, not a mail-merge
            field in the body. Add a line about the person before you approve and it goes into the
            brief: the puppy in the wreath and the horseshoe in the confetti both came from one.
          </p>
        </Reveal>
        <div className="cardset">
          {CARD_SET.map(([file, line, occ], i) => (
            <Reveal key={file} delay={i * 70}>
              <figure>
                <img src={`/img/cards/${file}-thumb.jpg`} alt={`A Rapport card reading ${line}`}
                  loading="lazy" width={480} height={600} />
                <figcaption>
                  <span className="line">&ldquo;{line}&rdquo;</span>
                  <span className="occ">{occ}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "#9BB0C6", marginTop: 14 }}>
          Rob and Maddie are the demo names. Yours are set from the contact the note is for.
        </p>
      </section>

      {/* The occasion belt. Two copies, -50% travel, pauses on hover and on focus. */}
      <div className="belt">
        <Marquee speed={44} ariaLabel="The occasions Rapport watches">
          {[
            "Policy renewal", "Loan anniversary", "Home anniversary", "Months since close",
            "Birthday", "A child's birthday", "Wedding anniversary", "Review request",
            "Any date you choose", "Their team won",
          ].map((o) => (
            <span key={o}><b>·</b> {o}</span>
          ))}
        </Marquee>
      </div>

      {/* The money dates */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="section-rule"><span className="section-rule__mark" /></div>
        <Reveal>
        <span className="kick">The money dates</span>
        <h2>A birthday is a courtesy. These are the ones that pay.</h2>
        <p className="sub" style={{ marginBottom: 26 }}>
          Most tools in this category watch birthdays and stop. Rapport puts the renewal and the
          closing date on the same footing, because those are the days a book of business actually
          turns on.
        </p>
        </Reveal>
        <div className="grid3">
          {[
            ["Policy renewal", "Fires a month before the date, not on it. You get the conversation while it is still a review and not a bill. Set the lead time to whatever your carriers need."],
            ["Loan and home anniversaries", "Every year from the first, on the day they closed. No rate talk, no refinance pitch, just the date remembered."],
            ["Months since close", "Three, six and twelve months after a file closes, or whatever you choose. The check-in everyone means to make and nobody makes."],
            ["Birthdays, anniversaries, kids", "Theirs, their wedding anniversary, and their children's birthdays, each written to the parent."],
            ["Any date you care about", "A licence renewal, the day their shop opened, the anniversary of the day you met. Yearly or once."],
            ["Their team won", "The morning after, from the live scoreboard. One line, no business in it."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 60}>
              <div className="card hover-lift" style={{ height: "100%" }}>
                <CalendarClock size={20} color="#FFD23F" />
                <h3 style={{ margin: "12px 0 6px", color: "#fff", fontSize: 17 }}>{t}</h3>
                <p className="sub" style={{ fontSize: 14 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The note */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <Reveal><div className="grid2">
          <div>
            <span className="kick">What actually goes out</span>
            <h2>Plain text, from your address, about one person.</h2>
            <p className="sub">
              No banner, no template, no &quot;powered by&quot;. Rapport reads the last few things that
              happened with that contact - the note it sent in March, the reply you pasted in, the
              call you logged - and writes from those rather than from a profile form. The footer is
              the one quiet line the law requires.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              <span className="chip"><Mail size={14} color="#3CC4BD" /> Your own mailbox</span>
              <span className="chip"><Gauge size={14} color="#FFD23F" /> Paced, with a daily cap</span>
              <span className="chip"><ShieldCheck size={14} color="#3CC4BD" /> SPF, DKIM and DMARC checked</span>
            </div>
          </div>
          <div className="shot">
            <div className="bar">
              <span className="dot" style={{ background: "#EF6C4A" }} />
              <span className="dot" style={{ background: "#FFD23F" }} />
              <span className="dot" style={{ background: "#3CC4BD" }} />
              <span style={{ marginLeft: 8, fontSize: 12, color: "var(--dim)" }}>aisha@bellfamilyinsurance.com</span>
            </div>
            <div className="body">
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--dim)" }}>To: dana@whitfieldroofing.com</p>
              <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#fff" }}>Before your November renewal</p>
              <p className="note">{SAMPLE_NOTE}</p>
              <p style={{ margin: "18px 0 0", fontSize: 11, color: "#9BB0C6" }}>
                Bell Family Insurance, 1200 Peachtree St, Atlanta GA 30309. Unsubscribe.
              </p>
            </div>
          </div>
        </div></Reveal>
      </section>

      {/* Approval queue */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <Reveal><div className="grid2">
          <div className="shot">
            <div className="bar">
              <CalendarClock size={14} color="#FFD23F" />
              <span style={{ fontSize: 12, color: "var(--dim)" }}>Today · 4 notes waiting for you</span>
            </div>
            <div className="body">
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 14 }}>Luis Ortega</p>
                <p style={{ margin: "2px 0 10px", fontSize: 12, color: "var(--dim)" }}>3 years since closing · luis@ortegaplumbing.com</p>
                <p style={{ margin: 0, fontSize: 13.5, color: "#e2e8f0", lineHeight: 1.65 }}>
                  Luis, three years today since we closed on the Cedar Street place. Hope it has been
                  treating you and Carmen well.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <span className="chip" style={{ borderColor: "rgba(43,168,162,.5)", color: "#3CC4BD" }}><Check size={13} /> Approve and send</span>
                  <span className="chip"><Pencil size={13} /> Edit</span>
                  <span className="chip"><XIcon size={13} /> Skip</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--dim)" }}>Approve all today, or go one at a time. Two minutes.</p>
            </div>
          </div>
          <div>
            <span className="kick">Every morning</span>
            <h2>You read them. Then they go.</h2>
            <p className="sub">
              Nothing leaves your mailbox until you have seen it. Open the day&apos;s queue on your phone,
              change the one line that is not how you would put it, and tap approve. Approving sends
              straight away, not tomorrow. Trust it after a fortnight and turn the review off; the
              switch is one tap in settings.
            </p>
          </div>
        </div></Reveal>
      </section>


      {/* The pinned moment. ONCE per page — it is a held note and it stops
          working the third time. Under reduced motion .pin-track collapses to
          100svh and this reads as one ordinary full-bleed statement. */}
      <Pinned name="desk" eyebrow="The part of the job that keeps the book"
        attribution="Rapport does it on the days you are too busy to."
        height="185vh">
        The renewal went to the agent who remembered.
      </Pinned>

      {/* How */}
      <section id="how" className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="section-rule"><span className="section-rule__mark" /></div>
        <Reveal>
        <span className="kick">How it works</span>
        <h2>Three things, then it runs itself</h2>
        <figure className="flowshot">
          <img src="/img/how-it-works.jpg" alt="Five steps: import your book, dates are watched, a note is drafted, you approve it, it is sent from your inbox." width={1600} height={575} />
        </figure>
        </Reveal>
        <div className="grid3" style={{ marginTop: 24 }}>
          <div className="card step">
            <b>1</b><Upload size={20} color="#3CC4BD" />
            <h3 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 17 }}>Load the book</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              CSV out of HawkSoft, EZLynx, Follow Up Boss or a spreadsheet. Rapport recognises the
              renewal, closing and purchase columns under the names those systems actually export,
              and reads 3/15/2026 as happily as 2026-03-15.
            </p>
          </div>
          <div className="card step">
            <b>2</b><Mail size={20} color="#3CC4BD" />
            <h3 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 17 }}>Connect your mailbox</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              One click for Google Workspace or Microsoft 365, on a permission that lets Rapport send
              and read nothing. No app passwords. Any other mailbox connects over SMTP.
            </p>
          </div>
          <div className="card step">
            <b>3</b><Check size={20} color="#3CC4BD" />
            <h3 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 17 }}>Approve, or let it fly</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              Each morning Rapport finds what is due, writes it, and holds it for you. Read, edit,
              approve. Or switch the review off and it just goes.
            </p>
          </div>
        </div>
      </section>

      {/* Who */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <span className="kick">Who it is for</span>
            <h2 style={{ fontSize: "1.6rem" }}>One agent, one book, no assistant</h2>
            <p className="sub" style={{ fontSize: 15 }}>
              Independent P&amp;C and life agents first. Then solo loan officers, and the realtors who
              work alongside them. If your renewals and your referrals both depend on being remembered
              at the right moment, and there is nobody in the office whose job that is, this is built
              for you.
            </p>
            <p className="sub" style={{ fontSize: 14, marginTop: 12 }}>
              It is not an agency platform, a quoting engine, or a CRM. It does one job.
            </p>
          </div>
          <div>
            {[
              "Renewal, closing and anniversary dates, not just birthdays",
              "Sends from your Google, Microsoft or SMTP mailbox",
              "Every note held for your approval, until you say otherwise",
              "Tier your book: A hears everything, C hears from you twice a year",
              "Signed webhooks out, one URL for contacts in, Zapier on both ends",
              "One-click unsubscribe on every note, always",
              "Your data is yours. Export the whole book any time",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                <CheckCircle size={16} color="#2BA8A2" style={{ marginTop: 2, flex: "none" }} />
                <span style={{ fontSize: 14, color: "var(--dim)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="section-rule"><span className="section-rule__mark" /></div>
        <Reveal>
        <span className="kick">Pricing</span>
        <h2>Two numbers, no call</h2>
        <p className="sub" style={{ marginBottom: 26 }}>
          Fourteen days free, no card to start. If one renewal a year stays because of a note you
          would not otherwise have sent, it has paid for itself several times over.
        </p>
        </Reveal>
        <div className="grid2" style={{ alignItems: "stretch" }}>
          <div className="card" style={{ borderColor: "rgba(43,168,162,.4)", background: "rgba(43,168,162,.08)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#3CC4BD", margin: "0 0 4px" }}>Solo</p>
            <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1 }}>
              $39<span style={{ fontSize: 14, color: "var(--dim)", fontWeight: 500 }}> / month</span>
            </p>
            <p style={{ fontSize: 13, color: "var(--dim)", margin: "6px 0 18px" }}>Up to 1,000 contacts · 14-day free trial</p>
            {[
              "Every occasion, including the money dates",
              "Your own Gmail, Microsoft 365 or SMTP mailbox",
              "Notes drafted from real interaction history",
              "Approval queue, send log, unsubscribe handling",
              "CSV in and out, webhooks both ways, Zapier",
              "Google review requests",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <CheckCircle size={14} color="#2BA8A2" style={{ marginTop: 3, flex: "none" }} />
                <span style={{ fontSize: 14, color: "var(--dim)" }}>{f}</span>
              </div>
            ))}
            <Link href="/sign-up" className="btn p" style={{ marginTop: 16 }}>{isDemo ? "Open the demo" : "Start free trial"} <ArrowRight size={18} /></Link>
          </div>

          <div className="card">
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "0 0 4px" }}>Book</p>
            <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1 }}>
              $79<span style={{ fontSize: 14, color: "var(--dim)", fontWeight: 500 }}> / month</span>
            </p>
            <p style={{ fontSize: 13, color: "var(--dim)", margin: "6px 0 18px" }}>Up to 5,000 contacts</p>
            {[
              "Everything in Solo",
              "A full book of business",
              "Texting on the money dates, when it ships",
              "Mailed cards through a print partner, when it ships",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <CheckCircle size={14} color="#FFD23F" style={{ marginTop: 3, flex: "none" }} />
                <span style={{ fontSize: 14, color: "var(--dim)" }}>{f}</span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#9BB0C6", marginTop: 14 }}>
              The contact figures are soft. Go over and Rapport tells you; it never refuses a contact
              or blocks an import.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20, padding: 0, overflow: "hidden" }}>
          <table className="cmp">
            <thead>
              <tr><th>What you are choosing between</th><th>Price</th><th>How you buy it</th></tr>
            </thead>
            <tbody>
              <tr><td>Rapport</td><td>$39 a month</td><td>Sign up, load a CSV, done in an evening</td></tr>
              <tr><td>The agency platforms</td><td>From about $349 a month</td><td>Demo, quote, annual contract, assigned specialist</td></tr>
              <tr><td>A full realtor CRM</td><td>About $49 a month</td><td>Self-serve, and you configure the drip campaigns yourself</td></tr>
              <tr><td>A box of cards</td><td>$1.25 to $3 a card, plus your evening</td><td>You remember, you write, you mail</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Integrations */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="grid3">
          <div className="card">
            <Plug size={20} color="#3CC4BD" />
            <h3 style={{ margin: "12px 0 6px", color: "#fff", fontSize: 17 }}>Fits what you already pay for</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              One URL for contacts in from HawkSoft, EZLynx, Follow Up Boss or Zapier. Signed
              webhooks out on every send. Flat payloads, no code step.
            </p>
          </div>
          <div className="card">
            <Gauge size={20} color="#FFD23F" />
            <h3 style={{ margin: "12px 0 6px", color: "#fff", fontSize: 17 }}>Built to reach the inbox</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              A daily cap you set, a warm-up ramp for a new mailbox, plain-text bodies, and an SPF,
              DKIM and DMARC check that tells you in plain words what to fix.
            </p>
          </div>
          <div className="card">
            <Star size={20} color="#FFD23F" />
            <h3 style={{ margin: "12px 0 6px", color: "#fff", fontSize: 17 }}>Ask for the review</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              A short Google review request a month after a closing, once per person, in the same
              queue as everything else so nobody is asked at a bad moment.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec wrap faq" style={{ paddingTop: 0 }}>
        <span className="kick">Questions</span>
        <div className="grid3" style={{ marginTop: 10 }}>
          <div className="card"><h4>Will clients know it is automated?</h4><p>Only if you tell them. The notes are short, plain text, specific to that person, and sent from your own address. The footer is the one quiet line with your mailing address and an unsubscribe link that the law requires. No tracking pixel, no branding.</p></div>
          <div className="card"><h4>What permission does it need on my mailbox?</h4><p>Send only. Rapport can send as you and cannot read a single message. You can revoke it from your Google or Microsoft account at any moment, and it appears in your own Sent folder like anything else you send.</p></div>
          <div className="card"><h4>Where do the personal details come from?</h4><p>From you and from your own history with that person. Rapport never buys or scrapes data. Every contact can unsubscribe in one click, and every note carries the link.</p></div>
          <div className="card"><h4>Does it work with my agency system?</h4><p>CSV in and out today, plus one inbound URL and signed webhooks that Zapier speaks natively. The importer already knows the column names HawkSoft, EZLynx and Follow Up Boss export.</p></div>
          <div className="card"><h4>What about texting and mailed cards?</h4><p>Designed, not shipped. Both are on the Book plan when they land. We would rather say that than sell you a checkbox that does nothing.</p></div>
          <div className="card"><h4>Am I locked in?</h4><p>Month to month, cancel from the billing portal, and export your whole book to CSV whenever you like. No contract, no onboarding call, no specialist to schedule.</p></div>
        </div>
      </section>

      {/* CTA */}
      <section className="sec wrap" style={{ paddingTop: 0, textAlign: "center" }}>
        <div className="card inner-ring corner-ticks" style={{ padding: 40 }}>
          <ShieldCheck size={26} color="#3CC4BD" />
          <h2 style={{ marginTop: 12 }}>Be the one who remembered</h2>
          <p className="sub" style={{ margin: "0 auto 22px" }}>Load the book tonight. The first notes are waiting for you in the morning.</p>
          <Link href="/sign-up" className="btn p">{isDemo ? "Open the demo" : "Start free trial"} <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(43,168,162,.1)", padding: "24px 40px", textAlign: "center", color: "#9BB0C6", fontSize: 13 }}>
        © {new Date().getFullYear()} Fusion Data Company · Rapport · <a href="/terms" style={{ color: "inherit" }}>Terms</a> · <a href="/privacy" style={{ color: "inherit" }}>Privacy</a> · <a href="/refunds" style={{ color: "inherit" }}>Refunds</a> · rob@fusiondataco.com · (916) 507-4160 · 7908 Katella Way, Citrus Heights, CA 95621
      </footer>
    </div>
  )
}
