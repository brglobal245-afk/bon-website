import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Flame, Star, TrendingDown, ArrowUpDown } from 'lucide-react'

// Demo token data — replace with live on-chain data from TokenCreated events
const DEMO_TOKENS = [
  { rank: 1, name: 'BON Token', symbol: 'BON', price: 0.09624, change24h: 8.42, volume24h: 482000, mcap: 9624000, color: '#F0A500', trending: true },
  { rank: 2, name: 'BON USDT', symbol: 'USDT', price: 1.00, change24h: 0.01, volume24h: 920000, mcap: 5000000, color: '#26A17B', trending: false },
  { rank: 3, name: 'Ethereum', symbol: 'ETH', price: 3420.50, change24h: 3.21, volume24h: 720000, mcap: 41000000, color: '#627EEA', trending: true },
  { rank: 4, name: 'MoonShot', symbol: 'MOON', price: 0.00482, change24h: 142.8, volume24h: 248000, mcap: 482000, color: '#A78BFA', trending: true, new: true },
  { rank: 5, name: 'DeFi Gold', symbol: 'DFG', price: 0.1820, change24h: -12.4, volume24h: 84000, mcap: 1820000, color: '#38BDF8', trending: false },
  { rank: 6, name: 'Rocket X', symbol: 'RKT', price: 0.00021, change24h: 68.2, volume24h: 124000, mcap: 210000, color: '#FF6B00', trending: true, new: true },
  { rank: 7, name: 'SafeStable', symbol: 'SAFE', price: 0.9940, change24h: -0.08, volume24h: 52000, mcap: 994000, color: '#00C076', trending: false },
  { rank: 8, name: 'BON Chain AI', symbol: 'BONAI', price: 0.00842, change24h: -28.4, volume24h: 36000, mcap: 842000, color: '#F472B6', trending: false },
]

function fmt(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function fmtPrice(n) {
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(7)}`
}

export default function Explore() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('mcap')
  const [sortDir, setSortDir] = useState('desc')
  const [loading] = useState(false)

  const filtered = useMemo(() => {
    let list = DEMO_TOKENS.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.symbol.toLowerCase().includes(search.toLowerCase())
    )
    if (filter === 'trending') list = list.filter(t => t.trending)
    if (filter === 'new') list = list.filter(t => t.new)
    if (filter === 'gainers') list = list.filter(t => t.change24h > 0).sort((a, b) => b.change24h - a.change24h)
    if (filter === 'losers') list = list.filter(t => t.change24h < 0).sort((a, b) => a.change24h - b.change24h)
    if (filter === 'all') {
      list = list.sort((a, b) => {
        const av = a[sortBy], bv = b[sortBy]
        return sortDir === 'desc' ? bv - av : av - bv
      })
    }
    return list
  }, [search, filter, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <h1 className="section-title">Explore Tokens</h1>
            <p style={{ color: '#8892A4', marginTop: 4 }}>{DEMO_TOKENS.length} tokens on BON Chain</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
            <Search size={16} color="#404858" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input className="input-base" style={{ paddingLeft: 40 }} placeholder="Search by name or contract address..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'trending', label: '🔥 Trending' },
              { key: 'new', label: '✨ New' },
              { key: 'gainers', label: '📈 Gainers' },
              { key: 'losers', label: '📉 Losers' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`tab-btn${filter === f.key ? ' active' : ''}`} style={{ minHeight: 36, padding: '6px 14px' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Token</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('price')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Price {sortBy === 'price' && <ArrowUpDown size={12} />}
                    </span>
                  </th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('change24h')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      24h % {sortBy === 'change24h' && <ArrowUpDown size={12} />}
                    </span>
                  </th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('volume24h')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Volume {sortBy === 'volume24h' && <ArrowUpDown size={12} />}
                    </span>
                  </th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('mcap')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Mkt Cap {sortBy === 'mcap' && <ArrowUpDown size={12} />}
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(6).fill(0).map((_, i) => (
                    <tr key={i}>
                      {[48, 180, 100, 80, 100, 100, 80].map((w, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 16, width: w }} /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.map((t, idx) => (
                  <tr key={t.symbol}>
                    <td style={{ color: '#404858', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="token-icon" style={{ background: t.color }}>{t.symbol[0]}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                            {t.trending && <Flame size={12} color="#FF6B00" />}
                            {t.new && <span style={{ fontSize: 9, background: 'rgba(99,102,241,0.2)', color: '#818CF8', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>NEW</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#8892A4' }}>{t.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ fontSize: 14, fontWeight: 500 }}>{fmtPrice(t.price)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ color: t.change24h >= 0 ? '#00C076' : '#FF3B5C', fontWeight: 600, fontSize: 13 }}>
                        {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ fontSize: 13, color: '#8892A4' }}>{fmt(t.volume24h)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ fontSize: 13, color: '#8892A4' }}>{fmt(t.mcap)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12, minHeight: 32 }} onClick={() => navigate(`/swap?token=${t.symbol}`)}>
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Search size={28} color="#404858" style={{ marginBottom: 12 }} />
              <p style={{ color: '#8892A4' }}>No tokens found matching "{search}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
