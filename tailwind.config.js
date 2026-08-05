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
        border: "#E1DFDD",       // Neutral Gray
        input: "#EDEBE9",
        ring: "#00A4EF",        // Microsoft Blue
        background: "#F3F2F1",   // Fluent Light Gray
        foreground: "#242424",   // Deep Dark Gray text
        primary: {
          DEFAULT: "#00A4EF",    // Microsoft Blue
          hover:   "#0078D4",
          light:   "#E1F5FE",    // Light Ice Blue
          dark:    "#005A9E",
        },
        accent: {
          DEFAULT: "#E1F5FE",   // Light Ice Blue
          light:   "#F3F9FD",
        },
        fluent: {
          gray:    "#F3F2F1",
          border:  "#E1DFDD",
          text:    "#242424",
          blue:    "#00A4EF",
          ice:     "#E1F5FE",
        },
        card: {
          DEFAULT: "#FFFFFF",
          alt:     "#FAF9F8",
        },
      },
      borderRadius: {
        lg: "4px",               // Fluent UI uses 4px border-radius
        md: "4px",
        sm: "2px",
      },
      fontFamily: {
        sans: ["Segoe UI Variable", "Segoe UI", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:         "0 1.6px 3.6px 0 rgba(0, 0, 0, 0.03), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.02)",
        premium:      "0 6.4px 14.4px 0 rgba(0, 0, 0, 0.08), 0 1.2px 3.6px 0 rgba(0, 0, 0, 0.04)",
        "fluent-sm":  "0 2px 8px -2px rgba(0,0,0,0.05)",
        "fluent-md":  "0 8px 16px 0 rgba(0, 0, 0, 0.08)",
        "fluent-lg":  "0 16px 32px 0 rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
}
