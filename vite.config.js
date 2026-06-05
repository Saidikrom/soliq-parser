import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ofd.soliq.uz uchun
      '/proxy': {
        target: 'https://ofd.soliq.uz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
        secure: true,
      },
      // Boshqa har qanday sayt uchun — local proxy server (port 5175)
      '/ext': {
        target: 'http://localhost:5175',
        changeOrigin: true,
      },
    },
  },
})
