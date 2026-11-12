/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        xrar: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d',
          accent: '#06b6d4',
          dark: '#090d16',
          panel: '#0f172a',
          border: '#1e293b',
        }
      }
    },
  },
  plugins: [],
}
