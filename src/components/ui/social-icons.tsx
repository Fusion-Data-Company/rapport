"use client"
// Real branded social media SVG icons — proper colors, not Lucide generics
import { cn } from "@/lib/utils"
import { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

export function FacebookIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M16.5 12H14v-1.5c0-.6.3-.9.9-.9H16.5V7.5h-2.4C11.7 7.5 11 9.2 11 10.5V12H9v2.5h2V22h3V14.5h2l.5-2.5Z" fill="white"/>
    </svg>
  )
}

export function LinkedInIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect width="24" height="24" rx="6" fill="#0A66C2"/>
      <path d="M7.5 9.5H5v9h2.5v-9ZM6.25 8.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="white"/>
      <path d="M19 18.5h-2.5v-4.4c0-1.1-.4-1.8-1.4-1.8-.7 0-1.1.5-1.3 1-.1.2-.1.5-.1.8v4.4H11v-9h2.5v1.2c.5-.7 1.3-1.4 2.6-1.4 1.9 0 3 1.3 3 3.9v5.3Z" fill="white"/>
    </svg>
  )
}

export function InstagramIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17" cy="7" r="1" fill="white"/>
    </svg>
  )
}

export function TikTokIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect width="24" height="24" rx="6" fill="#010101"/>
      <path d="M16.5 6.5c.7.9 1.8 1.5 3 1.5v2.6c-.6 0-1.1-.1-1.6-.3v4.7a4.7 4.7 0 1 1-4.1-4.7v2.7a2.1 2.1 0 1 0 2.1 2.1V6.5h.6Z" fill="white"/>
      <path d="M16.5 6.5c.7.9 1.8 1.5 3 1.5v2.6c-.6 0-1.1-.1-1.6-.3v4.7a4.7 4.7 0 1 1-4.1-4.7v2.7a2.1 2.1 0 1 0 2.1 2.1V6.5h.6Z" fill="#69C9D0" fillOpacity="0.3"/>
      <path d="M19.5 8A4 4 0 0 1 16.5 6.5H15.9v8.7a2.1 2.1 0 1 1-2.1-2.1v-2.7A4.7 4.7 0 1 0 18 17.2V12.3c.5.2 1 .3 1.6.3V10c-1.2 0-2.3-.6-3-1.5l-.1-.5Z" fill="#EE1D52"/>
    </svg>
  )
}

export function XIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect width="24" height="24" rx="6" fill="#000000"/>
      <path d="M13.4 11.2 18.3 5.5h-1.2l-4.2 4.9-3.4-4.9H5.5l5.2 7.5-5.2 6h1.2l4.5-5.3 3.6 5.3h3.9L13.4 11.2Zm-1.6 1.9-.5-.7-4-5.7h1.7l3.2 4.6.5.7 4.2 6h-1.7l-3.4-4.9Z" fill="white"/>
    </svg>
  )
}

export function MapPinIcon({ size = 24, className, hasData = true, ...props }: IconProps & { hasData?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" fill={hasData ? "#EF4444" : "#334155"}/>
      <circle cx="12" cy="9" r="2.5" fill="white"/>
    </svg>
  )
}

// Wrapper: shows icon, dims it if empty, opens popover to add on click
interface SocialIconCellProps {
  url: string | null | undefined
  icon: "facebook" | "linkedin" | "instagram" | "tiktok" | "x"
  size?: number
  onAdd?: (url: string) => void
}

export function SocialIconCell({ url, icon, size = 22, onAdd }: SocialIconCellProps) {
  const hasData = !!url
  const Icon = {
    facebook: FacebookIcon,
    linkedin: LinkedInIcon,
    instagram: InstagramIcon,
    tiktok: TikTokIcon,
    x: XIcon,
  }[icon]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasData) {
      window.open(url!, "_blank", "noopener,noreferrer")
    } else if (onAdd) {
      const input = prompt(`Paste ${icon} URL:`)
      if (input?.trim()) onAdd(input.trim())
    }
  }

  return (
    <button
      onClick={handleClick}
      title={hasData ? `Open ${icon}` : `Add ${icon} URL`}
      className={cn(
        "p-0 bg-transparent border-none cursor-pointer rounded-md transition-all duration-150",
        hasData ? "social-icon-populated" : "social-icon-empty"
      )}
    >
      <Icon size={size} />
    </button>
  )
}
