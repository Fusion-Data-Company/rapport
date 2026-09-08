import Link from "next/link"
import { Heart, ArrowRight, CheckCircle, Mail, CalendarDays, Trophy, Upload, Sparkles, ShieldCheck } from "lucide-react"

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

const css = `
.rp{--teal:#2BA8A2;--teal2:#1E8C86;--teal3:#3CC4BD;--ink:#F1F5F9;--dim:rgba(148,163,184,.9);--card:rgba(15,28,48,.88);--line:rgba(43,168,162,.14);background:#09111F;color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.rp .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.rp h1,.rp h2{font-family:'Playfair Display',Georgia,serif;font-weight:800;letter-spacing:-.01em}
.rp h2{font-size:clamp(1.7rem,3.4vw,2.4rem);margin:0 0 14px}
.rp .sub{color:var(--dim);font-size:17px;line-height:1.65;max-width:62ch}
.rp .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:999px;font-weight:700;text-decoration:none;font-size:15px}
.rp .btn.p{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;box-shadow:0 8px 32px rgba(43,168,162,.35)}
.rp .btn.g{border:1px solid rgba(43,168,162,.3);color:var(--dim)}
.rp .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:26px}
.rp .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.rp .grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;align-items:center}
.rp .sec{padding:72px 0}
.rp .kick{display:inline-block;padding:5px 14px;border-radius:999px;border:1px solid rgba(43,168,162,.3);background:rgba(43,168,162,.08);color:var(--teal3);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
.rp .pain{border-left:3px solid #EF6C4A;padding:14px 18px;background:rgba(239,108,74,.06);border-radius:0 12px 12px 0;color:var(--ink);font-size:15px;line-height:1.6}
.rp .send{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:rgba(9,17,31,.7);border:1px solid var(--line);margin-bottom:10px}
.rp .send .when{font-size:11px;color:var(--teal3);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rp .send .to{font-weight:700;font-size:14px;color:#fff}
.rp .send .why{font-size:13px;color:var(--dim);line-height:1.5}
.rp .step b{display:block;font-size:26px;color:var(--teal3);font-family:'Playfair Display',serif;margin-bottom:6px}
.rp .faq p{color:var(--dim);font-size:14px;line-height:1.6;margin:4px 0 0}
.rp .faq h4{margin:0;font-size:15px;color:#fff}
@media(max-width:860px){.rp .grid3{grid-template-columns:1fr}.rp .grid2{grid-template-columns:1fr}.rp .sec{padding:52px 0}}
`

const TODAY = [
  { when: "Birthday · tomorrow", to: "Dana Whitfield, Whitfield Roofing", why: "\"Happy birthday, Dana. Hope Ella's soccer season is treating you better than the Chiefs' defense is.\" Sent from your mailbox at 7:00 am." },
  { when: "Work anniversary · 5 years", to: "Luis Ortega, Ortega & Sons Plumbing", why: "Five years since Luis took over from his dad. Note references the expansion into El Paso he mentioned in March." },
  { when: "Their team won last night", to: "Tom Becker, Becker Auto Body", why: "Packers 27–17. A two-line congrats from you lands before his first coffee." },
]

