// Local proxy server — boshqa saytlar uchun CORS bypass
// Ishga tushirish: node proxy-server.js

const http = require('http')
const https = require('https')

const PORT = 5175

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const params = new URL(req.url, `http://localhost:${PORT}`).searchParams
  const targetUrl = params.get('url')

  if (!targetUrl) {
    res.writeHead(400)
    res.end('missing ?url= parameter')
    return
  }

  console.log('Fetching:', targetUrl)

  const lib = targetUrl.startsWith('https') ? https : http
  lib.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
    },
  }, (r) => {
    // redirect larni follow qilamiz
    if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location) {
      lib.get(r.headers.location, {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }
      }, (r2) => {
        let data = ''
        r2.on('data', c => data += c)
        r2.on('end', () => {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.writeHead(200)
          res.end(data)
        })
      }).on('error', e => { res.writeHead(500); res.end(e.message) })
      return
    }

    let data = ''
    r.on('data', c => data += c)
    r.on('end', () => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.writeHead(200)
      res.end(data)
    })
  }).on('error', e => {
    console.error('Error:', e.message)
    res.writeHead(500)
    res.end(e.message)
  })
}).listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`)
})
