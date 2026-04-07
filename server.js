import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

// Serve static production build
app.use(express.static(join(__dirname, 'dist')))

// Proxy Yahoo Finance API (middleware-style to avoid Express v5 wildcard issues)
app.use('/api/yahoo', async (req, res, next) => {
  const yahooPath = req.path || '/'
  const qs = new URLSearchParams(req.query).toString()
  const url = `https://query1.finance.yahoo.com${yahooPath}${qs ? '?' + qs : ''}`
  
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    })
    const data = await resp.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// SPA fallback
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const PORT = 5178
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TSLA Tracker running at http://0.0.0.0:${PORT}`)
})
