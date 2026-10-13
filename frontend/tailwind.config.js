/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1120',
        card: '#0F172A',
        secondary: '#1E293B',
        accent: {
          DEFAULT: '#25D366',
          hover: '#20BA5A',
          dark: '#128C7E',
        },
        slate: {
          850: '#151F32',
          900: '#0F172A',
          950: '#0B1120',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
