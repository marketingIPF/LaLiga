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
        '6xl': '3rem',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      backdropSaturate: {
        175: '1.75',
      },
      boxShadow: {
        // Liquid Glass — sombras más difusas y por capas
        glass: '0 1px 0 0 rgba(255,255,255,0.5) inset, 0 8px 32px 0 rgba(0,0,0,0.08), 0 2px 8px 0 rgba(0,0,0,0.04)',
        'glass-dark': '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 8px 32px 0 rgba(0,0,0,0.5), 0 2px 8px 0 rgba(0,0,0,0.3)',
        'glass-lifted': '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 24px 48px -12px rgba(0,0,0,0.18), 0 8px 16px -4px rgba(0,0,0,0.08)',
        'glass-lifted-dark': '0 1px 0 0 rgba(255,255,255,0.1) inset, 0 24px 48px -12px rgba(0,0,0,0.6), 0 8px 16px -4px rgba(0,0,0,0.4)',
        // Orange glow para CTAs primarios
        'orange-glow': '0 1px 0 0 rgba(255,255,255,0.3) inset, 0 10px 30px -5px rgba(207,115,27,0.45), 0 4px 12px -2px rgba(207,115,27,0.3)',
        'orange-glow-sm': '0 1px 0 0 rgba(255,255,255,0.25) inset, 0 6px 16px -2px rgba(207,115,27,0.35)',
        soft: '0 2px 12px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-orange': 'pulseOrange 2s ease-in-out infinite',
        'spring-in': 'springIn 0.5s cubic-bezier(0.16, 1.4, 0.5, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        springIn: {
          '0%': { transform: 'scale(0.92)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(207, 115, 27, 0.5)' },
          '50%': { boxShadow: '0 0 0 16px rgba(207, 115, 27, 0)' },
        },
      },
      transitionTimingFunction: {
        'ios-spring': 'cubic-bezier(0.16, 1.4, 0.5, 1)',
        'ios-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
