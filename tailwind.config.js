/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // Multiply default sizes by 1.2
        'xs': ['0.9rem', { lineHeight: '1.2rem' }],
        'sm': ['1.05rem', { lineHeight: '1.5rem' }],
        'base': ['1.2rem', { lineHeight: '1.8rem' }],
        'lg': ['1.35rem', { lineHeight: '2rem' }],
        'xl': ['1.5rem', { lineHeight: '2.2rem' }],
        '2xl': ['1.8rem', { lineHeight: '2.5rem' }],
      },
    },
  },
  plugins: [],
}