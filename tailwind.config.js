/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Pretendard GOV 우선 적용
        sans: [
          'Pretendard GOV',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        // 파스텔 메인 팔레트 (블루/그린/핑크/옐로우)
        pastel: {
          blue: '#A7C7E7',
          'blue-soft': '#E3F0FB',
          green: '#B5E3C5',
          'green-soft': '#E6F6EC',
          pink: '#F7C8D9',
          'pink-soft': '#FCEAF1',
          yellow: '#FCE9A8',
          'yellow-soft': '#FDF7E0',
        },
        // KRDS 풍 중립 텍스트/보더
        ink: {
          900: '#1B1D1F',
          700: '#3D4044',
          500: '#6D7178',
          300: '#B1B5BB',
        },
      },
      boxShadow: {
        soft: '0 4px 20px rgba(120, 140, 170, 0.12)',
        card: '0 2px 12px rgba(120, 140, 170, 0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
