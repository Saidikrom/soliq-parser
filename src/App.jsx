import { useState } from 'react'

function buildFetchPath(url) {
  try {
    const u = new URL(url)
    if (u.hostname === 'ofd.soliq.uz') {
      return { path: `/proxy${u.pathname}${u.search}`, wrapped: false }
    }
    return { path: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, wrapped: true }
  } catch {
    return null
  }
}

function extractData(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  ;['script', 'style', 'noscript', 'svg'].forEach(tag =>
    doc.querySelectorAll(tag).forEach(el => el.remove())
  )

  const base = new URL(url)

  const links = [...doc.querySelectorAll('a[href]')]
    .map(a => { try { return new URL(a.getAttribute('href'), base).href } catch { return null } })
    .filter(h => h && h.startsWith('http'))

  const images = [...doc.querySelectorAll('img')]
    .map(img => ({
      src: (() => { try { return new URL(img.getAttribute('src') || '', base).href } catch { return '' } })(),
      alt: img.alt || '',
    }))
    .filter(i => i.src && i.src.startsWith('http'))

  const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({
    level: h.tagName.toLowerCase(),
    text: h.innerText.trim(),
  })).filter(h => h.text)

  const meta = {}
  doc.querySelectorAll('meta').forEach(m => {
    const name = m.getAttribute('name') || m.getAttribute('property')
    const content = m.getAttribute('content')
    if (name && content) meta[name] = content
  })

  const text = doc.body.innerText
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')

  const emails = [...new Set(text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])]

  return {
    url,
    title: doc.querySelector('title')?.innerText || '',
    meta,
    headings,
    text,
    links: [...new Set(links)],
    images,
    emails,
  }
}

// Textdan mahsulotlarni ajratib oladi.
// Tuzilma: "Nomi\nSoni\nNarxi" bloklar "Naqd pul" yoki "Bank kartalari" gacha.
// "46,990.00" → 46990  (minglik ajratuvchi vergul, o'nlik nuqta)
function parseNum(str) {
  return parseFloat(String(str).replace(/\s/g, '').replace(/,(?=\d{3}(\.|$))/g, ''))
}

function parseProducts(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const headerIdx = lines.findIndex(l => l === 'Nomi' || l === 'Nomi Soni Narxi')
  if (headerIdx === -1) return []

  const stopWords = ['Naqd pul', 'Bank kartalari', "Jami to`lov:", "Jami to'lov:"]
  const stopIdx = lines.findIndex((l, i) => i > headerIdx && stopWords.some(w => l.startsWith(w)))
  const block = lines.slice(headerIdx + 3, stopIdx === -1 ? undefined : stopIdx)

  const skipWords = ['QQS', 'Chegirma', 'Shtrix', 'MXIK', "O'lchov", 'Markirovka', 'Komitent']
  const products = []
  let i = 0
  while (i < block.length) {
    const name = block[i]
    const qty  = parseNum(block[i + 1] || '')
    const price = parseNum(block[i + 2] || '')

    if (!isNaN(qty) && !isNaN(price) && price > 1) {
      products.push({ name, qty, price, total: qty * price })
      i += 3
      while (i < block.length && skipWords.some(w => block[i].startsWith(w))) i++
    } else {
      i++
    }
  }
  return products
}

// Textdan sana va jami to'lovni oladi
function parseMeta(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4},\s*\d{2}:\d{2})/)
  const date = dateMatch ? dateMatch[1] : null

  // "Jami to`lov:" bir qatorda summa bo'lishi yoki keyingi qatorda bo'lishi mumkin
  const totalIdx = lines.findIndex(l => l.startsWith("Jami to`lov:") || l.startsWith("Jami to'lov:"))
  let total = null
  if (totalIdx !== -1) {
    const sameLine = lines[totalIdx].match(/([\d\s,]+\.\d{2})$/)
    if (sameLine) {
      total = sameLine[1].trim()
    } else if (lines[totalIdx + 1]) {
      total = lines[totalIdx + 1].trim()
    }
  }

  const shopLine = lines.find(l => l.includes('MAS`ULIYATI') || l.includes('JAMIYAT') || l.includes('MCHJ') || l.includes('XORIJIY'))
  const shop = shopLine || null

  return { date, total, shop }
}

