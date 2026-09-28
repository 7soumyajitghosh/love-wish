/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#0a0a24',
        burgundy: '#3b1f5e',
        crimson: '#ef5d92',
        rosepink: '#ffc9a3',
        warmwhite: '#fff8ee',
        gold: '#e8b26a',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        script: ['Pinyon Script', 'cursive'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
