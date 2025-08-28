/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4a3f35',
        'brand-secondary': '#a28b7a',
        'brand-accent': '#eaddcf',
        'brand-light': '#f5f0e1',
        'status-ok': '#22c55e',
        'status-warning': '#f97316',
        'status-error': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    }
  },
  plugins: [],
}
