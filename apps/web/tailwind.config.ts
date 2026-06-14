/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#111111',
          active: '#242424',
        },
        brand: {
          accent: '#3b82f6',
        },
        canvas: '#ffffff',
        ink: '#111111',
        body: '#374151',
        muted: '#6b7280',
        'muted-soft': '#898989',
        navy: '#111111',
        background: '#ffffff',
        border: '#e5e7eb',
        hairline: '#e5e7eb',
        surface: {
          soft: '#f8f9fa',
          card: '#f5f5f5',
          strong: '#e5e7eb',
          dark: '#101010',
          elevated: '#1a1a1a',
        },
        emergency: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#b91c1c',
        },
        safe: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#047857',
        },
        warning: '#f59e0b',
        ai: '#3b82f6',
        badge: {
          orange: '#fb923c',
          pink: '#ec4899',
          violet: '#8b5cf6',
          emerald: '#34d399',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['64px', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.04em' }],
        'hero-mobile': ['32px', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.04em' }],
        section: ['48px', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.03em' }],
        subsection: ['36px', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.025em' }],
        cta: ['28px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.02em' }],
        card: ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      animation: {
        'sos-pulse': 'sosPulse 1.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.45s ease-out',
      },
      keyframes: {
        sosPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.06)', opacity: '0.92' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.05)',
        card: '0 4px 12px rgba(0,0,0,0.08)',
        primary: '0 12px 24px rgba(17,17,17,0.14)',
        emergency: '0 0 30px rgba(239,68,68,0.28)',
      },
      maxWidth: {
        marketing: '1200px',
      },
    },
  },
  plugins: [],
};
