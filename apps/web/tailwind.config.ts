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
        // ─── RakshaAI Color System (from UIUX.txt) ──────────────
        primary: {
          DEFAULT: '#FF6B2D',
          50:  '#FFF4EF',
          100: '#FFE4D4',
          200: '#FFCAAA',
          300: '#FFAB7A',
          400: '#FF8A4D',
          500: '#FF6B2D',
          600: '#E85213',
          700: '#C23F0E',
          800: '#9C3110',
          900: '#7A2810',
        },
        emergency: {
          DEFAULT: '#D72638',
          light:   '#FF4D5E',
          dark:    '#A81828',
        },
        safe: {
          DEFAULT: '#4CAF50',
          light:   '#81C784',
          dark:    '#388E3C',
        },
        navy: {
          DEFAULT: '#0B1026',
          light:   '#1A2240',
          dark:    '#060B18',
        },
        ai: '#7B61FF',
        warning: '#FFB020',
        background: '#F7F8FC',
        border: '#E5E7EB',
        muted: '#7E8794',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      fontSize: {
        hero:    ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        section: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        card:    ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        body:    ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        small:   ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      animation: {
        'sos-pulse': 'sosPulse 1.5s ease-in-out infinite',
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
      },
      keyframes: {
        sosPulse: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '1' },
          '50%':       { transform: 'scale(1.08)', opacity: '0.9' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft:      '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        emergency: '0 0 30px rgba(215,38,56,0.4)',
        primary:   '0 4px 20px rgba(255,107,45,0.3)',
      },
    },
  },
  plugins: [],
};
