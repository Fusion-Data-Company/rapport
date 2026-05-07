"use client"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"
import { forwardRef } from "react"

interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: "teal" | "coral" | "gold" | "none"
  accent?: "teal" | "coral" | "gold" | "none"
  neon?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, glow = "none", accent = "none", neon = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.15 }}
        className={cn(
          neon ? "neon-card" : "glass-card",
          accent === "teal" && "card-accent-teal",
          accent === "coral" && "card-accent-coral",
          accent === "gold" && "card-accent-gold",
          glow === "teal" && "shadow-[0_4px_24px_rgba(43,168,162,0.32)]",
          glow === "coral" && "shadow-[0_4px_24px_rgba(239,108,74,0.35)]",
          glow === "gold" && "shadow-[0_4px_24px_rgba(255,210,63,0.4)]",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
GlassCard.displayName = "GlassCard"
