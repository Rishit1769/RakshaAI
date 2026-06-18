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
        accent: 'var(--color-primary)',
        'accent-secondary': 'var(--color-primary-secondary)',
        emergency: 'var(--color-emergency)',
        safe: 'var(--color-safe)',
        'safe-dark': 'var(--color-safe-dark)',
        warning: 'var(--color-warning)',
        'badge-orange': 'var(--color-warning-strong)',
        ai: 'var(--color-ai)',
        background: 'var(--color-background)',
        canvas: 'var(--color-canvas)',
        border: 'var(--color-border)',
        hairline: 'var(--color-hairline)',
        navy: 'var(--color-navy)',
        ink: 'var(--color-ink)',
        body: 'var(--color-body)',
        muted: 'var(--color-muted)',
        'muted-soft': 'var(--color-muted-soft)',
        foreground: 'var(--color-foreground)',
        card: 'var(--color-card)',
        ring: 'var(--color-ring)',
        surface: {
          card: 'var(--color-surface-card)',
          muted: 'var(--color-surface-muted)',
          soft: 'var(--color-surface-soft)',
          inverted: 'var(--color-surface-inverted)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-calistoga)', 'Calistoga', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
        card: 'var(--shadow-md)',
        panel: 'var(--shadow-lg)',
        accent: 'var(--shadow-accent)',
        'accent-lg': 'var(--shadow-accent-lg)',
        emergency: 'var(--shadow-emergency)',
      },
      maxWidth: {
        marketing: '72rem',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.72', transform: 'scale(1.28)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
