/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
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
          50: '#f7f7f8',
          100: '#ededf0',
          200: '#dcdce1',
          300: '#b8b9c2',
          400: '#8a8c99',
          500: '#616370',
          600: '#4a4c57',
          700: '#3a3b45',
          800: '#26272e',
          900: '#111114',
          950: '#08080a',
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
          50: '#eef3ff',
          100: '#dae5ff',
          200: '#bcd1ff',
          300: '#8eb2ff',
          400: '#5b87fb',
          500: '#3563f0',
          600: '#2450e6',
          700: '#1c3fc4',
          800: '#1c399e',
          900: '#1c357d',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 18, 24, 0.03), 0 4px 16px -8px rgba(16, 18, 24, 0.10)',
        lift: '0 18px 40px -16px rgba(16, 18, 24, 0.22)',
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
