/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C8A951",
          light: "#F0D78C",
          dark: "#8B6914",
        },
        navy: {
          50:  "#E8EAF2",
          100: "#C5C9E0",
          200: "#9FA5C8",
          300: "#7880AF",
          400: "#5A639C",
          500: "#3C4689",
          600: "#1E2A6E",
          700: "#111C4E",
          800: "#0A1232",
          900: "#060A1E",
        },
        accent: {
          blue:   "#4FC3F7",
          purple: "#CE93D8",
          teal:   "#4DB6AC",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Cinzel'", "serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #C8A951, #F0D78C, #8B6914)",
        "navy-gradient": "linear-gradient(135deg, #060A1E, #111C4E, #1E2A6E)",
        "card-shine":    "linear-gradient(135deg, rgba(200,169,81,0.08), rgba(255,255,255,0.02))",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.5s infinite",
        "spin-slow":  "spin 3s linear infinite",
        "bounce-in":  "bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseGold: { "0%,100%": { boxShadow: "0 0 0 0 rgba(200,169,81,0.4)" }, "50%": { boxShadow: "0 0 0 8px rgba(200,169,81,0)" } },
        shimmer:   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        bounceIn:  { from: { opacity: 0, transform: "scale(0.8)" }, to: { opacity: 1, transform: "scale(1)" } },
      },
      boxShadow: {
        "gold":    "0 0 20px rgba(200,169,81,0.3), 0 4px 15px rgba(0,0,0,0.5)",
        "card":    "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "champ":   "0 4px 12px rgba(0,0,0,0.6)",
        "glow-blue":"0 0 15px rgba(79,195,247,0.4)",
      },
    },
  },
  plugins: [],
};
