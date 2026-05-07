"use client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ButtonHTMLAttributes, forwardRef } from "react"
import { Slot } from "@radix-ui/react-slot"

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "coral" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  asChild?: boolean
  loading?: boolean
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.12 }}
        className="inline-flex"
      >
        <Comp
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            "btn-primary relative inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:opacity-50 disabled:cursor-not-allowed",
            variant === "gold" && "btn-gold",
            variant === "coral" && "btn-coral",
            variant === "ghost" && "btn-ghost",
            variant === "danger" && "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-[0_4px_20px_rgba(239,68,68,0.3)]",
            size === "sm" && "text-xs px-3 py-1.5 rounded-full",
            size === "md" && "text-sm px-5 py-2.5 rounded-full",
            size === "lg" && "text-base px-7 py-3 rounded-full",
            className
          )}
          {...props}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : children}
        </Comp>
      </motion.div>
    )
  }
)
GlassButton.displayName = "GlassButton"
