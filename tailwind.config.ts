import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#2b59e0", dark: "#0f1f44", soft: "#eaf0fd" },
        zemin: "#f6f7f9",
        cizgi: "#e9ebef",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { kart: "12px" },
    },
  },
  plugins: [],
};

export default config;
