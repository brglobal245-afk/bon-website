import React from 'react'
import { Link } from 'react-router-dom'
import {
  Coins, Droplets, ArrowLeftRight, Search,
  Rocket, ArrowRight, TrendingUp, Cpu, Smartphone, Clock, Zap
} from 'lucide-react'
import { DEMO_STATS } from '../config'

const FEATURES = [
  {
    icon: <Coins size={24} color="#F0A500" />,
    title: 'Create Token',
    desc: 'Deploy your own ERC-20 token on BON Chain in minutes. Set taxes, supply, and advanced features.',
    to: '/create',
    gradient: 'rgba(240,165,0,0.08)',
    border: 'rgba(240,165,0,0.15)',
  },
  {
    icon: <Droplets size={24} color="#6366F1" />,
    title: 'Add Liquidity',
    desc: 'Provide liquidity to trading pairs and earn a share of all 0.20% swap fees.',
    to: '/liquidity',
    gradient: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.15)',
  },
  {
    icon: <ArrowLeftRight size={24} color="#00C076" />,
    title: 'Instant Swap',
    desc: 'Swap any token pair on BON Chain with best price routing and minimal slippage.',
    to: '/swap',
    gradient: 'rgba(0,192,118,0.08)',
    border: 'rgba(0,192,118,0.15)',
  },
  {
    icon: <Search size={24} color="#38BDF8" />,
    title: 'Explore Tokens',
    desc: 'Discover new tokens, track prices, volumes, and market cap across the BON Chain ecosystem.',
    to: '/explore',
    gradient: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.15)',
  },
  {
    icon: <Rocket size={24} color="#FF6B00" />,
    title: 'Launchpad',
    desc: 'Participate in exclusive token launches. Early access to the next big projects on BON Chain.',
    to: '/launchpad',
    gradient: 'rgba(255,107,0,0.08)',
    border: 'rgba(255,107,0,0.15)',
  },
]

const STATS = [
  { label: 'Tokens Created', value: DEMO_STATS.tokensCreated },
  { label: 'Total Volume', value: DEMO_STATS.totalVolume },
  { label: 'Active Users', value: DEMO_STATS.activeUsers },
  { label: 'Avg Gas Fee', value: '0.3%' },
]

const MINING_PERKS = [
  { icon: <Cpu size={18} color="#A78BFA" />, label: 'Mobile Mining', desc: 'Mine BON directly from your phone — no hardware needed.' },
  { icon: <Zap size={18} color="#F0A500" />, label: 'Earn Rewards', desc: 'Earn BON tokens daily just by keeping the app open.' },
  { icon: <TrendingUp size={18} color="#00C076" />, label: 'Grow Your Stack', desc: 'Referral boosts and streak bonuses multiply your earnings.' },
]

// Google Play SVG logo
function PlayStoreLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.18 23.76c.39.22.84.25 1.26.09L15.3 12 11.94 8.64 3.18 23.76z" fill="#EA4335" />
      <path d="M20.82 10.2 17.4 8.28 13.68 12l3.72 3.72 3.42-1.92a1.5 1.5 0 0 0 0-2.6z" fill="#FBBC04" />
      <path d="M4.44.15C4.02-.01 3.57.02 3.18.24L11.94 9l3.36-3.36L4.44.15z" fill="#4285F4" />
      <path d="M3.18.24A1.5 1.5 0 0 0 2.4 1.5v21a1.5 1.5 0 0 0 .78 1.26L15.3 12 3.18.24z" fill="#34A853" />
    </svg>
  )
}

