/** @type {import('tailwindcss').Config} */
const includeGeneratedPreviewSafelist = process.env.TAILWIND_INCLUDE_GENERATED_PREVIEW_CLASSES === 'true';

module.exports = {
  darkMode: 'class', // Use class strategy for dark mode
  content: ['./src/**/*.{html,ts}'],
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        site: {
          background: 'var(--site-bg)',
          panel: 'var(--site-panel)',
          section: 'var(--site-section)',
          border: 'var(--site-border)',
          accent: 'var(--site-accent)',
          heading: 'var(--site-heading)',
          text: 'var(--site-text)',
          muted: 'var(--site-muted)',
        },
      },
      borderRadius: {
        'site-control': 'var(--site-radius-control, 0.5rem)',
        'site-surface': 'var(--site-radius-surface, 0.75rem)',
        'site-overlay': 'var(--site-radius-overlay, 1rem)',
      },
      boxShadow: {
        'site-surface': 'var(--site-shadow-surface, 0 1px 2px rgb(0 0 0 / 0.12))',
        'site-surface-hover': 'var(--site-shadow-surface-hover, 0 10px 30px rgb(0 0 0 / 0.18))',
        'site-overlay': 'var(--site-shadow-overlay, 0 24px 72px rgb(0 0 0 / 0.35))',
      },
      maxWidth: {
        'site': 'var(--site-content-max, 80rem)',
        'site-wide': 'var(--site-content-wide, 72rem)',
        'site-reading': 'var(--site-content-reading, 64rem)',
        'site-prose': 'var(--site-content-prose, 56rem)',
      },
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
