import React from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { BarChart2, Wallet, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Demo portfolio data
const DEMO_HOLDINGS = [
  { symbol: 'BON', name: 'BON Token', balance: '12,480.00', price: 0.09624, value: 1200.52, change: 8.42, color: '#F0A500' },
  { symbol: 'ETH', name: 'Ethereum', balance: '0.4820', price: 3420.50, value: 1648.68, change: 3.21, color: '#627EEA' },
  { symbol: 'MOON', name: 'MoonShot', balance: '500,000', price: 0.00482, value: 2410.00, change: 142.8, color: '#A78BFA' },
]

const DEMO_TXS = [
  { type: 'Swap', detail: 'BON → USDT', amount: '500 BON', time: '5 min ago', hash: '0xabc...def', color: '#F0A500' },
  { type: 'Add LP', detail: 'BON / USDT', amount: '$240.00', time: '2 hrs ago', hash: '0x123...456', color: '#00C076' },
  { type: 'Create Token', detail: 'MOON Token', amount: '1,000,000 MOON', time: '1 day ago', hash: '0x789...abc', color: '#A78BFA' },
  { type: 'Swap', detail: 'USDT → ETH', amount: '100 USDT', time: '1 day ago', hash: '0xdef...123', color: '#627EEA' },
  { type: 'Remove LP', detail: 'ETH / BON', amount: '$80.00', time: '3 days ago', hash: '0x456...789', color: '#FF3B5C' },
]

const LP_POSITIONS = [
  { pair: 'BON / USDT', value: '$1,240.00', fees: '$24.80', share: '0.12%', colorA: '#F0A500', colorB: '#26A17B', tokenA: 'BON', tokenB: 'USDT' },
]

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="number" style={{ fontSize: 22, fontWeight: 700, color: color || '#E8EAF2', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#8892A4' }}>{sub}</div>}
    </div>
  )
}

export default function Portfolio() {
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()

  if (!isConnected) {
    return (
      <div className="page-wrapper">
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Wallet size={32} color="#F0A500" />
            </div>
            <h2 className="card-title" style={{ marginBottom: 10 }}>View Your Portfolio</h2>
            <p style={{ color: '#8892A4', marginBottom: 24, fontSize: 13 }}>
              Connect your wallet to see your token holdings, liquidity positions, and transaction history.
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  const totalValue = DEMO_HOLDINGS.reduce((s, h) => s + h.value, 0)

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <BarChart2 size={20} color="#F0A500" />
            <h1 className="section-title" style={{ fontSize: 24 }}>Portfolio</h1>
          </div>
          <p style={{ color: '#8892A4', fontSize: 13, fontFamily: 'JetBrains Mono' }}>{address?.slice(0, 6)}...{address?.slice(-4)}</p>
        </div>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard label="Total Portfolio Value" value={`$${totalValue.toFixed(2)}`} sub="Across all holdings" color="#E8EAF2" />
          <StatCard label="BON Balance" value="12,480 BON" sub="≈ $1,200.52" color="#F0A500" />
          <StatCard label="Total Fees Earned" value="$24.80" sub="From LP positions" color="#00C076" />
          <StatCard label="Tokens Held" value="3" sub="Unique tokens" />
        </div>

        {/* Holdings table */}
        <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <h2 className="card-title">Token Holdings</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>24h P/L</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_HOLDINGS.map(h => (
                  <tr key={h.symbol}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="token-icon" style={{ background: h.color }}>{h.symbol[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{h.name}</div>
                          <div style={{ fontSize: 12, color: '#8892A4' }}>{h.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ fontSize: 13 }}>{h.balance}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ fontSize: 13 }}>
                        {h.price >= 1 ? `$${h.price.toFixed(2)}` : `$${h.price.toFixed(5)}`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="number" style={{ fontSize: 14, fontWeight: 600 }}>${h.value.toFixed(2)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        {h.change >= 0 ? <TrendingUp size={13} color="#00C076" /> : <TrendingDown size={13} color="#FF3B5C" />}
                        <span className="number" style={{ color: h.change >= 0 ? '#00C076' : '#FF3B5C', fontSize: 13, fontWeight: 600 }}>
                          {h.change >= 0 ? '+' : ''}{h.change.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LP Positions */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <h2 className="card-title">Liquidity Positions</h2>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LP_POSITIONS.map((pos, i) => (
              <div key={i} style={{ background: '#111520', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', width: 44 }}>
                    <div className="token-icon" style={{ background: pos.colorA, position: 'absolute', left: 0 }}>{pos.tokenA[0]}</div>
                    <div className="token-icon" style={{ background: pos.colorB, position: 'absolute', left: 18 }}>{pos.tokenB[0]}</div>
                  </div>
                  <div style={{ paddingLeft: 28 }}>
                    <div style={{ fontWeight: 600 }}>{pos.pair}</div>
                    <div style={{ fontSize: 12, color: '#8892A4' }}>Share: {pos.share}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <div className="number" style={{ fontSize: 15, fontWeight: 600 }}>{pos.value}</div>
                    <div style={{ fontSize: 11, color: '#8892A4' }}>My Liquidity</div>
                  </div>
                  <div>
                    <div className="number" style={{ fontSize: 15, fontWeight: 600, color: '#00C076' }}>{pos.fees}</div>
                    <div style={{ fontSize: 11, color: '#8892A4' }}>Fees Earned</div>
                  </div>
                </div>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12, minHeight: 36, background: 'linear-gradient(135deg, #00C076, #00A86B)' }}>
                  Claim Fees
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <h2 className="card-title">Transaction History</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Time</th>
                  <th style={{ textAlign: 'right' }}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_TXS.map((tx, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ background: `${tx.color}20`, color: tx.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ color: '#8892A4', fontSize: 13 }}>{tx.detail}</td>
                    <td><span className="number" style={{ fontSize: 13 }}>{tx.amount}</span></td>
                    <td style={{ color: '#404858', fontSize: 12 }}>{tx.time}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a href={`https://explorer.bonchain.io/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                        style={{ color: '#8892A4', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F0A500'}
                        onMouseLeave={e => e.currentTarget.style.color = '#8892A4'}
                      >
                        {tx.hash} <ExternalLink size={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
