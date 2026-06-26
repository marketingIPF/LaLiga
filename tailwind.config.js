/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        rk: {
          orange: '#cf731b',
          'orange-light': '#e08a3a',
          'orange-dark': '#a55a13',
          cream: '#faf5ee',
          'cream-deep': '#f3ebde',
          ink: '#0a0a0a',
          'ink-soft': '#1a1a1a',
          'ink-card': '#1f1f1f',
        },
        rank: {
          prospectador: '#94a3b8',
          consolidado: '#60a5fa',
          senior: '#a78bfa',
          elite: '#cf731b',
          embajador: '#facc15',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        soft: '0 2px 12px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-orange': 'pulseOrange 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(207, 115, 27, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(207, 115, 27, 0)' },
        },
      },
    },
  },
  plugins: [],
}
