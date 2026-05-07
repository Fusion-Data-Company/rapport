import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        teal: {
          DEFAULT: "#2BA8A2",
          light: "#3CC4BD",
          dark: "#1E8C86",
        },
        coral: {
          DEFAULT: "#EF6C4A",
          light: "#FF8A6A",
          dark: "#D45233",
        },
        gold: {
          DEFAULT: "#FFD23F",
          light: "#FFE47A",
          dark: "#E6B800",
        },
        cream: "#FFF8E7",
        sky: "#5DADE2",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s infinite",
        "fade-in": "fade-in 250ms ease forwards",
        "slide-right": "slide-in-right 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(43,168,162,0.2)" },
          "50%": { boxShadow: "0 0 28px rgba(43,168,162,0.5)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}

export default config
