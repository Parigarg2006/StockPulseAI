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
          card: '#131722',    // TradingView panel grey-black
          border: '#2A2E39',  // Subtle TradingView border
          accent: '#2962FF',  // TradingView Blue
          up: '#089981',      // TradingView Green
          down: '#F23645',    // TradingView Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
