export function DemoBar() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, padding: "8px 16px", fontSize: 12, textAlign: "center", background: "rgba(10,15,30,0.96)", color: "#cbd5e1", borderTop: "1px solid rgba(43,168,162,0.35)" }}>
      <strong style={{ color: "#fff" }}>Rapport demo.</strong> New accounts start with a sample book of fictional contacts. Your paid seat runs on its own private instance. Questions:{" "}
      <a href="https://fusiondataco.com/products/rapport" style={{ color: "#5eead4" }}>fusiondataco.com</a>
    </div>
  )
}
