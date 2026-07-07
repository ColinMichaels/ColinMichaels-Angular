/** @type {import('tailwindcss').Config} */
const includeGeneratedPreviewSafelist = process.env.TAILWIND_INCLUDE_GENERATED_PREVIEW_CLASSES === 'true';

module.exports = {
  darkMode: 'class', // Use class strategy for dark mode
  content: ['./src/**/*.{html,ts}', './src/app/components/**/*.html', './src/app/components/**/*.ts'],
  mode: 'jit',
  theme: {
    extend: {
      boxShadow: ['hover'], // Ensure hover state for shadow is added
      scale: ['hover'], // Ensure hover state scaling is supported
    },
  },
  safelist: includeGeneratedPreviewSafelist
    ? [
        // Development-specific safelist
        {
          pattern: /(bg|text|from|to|via)-(red|orange|green|blue|purple|slate|neutral|zinc|yellow|teal)-(100|200|500|800|900)/,

          variants: ['hover', 'focus', 'active'],
        },
        {
          pattern: /bg-gradient-to-(r|l|t|b|tl|tr|bl|br)/,
        },
      ]
    : [],
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
