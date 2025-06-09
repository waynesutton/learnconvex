/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter Variable",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
        bold: ["Eudoxus Sans", "Inter Variable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#EE342F",
        "primary-hover": "#d12b26",
        secondary: "#64748b",
        "convex-red": "#EE342F",
        "convex-red-dark": "#d12b26",
        "convex-yellow": "#F3B01C",
        "convex-yellow-dark": "#e09a15",
        "convex-purple": "#8D2676",
        "convex-purple-dark": "#7a2268",
        "convex-cream": "#F9F7EE",
        "convex-light-gray": "#EEEEEE",
        // Keep legacy orange/blue for backward compatibility
        "convex-orange": "#EE342F",
        "convex-orange-dark": "#d12b26",
        "convex-blue": "#8D2676",
        "convex-blue-dark": "#7a2268",
      },
      spacing: {
        section: "2rem",
        container: "1rem",
      },
      borderRadius: {
        container: "0.75rem",
      },
    },
  },
  plugins: [],
};
