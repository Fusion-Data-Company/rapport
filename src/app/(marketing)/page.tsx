import Link from "next/link"
import { Heart, Mail, Activity, Users, CheckCircle, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div style={{ background: "#09111F", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#F1F5F9" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(43,168,162,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1E8C86,#2BA8A2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color="white" />
          </div>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 20, color: "white" }}>Rapport</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/sign-in" style={{ padding: "8px 20px", borderRadius: 999, border: "1px solid rgba(43,168,162,0.3)", color: "rgba(148,163,184,0.9)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Sign In</Link>
          <Link href="/sign-up" style={{ padding: "8px 20px", borderRadius: 999, background: "linear-gradient(135deg,#2BA8A2,#1E8C86)", color: "white", textDecoration: "none", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(43,168,162,0.3)" }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 40px 80px" }}>
        <div style={{ display: "inline-block", padding: "5px 16px", borderRadius: 999, border: "1px solid rgba(43,168,162,0.3)", background: "rgba(43,168,162,0.08)", color: "#3CC4BD", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 24 }}>
          Based on Harvey Mackay's 66 Customer Profile
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: 24, maxWidth: 820, margin: "0 auto 24px" }}>
          Every client.<br />
          <span style={{ background: "linear-gradient(135deg, #3CC4BD, #2BA8A2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Every milestone.</span><br />
          Every time.
        </h1>
        <p style={{ fontSize: 18, color: "rgba(148,163,184,0.9)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Rapport ingests your customer database and automatically sends hyper-personalized email cards on every birthday, anniversary, sports win, and life milestone — making every client feel like your only client.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/sign-up" style={{ padding: "14px 32px", borderRadius: 999, background: "linear-gradient(135deg,#2BA8A2,#1E8C86)", color: "white", textDecoration: "none", fontSize: 16, fontWeight: 700, boxShadow: "0 8px 32px rgba(43,168,162,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <Link href="/sign-in" style={{ padding: "14px 32px", borderRadius: 999, border: "1px solid rgba(43,168,162,0.25)", color: "rgba(148,163,184,0.9)", textDecoration: "none", fontSize: 16, fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "60px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { icon: Users, title: "McKay 66 Database", desc: "All 66 personal data points per contact — birthdays, anniversaries, kids, spouse, sports teams, hobbies, and more.", color: "#2BA8A2" },
            { icon: Mail, title: "AI-Personalized Emails", desc: "Each email is uniquely written by AI referencing a specific personal detail. Never sounds like bulk mail.", color: "#FFD23F" },
            { icon: Activity, title: "Sports Score Monitoring", desc: "Monitors 7 leagues daily via ESPN. Client's team wins? They get a personal congrats email at 8am.", color: "#EF6C4A" },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} style={{ background: "rgba(15,28,48,0.88)", border: "1px solid rgba(43,168,162,0.12)", borderRadius: 18, padding: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "rgba(148,163,184,0.85)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "60px 40px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, color: "white", marginBottom: 12 }}>Simple pricing</h2>
        <p style={{ color: "rgba(148,163,184,0.8)", marginBottom: 40 }}>One flat monthly fee. Unlimited email sends.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { plan: "Starter", price: "$49", contacts: "100", features: ["Email sends", "System cards", "Sports monitoring", "1 user"] },
            { plan: "Growth", price: "$99", contacts: "500", features: ["Email + SMS", "Custom cards", "All sports", "3 users", "API access"], featured: true },
            { plan: "Enterprise", price: "$199", contacts: "Unlimited", features: ["All features", "Unlimited users", "White-label", "Priority support"] },
          ].map(({ plan, price, contacts, features, featured }) => (
            <div key={plan} style={{ background: featured ? "rgba(43,168,162,0.1)" : "rgba(15,28,48,0.88)", border: `1px solid ${featured ? "rgba(43,168,162,0.4)" : "rgba(43,168,162,0.12)"}`, borderRadius: 20, padding: 28, position: "relative" }}>
              {featured && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#2BA8A2,#1E8C86)", padding: "3px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "white" }}>MOST POPULAR</div>}
              <p style={{ fontSize: 14, fontWeight: 600, color: "#3CC4BD", marginBottom: 4 }}>{plan}</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: "white", marginBottom: 2 }}>{price}<span style={{ fontSize: 14, color: "rgba(148,163,184,0.7)" }}>/mo</span></p>
              <p style={{ fontSize: 12, color: "rgba(148,163,184,0.7)", marginBottom: 20 }}>{contacts} contacts</p>
              <div style={{ textAlign: "left", marginBottom: 24 }}>
                {features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <CheckCircle size={14} color="#2BA8A2" />
                    <span style={{ fontSize: 13, color: "rgba(148,163,184,0.9)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/sign-up" style={{ display: "block", padding: "10px 0", borderRadius: 999, background: featured ? "linear-gradient(135deg,#2BA8A2,#1E8C86)" : "transparent", border: featured ? "none" : "1px solid rgba(43,168,162,0.3)", color: featured ? "white" : "#3CC4BD", textDecoration: "none", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(43,168,162,0.1)", padding: "24px 40px", textAlign: "center", color: "rgba(100,116,139,0.8)", fontSize: 13 }}>
        © {new Date().getFullYear()} Fusion Data Company · Rapport · rob@fusiondataco.com
      </footer>
    </div>
  )
}
