import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import './App.css'

const SYMBOL = 'TSLA'
const YAHOO_BASE = `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}`
const LOCAL_PROXY = `/api/yahoo/v8/finance/chart/${SYMBOL}`

const RANGES = [
  { label: '1D', range: '1d', interval: '5m' },
  { label: '5D', range: '5d', interval: '15m' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '6M', range: '6mo', interval: '1wk' },
  { label: '1Y', range: '1y', interval: '1wk' },
  { label: '5Y', range: '5y', interval: '1mo' },
]

function formatNum(n) {
  if (!n && n !== 0) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatBigNum(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  return `$${formatNum(n)}`
}

function formatTime(ts, rangeLabel) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (rangeLabel === '1D') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  if (rangeLabel === '5D') {
    return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAxisLabel(ts, rangeLabel) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (rangeLabel === '1D') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  if (rangeLabel === '5D') {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }
  if (rangeLabel === '1M' || rangeLabel === '3M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (rangeLabel === '6M' || rangeLabel === '1Y') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function pickAxisTicks(pts, rangeLabel) {
  // Pick ~5-7 evenly spaced ticks
  const count = Math.min(7, pts.length)
  if (count < 2) return []
  const ticks = []
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (pts.length - 1))
    ticks.push({ ...pts[idx], label: formatAxisLabel(pts[idx].ts, rangeLabel) })
  }
  return ticks
}

