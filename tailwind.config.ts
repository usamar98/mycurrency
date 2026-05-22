import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18181b",
        accent: "#047857"
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Geist",
          "Satoshi",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "var(--font-mono)",
          "Geist Mono",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace"
        ]
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(24, 24, 27, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
