exports.handler = async (event) => {
  try {
    const targetPath = event.path.replace('/.netlify/functions/proxy', '') || '/'
    const query = event.rawQuery ? `?${event.rawQuery}` : ''
    const targetUrl = `https://ofd.soliq.uz${targetPath}${query}`

    const res = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
      },
    })

    const body = await res.text()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body,
    }
  } catch (err) {
    return { statusCode: 500, body: err.message }
  }
}
