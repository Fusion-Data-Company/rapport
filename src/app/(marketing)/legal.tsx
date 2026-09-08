import Link from "next/link"
import { Heart } from "lucide-react"

export const LEGAL_UPDATED = "8 September 2026"
export const VENDOR = { name: "Fusion Data Company", address: "7908 Katella Way, Citrus Heights, CA 95621", email: "rob@fusiondataco.com", phone: "(916) 507-4160" }

const css = `
.rl{--teal:#2BA8A2;--ink:#F1F5F9;--dim:#C3D2E2;background:#09111F;color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}
.rl .wrap{max-width:760px;margin:0 auto;padding:0 24px 80px}
.rl h1{font-family:'Playfair Display',Georgia,serif;font-size:36px;margin:8px 0 6px;color:#fff}
.rl h2{font-size:18px;margin:30px 0 8px;color:#fff}
.rl p{color:var(--dim);font-size:15.5px;line-height:1.7;margin:0 0 12px}
.rl a{color:var(--teal)}
.rl .kick{color:var(--teal);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.rl .meta{font-size:13px;color:#9BB0C6}
.rl footer{margin-top:48px;padding-top:20px;border-top:1px solid rgba(43,168,162,.14);font-size:13px;color:#9BB0C6}
`

export function LegalShell({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rl">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="wrap">
        <nav style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0 36px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#1E8C86,#2BA8A2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Heart size={16} color="white" /></div>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 18, color: "white" }}>Rapport</span>
          </Link>
        </nav>
        <span className="kick">{kicker}</span>
        <h1>{title}</h1>
        <p className="meta">{VENDOR.name} · Last updated {LEGAL_UPDATED}</p>
        {children}
        <footer>
          {VENDOR.name} · {VENDOR.address} · <a href={`mailto:${VENDOR.email}`}>{VENDOR.email}</a> · {VENDOR.phone} · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/refunds">Refunds</Link>
        </footer>
      </div>
    </div>
  )
}