/* Tesla T logo as SVG */
function TeslaLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 7L16 28" stroke="#E31937" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M5 7C5 7 10 4 16 4C22 4 27 7 27 7" stroke="#E31937" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function InteractiveChart({ closes, timestamps, isUp, rangeLabel }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  if (!closes || closes.length < 2) return null
  const valid = []
  const validTs = []
  closes.forEach((c, i) => {
    if (c != null) {
      valid.push(c)
      validTs.push(timestamps?.[i] || 0)
    }
  })
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const w = 800
  const h = 300
  const pad = 2

  const pts = valid.map((c, i) => ({
    x: (i / (valid.length - 1)) * w,
    y: h - pad - ((c - min) / range) * (h - pad * 2),
    price: c,
    ts: validTs[i],
  }))

  const points = pts.map(p => `${p.x},${p.y}`).join(' ')
  const fillPoints = `0,${h} ${points} ${w},${h}`
  const color = `var(--accent)`
  const fillColor = isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'

  function handleMove(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const relX = (clientX - rect.left) / rect.width
    const idx = Math.round(relX * (pts.length - 1))
    if (idx >= 0 && idx < pts.length) {
      setHover({ idx, pt: pts[idx] })
    }
  }

  function handleLeave() {
    setHover(null)
  }

  return (
    <div style={{ position: 'relative', touchAction: 'none' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: 300, cursor: 'crosshair' }}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#chartGrad)" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Crosshair */}
        {hover && (
          <>
            <line
              x1={hover.pt.x} y1={0} x2={hover.pt.x} y2={h}
              stroke="var(--text-3)" strokeWidth="1" strokeDasharray="4,4"
            />
            <line
              x1={0} y1={hover.pt.y} x2={w} y2={hover.pt.y}
              stroke="var(--text-3)" strokeWidth="1" strokeDasharray="4,4"
            />
            <circle cx={hover.pt.x} cy={hover.pt.y} r="6" fill={color} opacity="0.3" />
            <circle cx={hover.pt.x} cy={hover.pt.y} r="3.5" fill={color} stroke="var(--bg-deep)" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* Timeline axis */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '8px 0 0 0',
        borderTop: '1px solid var(--border)',
        marginTop: 4,
      }}>
        {pickAxisTicks(pts, rangeLabel).map((tick, i) => (
          <span key={i} style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)', whiteSpace: 'nowrap',
          }}>
            {tick.label}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: hover.pt.x > w * 0.7 ? undefined : `${(hover.pt.x / w) * 100}%`,
          right: hover.pt.x > w * 0.7 ? `${100 - (hover.pt.x / w) * 100}%` : undefined,
          transform: hover.pt.x > w * 0.7 ? 'translateX(10%)' : 'translateX(-10%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-hover)',
          borderRadius: 10,
          padding: '8px 14px',
          backdropFilter: 'blur(20px)',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-grotesk)', color: 'var(--accent-light)' }}>
            ${formatNum(hover.pt.price)}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginTop: 2 }}>
            {formatTime(hover.pt.ts, rangeLabel)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState('1mo')
  const [interval_, setInterval_] = useState('1d')
  const [loading, setLoading] = useState(true)
  const [rangeLabel, setRangeLabel] = useState('1M')

  const fetchData = useCallback(async (r, i) => {
    setLoading(true)
    try {
      const params = `range=${r}&interval=${i}`
      const yahooUrl = `${YAHOO_BASE}?${params}`
      const corsUrl = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`
      let res
      try {
        res = await fetch(yahooUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        try {
          res = await fetch(corsUrl)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } catch {
          res = await fetch(`${LOCAL_PROXY}?${params}`)
        }
      }
      const json = await res.json()
      setData(json.chart.result[0])
    } catch (e) {
      console.error('Fetch failed:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(range, interval_)
    const id = window.setInterval(() => fetchData(range, interval_), 60000)
    return () => window.clearInterval(id)
  }, [range, interval_, fetchData])

  const meta = data?.meta || {}
  const closes = data?.indicators?.quote?.[0]?.close || []
  const timestamps = data?.timestamp || []
  const validCloses = closes.filter(c => c != null)
  const price = meta.regularMarketPrice || 0
  const firstClose = validCloses[0] || price
  const lastClose = validCloses[validCloses.length - 1] || price
  const change = lastClose - firstClose
  const changePct = firstClose ? ((change / firstClose) * 100) : 0
  const isUp = change >= 0
  const chartHigh = validCloses.length ? Math.max(...validCloses) : 0
  const chartLow = validCloses.length ? Math.min(...validCloses) : 0

  // Set theme on html element for CSS variable swap
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isUp ? 'up' : 'down')
  }, [isUp])

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          {/* Glassy Tesla logo */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}>
            <TeslaLogo size={32} />
          </div>
          <div>
            <h1 style={{
              fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-grotesk)',
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              Tesla <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 24 }}>TSLA</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              NASDAQ · {loading ? 'Loading...' : 'Real-time data'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 60, fontWeight: 800, fontFamily: 'var(--font-grotesk)',
            letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            ${formatNum(price)}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 999,
            background: 'var(--accent-badge-bg)',
            color: 'var(--accent-light)',
            fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600,
          }}>
            {isUp ? '▲' : '▼'} ${formatNum(Math.abs(change))} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
          </div>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="glass"
        style={{ padding: 24, marginBottom: 24 }}
      >
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button
              key={r.range}
              onClick={() => { setRange(r.range); setInterval_(r.interval); setRangeLabel(r.label) }}
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                background: range === r.range ? 'var(--accent)' : 'var(--accent-muted)',
                color: range === r.range ? 'var(--bg-deep)' : 'var(--text-2)',
                transition: 'all 0.2s ease',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          {loading && !validCloses.length ? (
            <div style={{
              height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 14,
            }}>
              Loading chart...
            </div>
          ) : (
            <InteractiveChart closes={closes} timestamps={timestamps} isUp={isUp} rangeLabel={rangeLabel} />
          )}
          {/* Price labels */}
          {validCloses.length > 0 && (
            <div style={{
              position: 'absolute', top: 8, right: 12,
              display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
            }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                H ${formatNum(chartHigh)}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                L ${formatNum(chartLow)}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, marginBottom: 24,
        }}
      >
        {[
          { label: 'Market Cap', value: formatBigNum(meta.marketCap || (price * 3.21e9)) },
          { label: 'Day Range', value: meta.regularMarketDayLow ? `$${formatNum(meta.regularMarketDayLow)} — $${formatNum(meta.regularMarketDayHigh)}` : '—' },
          { label: '52W Range', value: meta.fiftyTwoWeekLow ? `$${formatNum(meta.fiftyTwoWeekLow)} — $${formatNum(meta.fiftyTwoWeekHigh)}` : '—' },
          { label: 'Volume', value: meta.regularMarketVolume ? meta.regularMarketVolume.toLocaleString() : '—' },
          { label: 'Chart High', value: `$${formatNum(chartHigh)}` },
          { label: 'Chart Low', value: `$${formatNum(chartLow)}` },
        ].map((stat, i) => (
          <div key={i} className="glass" style={{ padding: 20 }}>
            <div style={{
              fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
              marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-grotesk)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{
          textAlign: 'center', padding: '30px 0',
          fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
        }}
      >
        Data from Yahoo Finance · Updates every 60s · Built by Sanjay 🥔
      </motion.div>
    </div>
  )
}
