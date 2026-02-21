/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fs-dark': '#24303c',
        'fs-gold': '#b8944d',
        'terra-dark': '#1a252f',
        'terra-gray': '#e5e7eb',
      },
      fontFamily: {
        'serif': ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}