/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}', './src/app/components/**/*.html', './src/app/components/**/*.ts'],
  mode: 'jit',
  theme: {
    extend: {
      boxShadow: ['hover'], // Ensure hover state for shadow is added
      scale: ['hover'], // Ensure hover state scaling is supported
    },
  },
  safelist: process.env.NODE_ENV === 'production'
    ? [
        // Production-specific safelist
      {
        pattern: /(bg|text|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(300|400|500|600|700|800|900)/,
        variants: ['hover', 'focus', 'active'],
      },
      ]
    : [
        // Development-specific safelist
        {
          pattern: /(bg|text|from|to|via)-(red|orange|green|blue|purple|slate|neutral|zinc|yellow|teal)-(100|200|500|800|900)/,

          variants: ['hover', 'focus', 'active'],
        },
        {
          pattern: /bg-gradient-to-(r|l|t|b|tl|tr|bl|br)/,
        },
      ],
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
