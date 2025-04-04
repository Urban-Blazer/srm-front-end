import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
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
