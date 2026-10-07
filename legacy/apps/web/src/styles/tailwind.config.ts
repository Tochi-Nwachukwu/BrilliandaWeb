import type { Config } from "tailwindcss";

// `colors` replaces Tailwind's palette instead of extending it, so only the design tokens
// in tokens.css can be used — no ad hoc colours (Build Guide §13).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      bg: "var(--color-bg)",
      surface: "var(--color-surface)",
      sunken: "var(--color-sunken)",
      border: {
        DEFAULT: "var(--color-border)",
        strong: "var(--color-border-strong)",
      },
      edge: "var(--color-edge)",
      raise: "var(--color-raise)",
      divider: "var(--color-divider)",
      field: "var(--color-field)",
      hover: "var(--color-hover)",
      text: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
      },
      primary: {
        DEFAULT: "var(--color-primary)",
        hover: "var(--color-primary-hover)",
        text: "var(--color-primary-text)",
      },
      accent: { DEFAULT: "var(--color-accent)", soft: "var(--color-accent-soft)" },
      chart: "var(--color-chart)",
      panel: {
        DEFAULT: "var(--color-panel)",
        raised: "var(--color-panel-raised)",
        edge: "var(--color-panel-edge)",
        muted: "var(--color-panel-muted)",
        accent: "var(--color-panel-accent)",
      },
      success: { DEFAULT: "var(--color-success)", bg: "var(--color-success-bg)" },
      warning: { DEFAULT: "var(--color-warning)", bg: "var(--color-warning-bg)" },
      danger: { DEFAULT: "var(--color-danger)", bg: "var(--color-danger-bg)" },
      info: { DEFAULT: "var(--color-info)", bg: "var(--color-info-bg)" },
    },
    fontFamily: {
      // Outfit everywhere (DECISIONS.md D-15); the system stack carries the page until it arrives.
      sans: ["Outfit", "-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
      display: ["Outfit", "-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
    },
    extend: {
      // Minimum touch target for form controls (Build Guide §6).
      minHeight: { touch: "40px" },
      boxShadow: {
        raised: "var(--shadow-raised)",
        float: "var(--shadow-float)",
      },
      keyframes: {
        "fade-out": { "0%, 60%": { opacity: "1" }, "100%": { opacity: "0" } },
        settle: { "0%": { opacity: "0.35", transform: "translateY(3px)" }, "100%": { opacity: "1", transform: "none" } },
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        pop: { "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" }, "100%": { opacity: "1", transform: "none" } },
        grow: { "0%": { width: "0" } },
        drift: { "33%": { transform: "translate(26px, 16px) scale(1.06)" }, "66%": { transform: "translate(-18px, 10px) scale(0.96)" } },
        "ring-draw": { "0%": { strokeDasharray: "0 999" } },
      },
      animation: {
        // The per-cell "saved" tick: visible briefly, then gone, so a full grid stays calm.
        "fade-out": "fade-out 2s ease-out forwards",
        // A changed total settles into place, showing what the last entry did.
        settle: "settle 220ms ease-out",
        // The one entrance on a page (auth card).
        rise: "rise 420ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
        // Cards arrive with a small spring; the delay is set per card with --d.
        pop: "pop 500ms cubic-bezier(0.3, 1.15, 0.5, 1) var(--d, 0s) both",
        grow: "grow 1s cubic-bezier(0.3, 1.15, 0.5, 1) var(--d, 0s) both",
        drift: "drift 16s ease-in-out infinite",
        "ring-draw": "ring-draw 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) 150ms both",
      },
    },
  },
} satisfies Config;
