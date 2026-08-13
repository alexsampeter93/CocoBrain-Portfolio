/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5E6D3',
        coco: {
          dark: '#2B211C',
          mid: '#6B4530',
          light: '#C99B6E',
        },
        brain: {
          pink: '#F2939E',
          glow: '#FF6B85',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
