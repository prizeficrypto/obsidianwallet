import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0a",
          card: "#161616",
          elevated: "#1e1e1e",
        },
        border: {
          DEFAULT: "#2a2a2a",
          subtle: "#1e1e1e",
        },
        accent: {
          purple: "#7C3AED",
          "purple-light": "#9F67FF",
          "purple-dim": "rgba(124, 58, 237, 0.15)",
        },
        chain: {
          world: "#7C3AED",
          eth: "#627EEA",
          sol: "#9945FF",
          bnb: "#F0B90B",
          polygon: "#8247E5",
          avax: "#E84142",
          arb: "#28A0F0",
          base: "#0052FF",
          op: "#FF0420",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 1.5s infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
