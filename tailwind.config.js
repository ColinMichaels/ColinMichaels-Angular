const legacyTheme = require('./src/styles/tailwind-v3-theme.json');
/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: 'class', // Use class strategy for dark mode
  content: ['./src/**/*.{html,ts}'],
  theme: {
    ...legacyTheme,
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
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
