// Cloudflare Worker — ofd.soliq.uz proxy
// Deploy: https://workers.cloudflare.com (paste this code)

export default {
  async fetch(request) {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    // /check?t=...&r=...  qismini olamiz
    const targetUrl = `https://ofd.soliq.uz${url.pathname}${url.search}`

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
      },
    })

    const body = await res.text()

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
