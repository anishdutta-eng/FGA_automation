/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"DM Sans"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          50: '#f7f7f9',
          100: '#eeeef1',
          200: '#e0e0e5',
          300: '#c1c1ca',
          400: '#8e8e9a',
          500: '#63636e',
          600: '#494952',
          700: '#37373e',
          800: '#232329',
          900: '#161619',
          950: '#0a0a0c',
        },
        risk: {
          good: '#16a34a',
          goodSoft: '#dcfce7',
          low: '#ca8a04',
          lowSoft: '#fef9c3',
          medium: '#ea580c',
          mediumSoft: '#ffedd5',
          high: '#dc2626',
          highSoft: '#fee2e2',
          waived: '#2563eb',
          waivedSoft: '#dbeafe',
          discuss: '#475569',
          discussSoft: '#e2e8f0',
        },
        brand: {
          50: '#f5f3fe',
          100: '#ebe6fc',
          200: '#dccff9',
          300: '#bfa9f2',
          400: '#9f7ce8',
          500: '#8457dc',
          600: '#6f42cb',
          700: '#5c34aa',
          800: '#4c2d8a',
          900: '#40286f',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(24, 20, 40, 0.04), 0 10px 28px -14px rgba(24, 20, 40, 0.14)',
        lift: '0 24px 52px -20px rgba(24, 20, 40, 0.28)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
