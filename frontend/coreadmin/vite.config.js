import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/static/coreadmin/',
  plugins: [react()],
  build: {
    outDir: '../../staticfiles/coreadmin',
  },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
