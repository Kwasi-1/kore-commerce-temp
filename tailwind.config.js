/** @type {import('tailwindcss').Config} */
import { nextui } from "@nextui-org/react";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // NextUI requires its theme dist to be scanned so its classes aren't purged
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
        "3xl": "1600px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        white: "#FFFFFF",
        alabaster: "#fafafa",
        silk: "#E0E0E0",
        stone: "#757575",
        graphite: "#5A5A5A",
        ruby: "#C8102E",
        crimson: "#B00020",
        carbon: "#1A1A1A",
        primary: {
          DEFAULT: "#075056",
          foreground: "hsl(var(--primary-foreground))",
          green: "#075056",
          gray: "#e4eef0",
          dark: "#1a1a1a",
          50: "#e6f4f5",
          100: "#cce9eb",
          200: "#99d3d7",
          300: "#66bdc3",
          400: "#33a7af",
          500: "#075056",
          600: "#064045",
          700: "#043034",
          800: "#032023",
          900: "#011011",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "rgba(249, 180, 0, 1)",
          foreground: "#000000",
        },
        gold: {
          DEFAULT: "rgb(244, 178, 51)",
          foreground: "#000000",
        },
        a89: {
          canvas: "#F8F7F4",
          surface: "#FFFFFF",
          dark: "#1A1A1A",
          "dark-elevated": "#242424",
          ink: "#1A1A1A",
          ruby: {
            DEFAULT: "#C8102E",
            deep: "#A00020",
            tint: "rgba(200, 16, 46, 0.06)",
            glow: "rgba(200, 16, 46, 0.07)",
            border: "rgba(200, 16, 46, 0.18)",
            "border-sm": "rgba(200, 16, 46, 0.12)",
            "badge-bg": "rgba(200, 16, 46, 0.04)",
            "badge-bd": "rgba(200, 16, 46, 0.20)",
          },
          cornershop: "#C4622D",
          "foundry-biz": "#2A5FC4",
          "foundry-fin": "#2A7A4B",
          nexus: "#5C2D8A",
          border: {
            subtle: "rgba(0, 0, 0, 0.06)",
            default: "rgba(0, 0, 0, 0.10)",
            strong: "rgba(0, 0, 0, 0.18)",
          }
        },
        pos: {
          accent: "#c3f277",           // lime green — buttons, active nav, stock badges
          "accent-text": "#111111",    // text on lime backgrounds
          "sidebar-light": "#111111",  // sidebar bg in light mode
          "sidebar-dark": "#f0f0f0",   // sidebar bg in dark mode
          "surface-app": "#f0f0f0",    // page bg light
          "surface-card": "#f7f7f7",   // card bg light
          "surface-panel": "#ffffff",  // content panels light
          "dark-app": "#0a0a0a",       // page bg dark
          "dark-card": "#1e1e1e",      // card bg dark
          "dark-panel": "#141414",     // content panels dark
          "dark-border": "#2a2a2a",    // borders dark
          danger: "#ff4444",
        }
      },
      boxShadow: {
        "a89-card": "0 2px 8px rgba(0, 0, 0, 0.06)",
        "a89-hover": "0 8px 24px rgba(0, 0, 0, 0.09)",
        "a89-mockup": "0 24px 64px rgba(0, 0, 0, 0.10)",
        "a89-nav": "0 1px 0 rgba(0, 0, 0, 0.06)",
        "a89-btn-ruby": "0 4px 12px rgba(200, 16, 46, 0.20)",
        "a89-dark-card": "0 2px 8px rgba(0, 0, 0, 0.30)",
      },
      borderRadius: {},
      fontFamily: {
        sans: ["AtypDisplay", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: "11px",
        sm: "14px",
        base: "16px",
        lg: "18px",
        xl: "20px",
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        black: "900",
      },
      letterSpacing: {
        tight: "-0.6px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-out-to-top": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-100%)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slide: {
          "0%": { transform: "translateY(-100%)" },
          "50%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in-from-top 0.3s ease-out",
        "slide-out": "slide-out-to-top 0.3s ease-in",
        marquee: "marquee 40s linear infinite",
        slide: "slide 1.5s cubic-bezier(0.76, 0, 0.24, 1) infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar-hide"),
    nextui(),
  ],
};
