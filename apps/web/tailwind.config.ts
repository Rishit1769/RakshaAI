/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        emergency: 'var(--color-emergency)',
        safe: 'var(--color-safe)',
        warning: 'var(--color-warning)',
        ai: 'var(--color-ai)',
        background: 'var(--color-background)',
        canvas: 'var(--color-canvas)',
        border: 'var(--color-border)',
        navy: 'var(--color-navy)',
        ink: 'var(--color-ink)',
        body: 'var(--color-body)',
        muted: 'var(--color-muted)',
        surface: {
          card: 'var(--color-surface-card)',
          muted: 'var(--color-surface-muted)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
        card: 'var(--shadow-md)',
        emergency: 'var(--shadow-emergency)',
      },
      maxWidth: {
        marketing: '72rem',
      },
    },
  },
  plugins: [],
};
