/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      boxShadow: ['hover'], // Ensure hover state for shadow is added
      scale: ['hover'], // Ensure hover state scaling is supported
    },

  },
  plugins: [],
}
