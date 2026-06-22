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
        // KRDS 기준 주조색: 절제된 단일 프라이머리 + 중립 그레이
        primary: {
          DEFAULT: '#256EF4', // KRDS 블루
          50: '#EDF3FE',
          100: '#D6E4FD',
          600: '#1F5FD6',
          700: '#1A4FB3',
        },
        success: '#1E8E3E',
        warn: '#B45309',
        danger: '#D93B3B',
        // 보조 파스텔(아주 옅게만, 포인트용)
        pastel: {
          blue: '#A7C7E7',
          'blue-soft': '#EDF3FE',
          green: '#B5E3C5',
          'green-soft': '#E6F6EC',
          pink: '#F7C8D9',
          'pink-soft': '#FCEAF1',
          yellow: '#FCE9A8',
          'yellow-soft': '#FDF7E0',
        },
        // 중립 텍스트/보더 (KRDS 그레이 스케일 근사)
        ink: {
          900: '#1B1D1F',
          700: '#3D4044',
          500: '#6D7178',
          300: '#B1B5BB',
          200: '#D7DAE0',
          100: '#EBEDF0',
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
