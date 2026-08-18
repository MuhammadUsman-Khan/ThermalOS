/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        thermal: {
          orange: "#FF6B2B",
          amber: "#F59E0B",
          cyan: "#06B6D4",
          emerald: "#10B981",
          rose: "#F43F5E",
          dark: "#090A0D",
          card: "#0E1015",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        heading: ['"Space Grotesk"', 'sans-serif'],
      },
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.96)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'pulse-subtle': 'pulse-subtle 2s infinite ease-in-out',
        'float-slow': 'float-slow 4s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
