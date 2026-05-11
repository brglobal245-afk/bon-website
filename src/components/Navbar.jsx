import React, { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Menu, X, Zap } from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/create', label: 'Create Token' },
  { to: '/liquidity', label: 'Liquidity' },
  { to: '/swap', label: 'Swap' },
  { to: '/explore', label: 'Explore' },
  { to: '/launchpad', label: 'Launchpad' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { address, isConnected } = useAccount()

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #F0A500, #FF6B00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(240,165,0,0.4)'
          }}>
            <Zap size={18} color="#080A0F" fill="#080A0F" />
          </div>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, color: '#E8EAF2' }}>
            BON <span style={{ background: 'linear-gradient(135deg, #F0A500, #FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Network</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {/* Network badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,192,118,0.08)',
            border: '1px solid rgba(0,192,118,0.2)',
            borderRadius: 20, padding: '5px 12px',
            flexShrink: 0
          }}>
            <div className="pulse-dot" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#00C076' }}>BON Chain</span>
          </div>

          {/* RainbowKit connect button */}
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus="avatar"
          />

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn btn-ghost"
            style={{ padding: 8, minHeight: 36 }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="mobile-nav">
          <button
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#8892A4' }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={24} />
          </button>
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ fontSize: 18, padding: '12px 8px' }}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  )
}
