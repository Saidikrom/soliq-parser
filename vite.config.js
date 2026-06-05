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
      // Boshqa saytlar uchun: /ext?url=https://topkadr.uz
      '/ext': {
        target: 'http://localhost:5174',
        changeOrigin: false,
        bypass(req, res) {
          const targetUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
          if (!targetUrl) { res.statusCode = 400; res.end('missing url'); return false }
          const http = require(targetUrl.startsWith('https') ? 'https' : 'http')
          http.get(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 Chrome/124',
              'Accept': 'text/html',
            }
          }, (r) => {
            let data = ''
            r.on('data', c => data += c)
            r.on('end', () => {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(data)
            })
          }).on('error', (e) => { res.statusCode = 500; res.end(e.message) })
          return false
        }
      },
    },
  },
})
