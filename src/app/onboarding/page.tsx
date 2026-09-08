"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, Building2, Mail, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"

const css = `
.ob{--teal:#2BA8A2;--teal2:#1E8C86;--teal3:#3CC4BD;--gold:#FFD23F;--ink:#F1F5F9;--dim:rgba(148,163,184,.92);--card:rgba(15,28,48,.9);--line:rgba(43,168,162,.16);
  min-height:100vh;background:#09111F;color:var(--ink);font-family:Inter,system-ui,sans-serif;display:grid;grid-template-columns:1.05fr .95fr}
.ob h1,.ob h2{font-family:'Playfair Display',Georgia,serif;font-weight:800;letter-spacing:-.01em;margin:0}
.ob .pane{padding:48px 44px;display:flex;flex-direction:column;justify-content:center;max-width:620px;margin-left:auto;width:100%}
.ob .brand{display:flex;align-items:center;gap:12px;margin-bottom:40px}
.ob .mark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#1E8C86,#2BA8A2);box-shadow:0 8px 28px rgba(43,168,162,.4)}
.ob .brand .nm{font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:19px;color:#fff;line-height:1.1}
.ob .brand .tg{font-size:12px;color:var(--dim)}
.ob .steps{display:flex;gap:8px;margin-bottom:26px}
.ob .pip{height:3px;flex:1;border-radius:99px;background:rgba(43,168,162,.16)}
.ob .pip.on{background:linear-gradient(90deg,var(--teal3),var(--teal))}
.ob .eyebrow{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal3);font-weight:700;margin-bottom:10px}
.ob h2{font-size:clamp(1.6rem,2.6vw,2.05rem);margin-bottom:8px}
.ob .lede{color:var(--dim);font-size:15px;line-height:1.6;margin:0 0 26px;max-width:52ch}
.ob label{display:block;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:0 0 7px}
.ob .fld{margin-bottom:18px}
.ob input{width:100%;box-sizing:border-box;padding:13px 15px;border-radius:12px;background:rgba(9,17,31,.85);border:1px solid var(--line);color:#fff;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s}
.ob input::placeholder{color:rgba(100,116,139,.85)}
.ob input:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(43,168,162,.16)}
.ob .hint{font-size:12.5px;color:rgba(100,116,139,.95);margin:-10px 0 18px}
.ob .btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 26px;border-radius:999px;font-weight:700;font-size:15px;border:0;cursor:pointer;font-family:inherit}
.ob .btn.p{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;box-shadow:0 8px 30px rgba(43,168,162,.34)}
.ob .btn.p:disabled{opacity:.4;box-shadow:none;cursor:not-allowed}
.ob .btn.g{background:transparent;border:1px solid rgba(43,168,162,.3);color:var(--dim)}
.ob .row{display:flex;gap:12px}
.ob .review{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:22px}
.ob .review .ln{display:flex;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);background:rgba(9,17,31,.6)}
.ob .review .ln:last-child{border-bottom:0}
.ob .review .k{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--dim);font-weight:700}
.ob .review .v{font-size:14.5px;color:#fff;font-weight:600}
.ob .preview{background:rgba(9,17,31,.7);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:22px}
.ob .preview .from{font-size:12.5px;color:var(--dim);margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.ob .preview .body{font-family:Georgia,serif;font-size:14.5px;line-height:1.75;color:#e2e8f0;white-space:pre-line}
.ob .art{position:relative;background:#0a1420;border-left:1px solid var(--line);overflow:hidden}
.ob .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9}
.ob .art .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,17,31,.25),rgba(9,17,31,.9))}
.ob .art .quote{position:absolute;left:44px;right:44px;bottom:48px}
.ob .art .quote p{font-family:'Playfair Display',Georgia,serif;font-size:23px;line-height:1.4;color:#fff;margin:0 0 10px}
.ob .art .quote span{font-size:13px;color:var(--dim)}
@media(max-width:960px){.ob{grid-template-columns:1fr}.ob .art{display:none}.ob .pane{margin:0 auto;padding:36px 22px}}
`

