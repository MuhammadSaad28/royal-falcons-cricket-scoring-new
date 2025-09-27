/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          green: '#10B981',
          blue: '#3B82F6',
          orange: '#F97316',
        }
      },
      fontFamily: {
        cricket: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}