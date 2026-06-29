/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#000000',      // Pure pitch black
          card: '#131313',    // Neutral gray-black
          border: 'rgba(255, 255, 255, 0.08)', // Thin white hairline border
          accent: '#2962FF',  // TradingView Blue
          up: '#089981',      // TradingView Green
          down: '#F23645',    // TradingView Red
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['-apple-system', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'] // Override to match standard font-family
      }
    },
  },
  plugins: [],
}