const SAMPLE = `Morning Dana - your commercial auto renews on the 4th, so I pulled it up early rather than the week of.

Nothing needs doing yet. I will have the numbers to you by Friday, and if the truck count has changed since spring, tell me now and I will work it in.

Hope the Bakersfield job went well.`

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ businessName: "", fromName: "", fromEmail: "", replyTo: "" })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const ready = Boolean(form.businessName && form.fromName && form.fromEmail)

  const submit = async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/onboarding/create-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Setup did not save")
      router.push("/settings/email")
    } catch {
      setError("That did not save. Check your connection and try again.")
      setLoading(false)
    }
  }

  return (
    <div className="ob">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="pane">
        <div className="brand">
          <div className="mark"><Heart size={20} color="#fff" /></div>
          <div>
            <div className="nm">Rapport</div>
            <div className="tg">Renewals, anniversaries and birthdays, remembered</div>
          </div>
        </div>

        <div className="steps">
          <div className={`pip ${step >= 1 ? "on" : ""}`} />
          <div className={`pip ${step >= 2 ? "on" : ""}`} />
        </div>

        {step === 1 && (
          <>
            <div className="eyebrow">Step 1 of 2</div>
            <h2>Who are these notes from?</h2>
            <p className="lede">
              This is the name and address your clients see. It goes at the top of every note
              Rapport sends, so use the one they already know you by.
            </p>

            <div className="fld">
              <label htmlFor="bn">Business name</label>
              <input id="bn" value={form.businessName} onChange={update("businessName")} placeholder="Fusion Data Company" autoComplete="organization" />
            </div>
            <div className="fld">
              <label htmlFor="fn">Your name, as the sender</label>
              <input id="fn" value={form.fromName} onChange={update("fromName")} placeholder="Rob Yeager" autoComplete="name" />
            </div>
            <div className="fld">
              <label htmlFor="fe">From email</label>
              <input id="fe" type="email" value={form.fromEmail} onChange={update("fromEmail")} placeholder="rob@fusiondataco.com" autoComplete="email" />
            </div>
            <p className="hint">You connect this mailbox in the next screen, so notes send as you and land in the inbox.</p>
            <div className="fld">
              <label htmlFor="rt">Reply-to, if different</label>
              <input id="rt" type="email" value={form.replyTo} onChange={update("replyTo")} placeholder="Same as above" />
            </div>

            <button className="btn p" disabled={!ready} onClick={() => setStep(2)}>
              Continue <ArrowRight size={17} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="eyebrow">Step 2 of 2</div>
            <h2>This is how you will look</h2>
            <p className="lede">
              Every note carries your name and your address. Here is the shape of one, written
              against a renewal date thirty days out.
            </p>

            <div className="review">
              <div className="ln"><Building2 size={16} color="#3CC4BD" /><div><div className="k">Business</div><div className="v">{form.businessName}</div></div></div>
              <div className="ln"><Heart size={16} color="#3CC4BD" /><div><div className="k">Sender</div><div className="v">{form.fromName}</div></div></div>
              <div className="ln"><Mail size={16} color="#3CC4BD" /><div><div className="k">From</div><div className="v">{form.fromEmail}</div></div></div>
            </div>

            <div className="preview">
              <div className="from">
                <strong style={{ color: "#fff" }}>{form.fromName || "You"}</strong> &lt;{form.fromEmail || "you@yourdomain.com"}&gt;
                <br />Subject: Renewal coming up on the 4th
              </div>
              <div className="body">{SAMPLE}</div>
            </div>

            {error && <p style={{ color: "#EF6C4A", fontSize: 13.5, margin: "-8px 0 16px" }}>{error}</p>}

            <div className="row">
              <button className="btn g" onClick={() => setStep(1)} disabled={loading}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn p" style={{ flex: 1 }} onClick={submit} disabled={loading}>
                {loading ? <><Loader2 size={17} className="spin" /> Setting up</> : <>Connect my mailbox <CheckCircle2 size={17} /></>}
              </button>
            </div>
            <p className="hint" style={{ margin: "14px 0 0" }}>
              Next screen connects Gmail or Microsoft 365. Nothing sends until you approve it.
            </p>
          </>
        )}
      </div>

      <div className="art">
        <img src="/img/hero-desk.jpg" alt="An agent's desk at the end of the day: the client book open, a note signed by hand, the calendar still up on the laptop." />
        <div className="scrim" />
        <div className="quote">
          <p>The renewal went to the agent who stayed in touch.</p>
          <span>Rapport writes the note. You decide whether it goes.</span>
        </div>
      </div>
    </div>
  )
}
