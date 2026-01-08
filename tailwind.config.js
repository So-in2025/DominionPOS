
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      },
      keyframes: {
        'fade-in-out': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'list-item-in': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'flash-total-price': {
          'from': { 
            color: '#D4AF37',
            transform: 'scale(1.1)' 
          },
          'to': { 
            color: 'inherit',
            transform: 'scale(1)'
          },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.8)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        }
      },
      animation: {
        'fade-in-out': 'fade-in-out 0.5s ease-out forwards',
        'modal-in': 'modal-in 0.2s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite linear',
        'list-item-in': 'list-item-in 0.3s ease-out forwards',
        'flash-total-price': 'flash-total-price 0.5s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s infinite',
        'shake': 'shake 0.3s ease-in-out',
      },
      colors: {
        'dp-dark': '#000000',
        'dp-gold': '#D4AF37',
        'dp-charcoal': '#1f2937', 
        'dp-light-gray': '#d1d5db',
        'dp-light': '#FFFFFF',
        'dp-blue': '#0056B3',
        'dp-soft-gray': '#f3f4f6', 
        'dp-dark-gray': '#111827'
      }
    }
  },
  plugins: [],
}
