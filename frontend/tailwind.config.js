/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        webapple: {
          answered: '#2e7d32', // Green (NTA Answered)
          notAnswered: '#c62828', // Red (NTA Not Answered)
          marked: '#5e35b1', // Violet (NTA Marked for Review)
          markedAnswered: '#311b92', // Dark Violet with small green badge (NTA Answered & Marked for Review)
          notVisited: '#ffffff', // White (NTA Not Visited)
        }
      }
    },
  },
  plugins: [],
}
