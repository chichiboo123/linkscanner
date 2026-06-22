import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // netlify dev 가 8888에서 함수를 프록시해 주므로, 로컬 단독 실행 시에도 동작하도록 설정
    proxy: {
      '/api': 'http://localhost:8888',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
