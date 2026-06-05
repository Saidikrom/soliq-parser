const https = require('https')
const http = require('http')

exports.handler = async (event) => {
  const targetPath = event.path.replace('/.netlify/functions/proxy', '') || '/'
  const query = event.rawQuery ? `?${event.rawQuery}` : ''
  const targetUrl = `https://ofd.soliq.uz${targetPath}${query}`

  return new Promise((resolve) => {
    const lib = targetUrl.startsWith('https') ? https : http
    const req = lib.get(
      targetUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
        },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
            body: data,
          })
        })
      }
    )
    req.on('error', (err) => {
      resolve({ statusCode: 500, body: err.message })
    })
  })
}
