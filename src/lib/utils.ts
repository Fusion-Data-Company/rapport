import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", ...opts })
}

export function getInitials(firstName: string, lastName?: string | null) {
  return [firstName[0], lastName?.[0]].filter(Boolean).join("").toUpperCase()
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str
}