export default function HomePage() {
  return (
    <div className="rp">
      <style dangerouslySetInnerHTML={{ __html: css }} />

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
      <section className="sec wrap" style={{ paddingTop: 70 }}>
        <div className="grid2">
          <div>
            <span className="kick">For anyone whose income is a book of relationships</span>
            <h1 style={{ fontSize: "clamp(2.4rem,5.4vw,4.2rem)", lineHeight: 1.06, margin: "0 0 20px" }}>
              Your best clients remember<br />
              <span style={{ background: "linear-gradient(135deg,#3CC4BD,#2BA8A2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>who remembered them.</span>
            </h1>
            <p className="sub" style={{ marginBottom: 28 }}>
              Rapport keeps a real profile on every client you care about — spouse, kids, hometown, their team, the deal you did together — watches the calendar and the scoreboard, writes the note you never have time to write, and sends it from your own mailbox. Every morning. Without you.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/sign-up" className="btn p">{isDemo ? "Open the demo, no card" : "Start 14-day free trial"} <ArrowRight size={18} /></Link>
              <a href="#how" className="btn g">See how it works</a>
            </div>
            <p style={{ fontSize: 13, color: "rgba(100,116,139,.9)", marginTop: 16 }}>
              $29 per seat per month after the trial · 250 contacts per seat · cancel any time
            </p>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Going out this morning</span>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>3 of 3 approved</span>
            </div>
            {TODAY.map((s) => (
              <div className="send" key={s.to}>
                <Mail size={16} color="#3CC4BD" style={{ marginTop: 3, flex: "none" }} />
                <div>
                  <div className="when">{s.when}</div>
                  <div className="to">{s.to}</div>
                  <div className="why">{s.why}</div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "rgba(100,116,139,.9)", margin: "8px 0 0" }}>Sample from the demo book. Names are fictional.</p>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="grid3">
          <div className="pain">You meant to call when his daughter graduated. You saw it on LinkedIn three weeks later.</div>
          <div className="pain">The renewal went to the agent who sent a birthday card. Yours was in a spreadsheet you stopped opening in February.</div>
          <div className="pain">Two hundred relationships, one calendar, zero time. So the notes only go to the ten you already talk to.</div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="sec wrap" style={{ paddingTop: 0 }}>
        <span className="kick">How it works</span>
        <h2>Three things, then it runs itself</h2>
        <div className="grid3" style={{ marginTop: 24 }}>
          <div className="card step"><b>1</b><Upload size={20} color="#3CC4BD" /><h3 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 17 }}>Load your book</h3><p className="sub" style={{ fontSize: 14 }}>CSV from any CRM, a photo of a business card, or type it in. Rapport keeps the human details — kids, spouse, hometown, their team, what you last talked about.</p></div>
          <div className="card step"><b>2</b><Mail size={20} color="#3CC4BD" /><h3 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 17 }}>Connect your mailbox</h3><p className="sub" style={{ fontSize: 14 }}>Google Workspace, Microsoft 365 or any SMTP. Notes go out from <em>you</em>, not from a marketing platform, so they land in the inbox and read like you wrote them.</p></div>
          <div className="card step"><b>3</b><CalendarDays size={20} color="#3CC4BD" /><h3 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 17 }}>Approve or let it fly</h3><p className="sub" style={{ fontSize: 14 }}>Every morning Rapport finds the milestones due, writes each note from that person's profile, and sends it — or holds it for a one-tap approve if you want the last word.</p></div>
        </div>
      </section>

      {/* What it watches */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <span className="kick">What it watches</span>
        <h2>The moments that move a relationship</h2>
        <div className="grid3" style={{ marginTop: 24 }}>
          {[
            [CalendarDays, "Birthdays and anniversaries", "Theirs, their spouse's, their kids' — and the anniversary of the day they became your client."],
            [Trophy, "Their team's results", "Seven leagues checked daily. A win gets a two-line congrats; a bad loss gets left alone."],
            [Sparkles, "Written for one person", "Each note is drafted from that contact's profile and your voice settings. Never a merge field, never bulk."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Mail
            return (
              <div className="card" key={t as string}>
                <I size={22} color="#3CC4BD" />
                <h3 style={{ margin: "12px 0 6px", color: "#fff", fontSize: 17 }}>{t as string}</h3>
                <p className="sub" style={{ fontSize: 14 }}>{d as string}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Who */}
      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <span className="kick">Who it is for</span>
            <h2 style={{ fontSize: "1.6rem" }}>People paid on the strength of a relationship</h2>
            <p className="sub" style={{ fontSize: 15 }}>Insurance agents and brokers. Loan officers. Realtors. Financial advisors. Recruiters. Account managers with a territory. Anyone with a book where a renewal or a referral depends on being remembered at the right moment.</p>
          </div>
          <div>
            {[
              "250 contacts per seat, add seats as the book grows",
              "Sends from your Google, Microsoft or SMTP mailbox",
              "Bring your own AI key, or use ours",
              "One-click unsubscribe on every note, always",
              "Your data stays in your workspace; export any time",
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
        <div className="grid2">
          <div>
            <span className="kick">Pricing</span>
            <h2>$29 per seat, per month</h2>
            <p className="sub">One plan. Fourteen days free, no card to start. If one renewal or one referral a year comes from a note you would not have sent, it has paid for itself many times over.</p>
            <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/sign-up" className="btn p">{isDemo ? "Open the demo" : "Start free trial"} <ArrowRight size={18} /></Link>
              {isDemo && <span style={{ fontSize: 13, color: "var(--dim)", alignSelf: "center" }}>Demo accounts start with a fictional sample book so you can see it working in a minute.</span>}
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(43,168,162,.4)", background: "rgba(43,168,162,.08)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#3CC4BD", margin: "0 0 4px" }}>Rapport Pro</p>
            <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1 }}>$29<span style={{ fontSize: 14, color: "var(--dim)", fontWeight: 500 }}> / seat / month</span></p>
            <p style={{ fontSize: 13, color: "var(--dim)", margin: "6px 0 18px" }}>14-day free trial · 250 contacts per seat · cancel any time</p>
            {[
              "Contact profiles with CSV and business-card import",
              "Birthday, anniversary, milestone and team-result notes, written per person",
              "Greeting-card gallery, including your own designs",
              "Sends from your own mailbox",
              "Approval queue, send log, unsubscribe handling",
              "Custom integrations for your CRM or tools on request",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <CheckCircle size={14} color="#2BA8A2" style={{ marginTop: 3, flex: "none" }} />
                <span style={{ fontSize: 14, color: "var(--dim)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec wrap faq" style={{ paddingTop: 0 }}>
        <span className="kick">Questions</span>
        <div className="grid3" style={{ marginTop: 10 }}>
          <div className="card"><h4>Will clients know it is automated?</h4><p>Only if you tell them. Notes are short, specific to that person, and sent from your own address. There is no footer, no tracking pixel, no "powered by".</p></div>
          <div className="card"><h4>Where does the personal information come from?</h4><p>From you. Rapport stores what you already know about your clients and never buys or scrapes data. Every contact can unsubscribe with one click.</p></div>
          <div className="card"><h4>Can it work with my CRM?</h4><p>CSV in and out today. Deeper integrations (HubSpot, Salesforce, GoHighLevel, your agency system) are wired in per customer — tell us what you use.</p></div>
        </div>
      </section>

      {/* CTA */}
      <section className="sec wrap" style={{ paddingTop: 0, textAlign: "center" }}>
        <div className="card" style={{ padding: 40 }}>
          <ShieldCheck size={26} color="#3CC4BD" />
          <h2 style={{ marginTop: 12 }}>Be the one who remembered</h2>
          <p className="sub" style={{ margin: "0 auto 22px" }}>Load your book tonight. The first notes go out tomorrow morning.</p>
          <Link href="/sign-up" className="btn p">{isDemo ? "Open the demo" : "Start free trial"} <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(43,168,162,.1)", padding: "24px 40px", textAlign: "center", color: "rgba(100,116,139,.8)", fontSize: 13 }}>
        © {new Date().getFullYear()} Fusion Data Company · Rapport · rob@fusiondataco.com
      </footer>
    </div>
  )
}
