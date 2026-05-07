"use client"
import { useEffect } from "react"

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "agent-id"?: string
          "action-text"?: string
          "start-call-text"?: string
          "avatar-orb-color-1"?: string
          "avatar-orb-color-2"?: string
        },
        HTMLElement
      >
    }
  }
}

export default function Paige() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

  useEffect(() => {
    if (document.querySelector('script[src*="elevenlabs"]')) return
    const script = document.createElement("script")
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed"
    script.async = true
    script.type = "text/javascript"
    document.body.appendChild(script)
  }, [])

  if (!agentId) return null

  // Use createElement with string tag to avoid TS JSX intrinsic element type issues
  const Widget = "elevenlabs-convai" as unknown as React.FC<Record<string, unknown>>
  return (
    <Widget
      agent-id={agentId}
      action-text="Talk to Paige"
      start-call-text="Start Conversation"
      avatar-orb-color-1="#2BA8A2"
      avatar-orb-color-2="#1E8C86"
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
    />
  )
}
