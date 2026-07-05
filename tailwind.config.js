/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F5F0E8',
        ink: '#1A1A2E',
        'ink-light': '#4A4A6A',
        'ink-muted': '#9A9AB0',
        drift: '#5B5EA6',
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Georgia"', 'serif'],
        hand: ['"LXGW WenKai TC"', '"Noto Serif TC"', 'cursive'],
      },
    },
  },
  plugins: [],
}
