import type { Config } from 'tailwindcss'
const defaultTheme = require("tailwindcss/defaultTheme");

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: "475px",
        "3xl": "1920px",
        ...defaultTheme.screens,
      },
      zIndex: {
        modal: "9999",
        toast: "50",
      },
      animation: {
        spin: 'spin 1s linear infinite',
      },
      colors: {
        deepTeal: "#0D3B3E",
        emeraldGreen: "#21B573",
        softMint: "#9FFFCB",
        royalPurple: "#6A1B9A",
        lavenderGlow: "#C77DFF",
      },
    },
  },
  plugins: [],
}
export default config
