exports.handler = async (event) => {
  const targetPath = event.path.replace('/.netlify/functions/proxy', '').replace('/proxy', '') || '/'
  const query = event.rawQuery ? `?${event.rawQuery}` : ''
  const targetUrl = `https://ofd.soliq.uz${targetPath}${query}`

  console.log('TARGET URL:', targetUrl)
  console.log('EVENT PATH:', event.path)
  console.log('RAW QUERY:', event.rawQuery)

  try {
    const res = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
      },
    })

    console.log('RESPONSE STATUS:', res.status)
    console.log('RESPONSE HEADERS:', JSON.stringify([...res.headers.entries()]))

    const body = await res.text()
    console.log('BODY LENGTH:', body.length)
    console.log('BODY PREVIEW:', body.slice(0, 200))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body,
    }
  } catch (err) {
    console.log('ERROR:', err.message)
    console.log('ERROR STACK:', err.stack)
    return { statusCode: 500, body: err.message }
  }
}