export default function Home() {
  return (
    <div className="page-wrapper">
      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 80, paddingBottom: 80 }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 800,
          background: 'radial-gradient(ellipse, rgba(240,165,0,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Grid overlay */}
        <div className="grid-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

        <div className="page-content" style={{ position: 'relative', textAlign: 'center' }}>
          {/* Live pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
            <div className="pulse-gold" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F0A500' }}>BON Chain is Live — Zero Monthly Fees</span>
          </div>

          {/* Headline */}
          <h1 className="section-title" style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.15, marginBottom: 20, maxWidth: 750, margin: '0 auto 20px' }}>
            Bhardwaj <span className="gradient-gold-text">Open Network for Everyone</span>
          </h1>

          <p style={{ fontSize: 16, color: '#8892A4', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Create tokens, trade instantly, earn rewards. The all-in-one DeFi platform built on BON Chain with ultra-low fees.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
            <Link to="/create" className="btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
              <Coins size={18} /> Create Your Token
            </Link>
            <Link to="/swap" className="btn-outline" style={{ fontSize: 15, padding: '14px 28px' }}>
              <ArrowLeftRight size={18} /> Start Trading
            </Link>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', maxWidth: 700, margin: '0 auto'
          }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ padding: '20px 24px', background: '#0C0F17', textAlign: 'center' }}>
                <div className="number" style={{ fontSize: 22, fontWeight: 700, color: '#E8EAF2', marginBottom: 4 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: '#404858', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ paddingBottom: 80 }}>
        <div className="page-content">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendingUp size={14} color="#F0A500" />
              <span className="label" style={{ color: '#F0A500' }}>Everything You Need</span>
            </div>
            <h2 className="card-title" style={{ fontSize: 28 }}>
              One Platform, Full DeFi Stack
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <Link
                key={i}
                to={f.to}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    padding: 24, cursor: 'pointer',
                    transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
                    background: `linear-gradient(135deg, ${f.gradient}, rgba(12,15,23,0))`,
                    height: '100%'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = f.border
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: f.gradient, border: `1px solid ${f.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
                  }}>
                    {f.icon}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#E8EAF2' }}>{f.title}</h3>
                    <ArrowRight size={16} color="#404858" />
                  </div>
                  <p style={{ fontSize: 13, color: '#8892A4', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mining Section ─── */}
      <section style={{ paddingBottom: 100, position: 'relative', overflow: 'hidden' }}>
        {/* Purple glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700, height: 500,
          background: 'radial-gradient(ellipse, rgba(167,139,250,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="page-content" style={{ position: 'relative' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <Cpu size={14} color="#A78BFA" />
              <span className="label" style={{ color: '#A78BFA' }}>BON Mining App</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800,
              color: '#E8EAF2', lineHeight: 1.2, marginBottom: 14,
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              Mine BON Coins{' '}
              <span style={{
                background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                From Your Phone
              </span>
            </h2>
            <p style={{ fontSize: 15, color: '#8892A4', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              No expensive hardware. No technical knowledge. Just open the app, tap mine, and start earning BON every day.
            </p>
          </div>

          {/* Main card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(12,15,23,0.6) 60%)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 24, overflow: 'hidden',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 0
          }}>
            {/* Left — perks */}
            <div style={{ padding: '48px 40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 48 }}>
                {MINING_PERKS.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {p.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#E8EAF2', marginBottom: 4 }}>{p.label}</div>
                      <div style={{ fontSize: 13, color: '#8892A4', lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Play Store button — Coming Soon */}
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20, padding: '4px 12px', marginBottom: 14
                }}>
                  <Clock size={11} color="#8892A4" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#8892A4', letterSpacing: '0.06em' }}>COMING SOON</span>
                </div>

                <button
                  disabled
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                    border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: 14, padding: '14px 22px',
                    cursor: 'not-allowed', opacity: 0.75,
                    transition: 'all 0.2s', width: 'fit-content'
                  }}
                >
                  <PlayStoreLogo />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 10, color: '#8892A4', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                      Get it on
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#E8EAF2', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
                      Google Play
                    </div>
                  </div>
                </button>

                <p style={{ fontSize: 12, color: '#404858', marginTop: 12 }}>
                  📱 Android app launching soon — iOS coming later
                </p>
              </div>
            </div>

            {/* Right — visual */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '48px 40px',
              borderLeft: '1px solid rgba(167,139,250,0.1)',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div style={{ textAlign: 'center' }}>
                {/* Phone mockup */}
                <div style={{
                  width: 160, height: 280, borderRadius: 32,
                  background: 'linear-gradient(160deg, #1a1030, #0C0F17)',
                  border: '2px solid rgba(167,139,250,0.3)',
                  margin: '0 auto 24px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                  boxShadow: '0 0 60px rgba(167,139,250,0.15), 0 20px 60px rgba(0,0,0,0.5)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {/* Screen glow */}
                  <div style={{
                    position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
                    width: 120, height: 120,
                    background: 'radial-gradient(ellipse, rgba(167,139,250,0.3), transparent)',
                  }} />
                  <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(167,139,250,0.5)',
                    position: 'relative', zIndex: 1
                  }}>
                    <Cpu size={32} color="#fff" />
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E8EAF2' }}>BON Miner</div>
                    <div style={{ fontSize: 11, color: '#A78BFA' }}>Mining active...</div>
                  </div>
                  {/* Animated bar */}
                  <div style={{ width: 100, height: 6, borderRadius: 3, background: 'rgba(167,139,250,0.15)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      height: '100%', width: '60%', borderRadius: 3,
                      background: 'linear-gradient(90deg, #A78BFA, #7C3AED)',
                      animation: 'mining-bar 2s ease-in-out infinite alternate'
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, position: 'relative', zIndex: 1 }}>
                    +0.042 BON / hr
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(167,139,250,0.1)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  borderRadius: 20, padding: '6px 14px'
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#A78BFA',
                    boxShadow: '0 0 6px #A78BFA',
                    animation: 'pulse-glow 1.5s ease-in-out infinite'
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#A78BFA' }}>App in Development</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes mining-bar {
            from { width: 30%; }
            to { width: 85%; }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; box-shadow: 0 0 4px #A78BFA; }
            50% { opacity: 1; box-shadow: 0 0 12px #A78BFA; }
          }
        `}</style>
      </section>
    </div>
  )
}
