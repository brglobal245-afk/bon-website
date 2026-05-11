import React, { useState } from 'react'
import { Rocket, Clock, CheckCircle, X } from 'lucide-react'

// Demo launchpad data
const LAUNCHES = [
  {
    id: 1, status: 'live', name: 'GalacticAI', symbol: 'GAI',
    desc: 'AI-powered DeFi protocol with automated market making and yield optimization on BON Chain.',
    target: 50000, raised: 38420, color: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1, #A78BFA)',
    ends: Date.now() + 86400 * 2 * 1000, // 2 days
  },
  {
    id: 2, status: 'live', name: 'DragonSwap', symbol: 'DRX',
    desc: 'Next-generation DEX aggregator bringing best swap prices across all BON Chain liquidity pools.',
    target: 30000, raised: 12800, color: '#FF6B00', gradient: 'linear-gradient(135deg, #FF6B00, #FF3B5C)',
    ends: Date.now() + 86400 * 5 * 1000, // 5 days
  },
  {
    id: 3, status: 'upcoming', name: 'MetaVault', symbol: 'MVT',
    desc: 'Multi-chain yield vault that auto-compounds rewards across BON Chain and connected EVM chains.',
    target: 100000, raised: 0, color: '#38BDF8', gradient: 'linear-gradient(135deg, #38BDF8, #6366F1)',
    starts: Date.now() + 86400 * 7 * 1000, // 7 days
  },
  {
    id: 4, status: 'ended', name: 'SafeLaunch', symbol: 'SLX',
    desc: 'Anti-rug pull token launchpad infrastructure. Secured $45K in 48 hours.',
    target: 45000, raised: 45000, color: '#00C076', gradient: 'linear-gradient(135deg, #00C076, #26A17B)',
  },
  {
    id: 5, status: 'ended', name: 'NovaNFT', symbol: 'NOVA',
    desc: 'NFT marketplace optimized for BON Chain with zero royalty manipulation.',
    target: 25000, raised: 25000, color: '#F472B6', gradient: 'linear-gradient(135deg, #F472B6, #A78BFA)',
  },
]

function CountdownTimer({ target }) {
  const diff = Math.max(0, target - Date.now())
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[{ v: days, l: 'd' }, { v: hours, l: 'h' }, { v: mins, l: 'm' }, { v: secs, l: 's' }].map(({ v, l }) => (
        <div key={l} style={{ textAlign: 'center', background: '#111520', borderRadius: 6, padding: '6px 10px', minWidth: 44 }}>
          <div className="number" style={{ fontSize: 16, fontWeight: 700, color: '#E8EAF2' }}>{String(v).padStart(2, '0')}</div>
          <div style={{ fontSize: 10, color: '#404858' }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function ApplyModal({ open, onClose }) {
  const [form, setForm] = useState({ project: '', website: '', telegram: '', token: '', raise: '' })
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 24 }}>
      <div className="card" style={{ padding: 28, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="card-title">Apply to Launch on BON Chain</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892A4' }}><X size={18} /></button>
        </div>
        {[
          { key: 'project', label: 'Project Name', placeholder: 'e.g. My DeFi Protocol' },
          { key: 'website', label: 'Website URL', placeholder: 'https://...' },
          { key: 'telegram', label: 'Telegram / Discord', placeholder: 'https://t.me/...' },
          { key: 'token', label: 'Token Details', placeholder: 'Name, symbol, total supply...' },
          { key: 'raise', label: 'Raise Target (USDT)', placeholder: 'e.g. 50000' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input className="input-base" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
        <button className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
          <Rocket size={16} /> Submit Application
        </button>
      </div>
    </div>
  )
}

export default function Launchpad() {
  const [applyOpen, setApplyOpen] = useState(false)
  const [invest, setInvest] = useState({})

  const live = LAUNCHES.filter(l => l.status === 'live')
  const upcoming = LAUNCHES.filter(l => l.status === 'upcoming')
  const ended = LAUNCHES.filter(l => l.status === 'ended')

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.15)', borderRadius: 20, padding: '4px 12px', marginBottom: 10 }}>
              <Rocket size={12} color="#F0A500" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#F0A500' }}>BON Launchpad</span>
            </div>
            <h1 className="section-title">Token Launches</h1>
            <p style={{ color: '#8892A4', marginTop: 4 }}>Early access to the next big projects on BON Chain</p>
          </div>
          <button className="btn-primary" onClick={() => setApplyOpen(true)}>
            <Rocket size={16} /> Apply to Launch
          </button>
        </div>

        {/* Live launches */}
        {live.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div className="pulse-dot" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#00C076' }}>LIVE NOW</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {live.map(l => (
                <LaunchCard key={l.id} launch={l} invest={invest[l.id] || ''} onInvestChange={v => setInvest(p => ({ ...p, [l.id]: v }))} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={14} color="#818CF8" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#818CF8' }}>UPCOMING</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {upcoming.map(l => (
                <LaunchCard key={l.id} launch={l} />
              ))}
            </div>
          </div>
        )}

        {/* Ended */}
        {ended.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle size={14} color="#404858" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#404858' }}>ENDED</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {ended.map(l => (
                <LaunchCard key={l.id} launch={l} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  )
}

function LaunchCard({ launch: l, invest, onInvestChange }) {
  const pct = l.target > 0 ? Math.min(100, (l.raised / l.target) * 100) : 0
  const fmt = n => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`

  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Banner */}
      <div style={{ height: 72, background: l.gradient, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#080A0F', letterSpacing: -0.5 }}>{l.symbol}</span>
        {l.status === 'live' && <span className="badge-live">Live Now</span>}
        {l.status === 'upcoming' && <span className="badge-upcoming">Upcoming</span>}
        {l.status === 'ended' && <span className="badge-ended">Ended</span>}
      </div>

      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{l.name}</h3>
          <p style={{ fontSize: 12, color: '#8892A4', lineHeight: 1.6 }}>{l.desc}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div className="label" style={{ marginBottom: 2 }}>Raise Target</div>
            <div className="number" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(l.target)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label" style={{ marginBottom: 2 }}>Raised</div>
            <div className="number" style={{ fontSize: 14, fontWeight: 700, color: l.status === 'live' ? '#00C076' : '#8892A4' }}>{fmt(l.raised)}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="number" style={{ fontSize: 11, color: '#8892A4', marginTop: 4, textAlign: 'right' }}>{pct.toFixed(1)}% filled</div>
        </div>

        {/* Timer */}
        {l.status === 'live' && l.ends && (
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Ends in</div>
            <CountdownTimer target={l.ends} />
          </div>
        )}
        {l.status === 'upcoming' && l.starts && (
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Starts in</div>
            <CountdownTimer target={l.starts} />
          </div>
        )}

        {/* Action */}
        {l.status === 'live' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input-base number" placeholder="USDT amount..." value={invest || ''} onChange={e => onInvestChange?.(e.target.value)} style={{ flex: 1 }} />
            <button className="btn-primary" style={{ flexShrink: 0, padding: '0 16px' }}>Participate</button>
          </div>
        )}
        {l.status === 'upcoming' && (
          <button className="btn-outline">🔔 Notify Me</button>
        )}
        {l.status === 'ended' && (
          <button className="btn-ghost" style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: '100%' }}>
            Trade {l.symbol} →
          </button>
        )}
      </div>
    </div>
  )
}
