/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#080b12',
        card: {
          DEFAULT: 'rgba(14, 18, 27, 0.85)',
          hover: 'rgba(18, 24, 38, 0.9)'
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(255, 255, 255, 0.12)'
        },
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b'
        },
        accent: {
          cyan: '#22d3ee',
          teal: '#2dd4bf',
          green: '#34d399',
          amber: '#fbbf24',
          red: '#f87171'
        }
      },
      animation: {
        'pulse-glow':  'pulse-glow 2s ease-in-out infinite',
        'key-press':   'key-press 150ms ease-out',
        'slide-in':    'slide-in 200ms ease-out',
        'fade-in':     'fade-in 300ms ease-out',
        'spin-slow':   'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
          '50%':      { boxShadow: '0 0 24px 4px rgba(99, 102, 241, 0.25)' }
        },
        'key-press': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' }
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem'
      }
    }
  },
  plugins: []
}
