/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#050308',
        burgundy: '#4a0e1e',
        crimson: '#c9184a',
        rosepink: '#ff8fa3',
        warmwhite: '#fff5ec',
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
