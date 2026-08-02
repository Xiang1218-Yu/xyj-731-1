/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        pine: {
          50: "#eef6f3",
          100: "#d4e8e1",
          500: "#2e6b5c",
          700: "#1a5246",
          900: "#0f3d33",
          950: "#092620",
        },
        paper: {
          50: "#faf7ef",
          100: "#f4eee2",
          200: "#ebe1cc",
          300: "#dccfae",
        },
        aqua: {
          400: "#48b3b3",
          500: "#2e8b8b",
          600: "#226e6e",
        },
        sand: {
          400: "#d9b765",
          500: "#c9a24b",
          600: "#a8843a",
        },
        night: {
          700: "#243a63",
          800: "#1b2a4a",
          900: "#121d36",
        },
        coral: {
          400: "#f08a66",
          500: "#e8704a",
          600: "#cf5a36",
        },
        glow: {
          400: "#8ff0e2",
          500: "#6ee7d6",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: "0 10px 30px -12px rgba(9, 38, 32, 0.35), 0 2px 6px rgba(9,38,32,0.08)",
        soft: "0 4px 14px -4px rgba(9,38,32,0.25)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        floatUp: {
          "0%": { transform: "translateY(4px)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "translateY(-4px)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 2.4s ease-in-out infinite",
        floatUp: "floatUp 0.25s ease-out",
        fadeIn: "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