const MODES = ['summary', 'products', 'text', 'links', 'images', 'emails', 'json']

export default function App() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState('summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  async function handleParse() {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const info = buildFetchPath(url.trim())
      if (!info) throw new Error("Noto'g'ri URL")

      const res = await fetch(info.path)
      if (!res.ok) throw new Error(`HTTP xato: ${res.status}`)

      let html = await res.text()
      if (info.wrapped) {
        html = JSON.parse(html).contents
      }

      setData(extractData(html, url.trim()))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function renderOutput() {
    if (!data) return null
    if (mode === 'json') return <pre style={s.pre}>{JSON.stringify(data, null, 2)}</pre>
    if (mode === 'text') return <pre style={s.pre}>{data.text}</pre>
    if (mode === 'products') {
      const products = parseProducts(data.text)
      const { date, total, shop } = parseMeta(data.text)
      const fmt = n => n.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
      return (
        <div>
          {date && (
            <div style={s.receiptDate}>{date}</div>
          )}
          {shop && <div style={s.receiptShop}>{shop}</div>}
          <table style={s.prodTable}>
            <thead>
              <tr>
                <th style={{...s.th, textAlign:'left'}}>Mahsulot</th>
                <th style={s.th}>Soni</th>
                <th style={s.th}>Narxi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0
                ? <tr><td colSpan={3} style={{padding:16,color:'#888',textAlign:'center'}}>Mahsulot topilmadi</td></tr>
                : products.map((p, i) => (
                  <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.tdName}>{p.name}</td>
                    <td style={s.tdNum}>{p.qty}</td>
                    <td style={s.tdNum}>{fmt(p.price)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          {total && (
            <div style={s.totalRow}>
              Jami to'lov: <span style={s.totalAmount}>{total} so'm</span>
            </div>
          )}
        </div>
      )
    }
    if (mode === 'links') return (
      <div>{data.links.map((l, i) =>
        <div key={i}><a href={l} target="_blank" rel="noreferrer" style={s.link}>{l}</a></div>
      )}</div>
    )
    if (mode === 'images') return (
      <div style={s.grid}>{data.images.map((img, i) =>
        <div key={i} style={s.imgCard}>
          <img src={img.src} alt={img.alt} style={s.img} onError={e => e.target.style.display='none'} />
          <small style={{wordBreak:'break-all'}}>{img.alt || img.src}</small>
        </div>
      )}</div>
    )
    if (mode === 'emails') return (
      <div>{data.emails.length
        ? data.emails.map((e, i) => <span key={i} style={s.badge}>{e}</span>)
        : <p style={{color:'#888'}}>Email topilmadi</p>}
      </div>
    )
    return (
      <table style={s.table}><tbody>
        <Row label="URL"         value={<a href={data.url} target="_blank" rel="noreferrer" style={s.link}>{data.url}</a>} />
        <Row label="Title"       value={data.title || '—'} />
        <Row label="Description" value={data.meta['description'] || data.meta['og:description'] || '—'} />
        <Row label="Links"       value={data.links.length} />
        <Row label="Images"      value={data.images.length} />
        <Row label="Emails"      value={data.emails.join(', ') || '—'} />
        <Row label="Headings"    value={
          <ul style={{margin:0,paddingLeft:16}}>
            {data.headings.slice(0,10).map((h,i) =>
              <li key={i}><b>{h.level.toUpperCase()}</b>: {h.text}</li>)}
          </ul>
        } />
      </tbody></table>
    )
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>Web Parser</h1>
      <p style={s.subtitle}>Har qanday URL dan ma'lumot olish</p>

      <div style={s.inputRow}>
        <input
          style={s.input}
          type="text"
          placeholder='https://ofd.soliq.uz/check?t=...&r=...&c=...&s=...'
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleParse()}
        />
        <button style={s.btn} onClick={handleParse} disabled={loading}>
          {loading ? 'Yuklanmoqda...' : 'Parse'}
        </button>
      </div>

      <div style={s.modeRow}>
        {MODES.map(m => (
          <button key={m}
            style={{...s.modeBtn, ...(mode===m ? s.modeBtnActive : {})}}
            onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>

      {error  && <div style={s.error}>{error}</div>}
      {loading && <div style={s.loading}>Sahifa yuklanmoqda...</div>}
      {data   && <div style={s.output}>{renderOutput()}</div>}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <tr>
      <td style={s.tdLabel}>{label}</td>
      <td style={s.tdValue}>{value}</td>
    </tr>
  )
}

const s = {
  container: { maxWidth:900, margin:'0 auto', padding:'32px 16px', fontFamily:'system-ui,sans-serif' },
  title:     { fontSize:28, fontWeight:700, marginBottom:4 },
  subtitle:  { color:'#666', marginBottom:24 },
  inputRow:  { display:'flex', gap:8, marginBottom:12 },
  input:     { flex:1, padding:'10px 14px', fontSize:14, border:'1px solid #ddd', borderRadius:8, outline:'none' },
  btn:       { padding:'10px 24px', background:'#0070f3', color:'#fff', border:'none', borderRadius:8, fontSize:14, cursor:'pointer', fontWeight:600 },
  modeRow:   { display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 },
  modeBtn:   { padding:'5px 14px', border:'1px solid #ddd', borderRadius:20, background:'#fff', cursor:'pointer', fontSize:13 },
  modeBtnActive: { background:'#0070f3', color:'#fff', borderColor:'#0070f3' },
  error:     { background:'#fff0f0', border:'1px solid #fca5a5', borderRadius:8, padding:12, color:'#dc2626', marginBottom:16 },
  loading:   { color:'#666', marginBottom:16 },
  output:    { background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, padding:20 },
  pre:       { whiteSpace:'pre-wrap', wordBreak:'break-all', fontSize:13, margin:0 },
  link:      { color:'#0070f3', textDecoration:'none' },
  table:     { width:'100%', borderCollapse:'collapse' },
  tdLabel:   { padding:'8px 12px 8px 0', fontWeight:600, color:'#555', verticalAlign:'top', whiteSpace:'nowrap', width:120 },
  tdValue:   { padding:'8px 0', wordBreak:'break-word' },
  badge:     { display:'inline-block', background:'#e0f2fe', color:'#0369a1', padding:'3px 10px', borderRadius:20, margin:'3px', fontSize:13 },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 },
  imgCard:   { textAlign:'center', fontSize:11, color:'#666' },
  img:       { width:'100%', height:100, objectFit:'cover', borderRadius:6, marginBottom:4 },
  // products mode
  receiptDate:  { textAlign:'center', fontSize:18, fontWeight:700, marginBottom:6, letterSpacing:1 },
  receiptShop:  { textAlign:'center', fontSize:13, color:'#555', marginBottom:16 },
  prodTable:    { width:'100%', borderCollapse:'collapse', fontSize:14 },
  th:           { padding:'8px 12px', background:'#0070f3', color:'#fff', fontWeight:600, textAlign:'right' },
  trEven:       { background:'#f0f7ff' },
  tdName:       { padding:'9px 12px', borderBottom:'1px solid #eee', verticalAlign:'middle' },
  tdNum:        { padding:'9px 12px', borderBottom:'1px solid #eee', textAlign:'right', whiteSpace:'nowrap', verticalAlign:'middle' },
  totalRow:     { marginTop:16, textAlign:'right', fontSize:15, color:'#444', paddingTop:12, borderTop:'2px solid #0070f3' },
  totalAmount:  { fontSize:20, fontWeight:700, color:'#0070f3', marginLeft:8 },
}
