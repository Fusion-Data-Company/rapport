"use client"
import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { GlassButton } from "@/components/ui/glass-button"

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Could not open billing portal")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div>
      <GlassButton variant="ghost" onClick={open} loading={loading}>
        <ExternalLink className="w-4 h-4" /> Manage billing
      </GlassButton>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
