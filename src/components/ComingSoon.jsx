import React from 'react'
import { Clock } from 'lucide-react'

export default function ComingSoon({ icon, title, description, accentColor = '#F0A500', glowColor = 'rgba(240,165,0,0.15)' }) {
  return (
    <div className="page-wrapper" style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '48px 24px', maxWidth: 520 }}>
        {/* Icon container */}
        <div style={{
          width: 96, height: 96, borderRadius: 24,
          background: glowColor,
          border: `1px solid ${accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: `0 0 40px ${glowColor}`
        }}>
          {icon}
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '5px 14px', marginBottom: 20
        }}>
          <Clock size={12} color="#8892A4" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#8892A4', letterSpacing: '0.05em' }}>COMING SOON</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800,
          color: '#E8EAF2', marginBottom: 16, lineHeight: 1.2,
          fontFamily: 'Space Grotesk, sans-serif'
        }}>
          {title} is{' '}
          <span style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Coming Soon
          </span>
        </h1>

        {/* Description */}
        <p style={{ fontSize: 15, color: '#8892A4', lineHeight: 1.7, marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
          {description}
        </p>

        {/* Animated dots bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: accentColor,
              opacity: 0.3,
              animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>

        {/* Info card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left'
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: glowColor, border: `1px solid ${accentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={18} color={accentColor} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EAF2', marginBottom: 3 }}>We're building this for you</div>
            <div style={{ fontSize: 12, color: '#8892A4' }}>This feature is under active development. Stay tuned for the launch announcement on BON Chain.</div>
          </div>
        </div>

        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    </div>
  )
}
