import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "input-premium",
            error && "border-[var(--coral)] focus:shadow-[0_0_0_3px_rgba(239,108,74,0.2)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--coral)]">{error}</p>}
      </div>
    )
  }
)
GlassInput.displayName = "GlassInput"
