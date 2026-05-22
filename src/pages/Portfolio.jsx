import React, { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { 
  BarChart2, Wallet, ExternalLink, TrendingUp, TrendingDown,
  Clock, ShieldAlert, Award, AlertTriangle, ArrowUpRight, Loader2, Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { useToast } from '../context/ToastContext'

import { subscribeToUserBalances, subscribeToUserOrders } from '../services/tradeService'
import { subscribeToTokens } from '../services/tokenService'
import { subscribeToStakes, unstakeBON } from '../services/stakingService'
import { subscribeToFuturesPositions, closeFuturesPosition } from '../services/futuresService'
import { subscribeToOptions, exerciseOption } from '../services/optionsService'

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
  const { addToast, updateToast } = useToast()

  const userId = address || auth?.currentUser?.uid || 'session_user'

  // Subscribed States
  const [balances, setBalances] = useState({})
  const [tokens, setTokens] = useState([])
  const [stakes, setStakes] = useState([])
  const [futures, setFutures] = useState([])
  const [options, setOptions] = useState([])
  const [orders, setOrders] = useState([])

  // Action Loading States
  const [unstakingId, setUnstakingId] = useState(null)
  const [earlyUnstakeTarget, setEarlyUnstakeTarget] = useState(null)
  const [closingPositionId, setClosingPositionId] = useState(null)
  const [exercisingOptionId, setExercisingOptionId] = useState(null)

  // Active Tab State: 'holdings' | 'staking' | 'futures' | 'options' | 'history'
  const [activeTab, setActiveTab] = useState('holdings')

  // Real-time Subscriptions
  useEffect(() => {
    const unsubBalances = subscribeToUserBalances(userId, setBalances)
    const unsubTokens = subscribeToTokens(setTokens)
    const unsubStakes = subscribeToStakes(userId, setStakes)
    const unsubFutures = subscribeToFuturesPositions(userId, setFutures)
    const unsubOptions = subscribeToOptions(userId, setOptions)
    const unsubOrders = subscribeToUserOrders(userId, setOrders)

    return () => {
      unsubBalances()
      unsubTokens()
      unsubStakes()
      unsubFutures()
      unsubOptions()
      unsubOrders()
    }
  }, [userId])

  // Helper: Retrieve real-time token price with defaults
  const getTokenPrice = (sym) => {
    const s = sym.toUpperCase()
    const t = tokens.find(tk => tk.symbol.toUpperCase() === s)
    if (t) return t.price
    
    // Static fallbacks for core tokens
    if (s === 'BON') return 0.09624
    if (s === 'USDT') return 1.00
    if (s === 'ETH') return 3420.50
    if (s === 'MOON') return 0.00482
    if (s === 'DFG') return 0.1820
    if (s === 'RKT') return 0.00021
    if (s === 'SAFE') return 0.9940
    if (s === 'BONAI') return 0.00842
    return 1.00
  }

  // Helper: Retrieve 24h change
  const getTokenChange = (sym) => {
    const s = sym.toUpperCase()
    const t = tokens.find(tk => tk.symbol.toUpperCase() === s)
    if (t) return t.change24h || 0
    
    // Fallbacks
    if (s === 'BON') return 8.42
    if (s === 'USDT') return 0.01
    if (s === 'ETH') return 3.21
    if (s === 'MOON') return 142.8
    if (s === 'DFG') return -12.4
    if (s === 'RKT') return 68.2
    if (s === 'SAFE') return -0.08
    if (s === 'BONAI') return -28.4
    return 0
  }

  // Parse holdings from active balances
  const holdingsList = useMemo(() => {
    return Object.entries(balances)
      .filter(([_, bal]) => bal > 0)
      .map(([symbol, bal]) => {
        const token = tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase())
        const price = token ? token.price : getTokenPrice(symbol)
        const change = token ? token.change24h : getTokenChange(symbol)
        const name = token ? token.name : (symbol === 'BON' ? 'BON Token' : symbol)
        const color = token ? token.color : (symbol === 'BON' ? '#F0A500' : '#8892A4')
        const value = bal * price
        return {
          symbol,
          name,
          balance: bal,
          price,
          value,
          change,
          color
        }
      })
  }, [balances, tokens])

  // Aggregate Portfolio Calculations
  const calculations = useMemo(() => {
    const bonPrice = getTokenPrice('BON')

    // 1. Staking principal and rewards
    const activeStakes = stakes.filter(s => s.status === 'Staked')
    const totalStakedBON = activeStakes.reduce((sum, s) => sum + s.amount, 0)
    const totalStakedVal = totalStakedBON * bonPrice
    const totalPendingBON = activeStakes.reduce((sum, s) => sum + s.rewards, 0)
    const totalPendingVal = totalPendingBON * bonPrice

    // 2. Futures margins and real-time PNL
    const openFutures = futures.filter(f => f.status === 'Open')
    const totalFuturesMarginBON = openFutures.reduce((sum, f) => sum + f.margin, 0)
    const totalFuturesMarginVal = totalFuturesMarginBON * bonPrice

    const totalFuturesPnlBON = openFutures.reduce((sum, f) => {
      const currentPrice = getTokenPrice(f.symbol)
      const priceDiffRatio = (currentPrice - f.entryPrice) / f.entryPrice
      const pnl = f.type === 'Long'
        ? priceDiffRatio * f.margin * f.leverage
        : -priceDiffRatio * f.margin * f.leverage
      return sum + pnl
    }, 0)
    const totalFuturesPnlVal = totalFuturesPnlBON * bonPrice

    // 3. Options premium and real-time payout value
    const activeOptions = options.filter(o => o.status === 'Active')
    const totalOptionsPremiumBON = activeOptions.reduce((sum, o) => sum + o.premium, 0)
    const totalOptionsPremiumVal = totalOptionsPremiumBON * bonPrice

    const totalOptionsPayoutBON = activeOptions.reduce((sum, o) => {
      const currentPrice = getTokenPrice(o.symbol)
      let payout = 0
      if (o.contractType === 'Call') {
        if (currentPrice > o.strikePrice) {
          payout = o.quantity * (currentPrice - o.strikePrice)
        }
      } else {
        if (currentPrice < o.strikePrice) {
          payout = o.quantity * (o.strikePrice - currentPrice)
        }
      }
      return sum + payout
    }, 0)
    const totalOptionsPayoutVal = totalOptionsPayoutBON * bonPrice
    const totalOptionsProfitVal = totalOptionsPayoutVal - totalOptionsPremiumVal

    // 4. Token holdings value
    const totalHoldingsVal = holdingsList.reduce((sum, h) => sum + h.value, 0)

    // Total composite value (USD)
    const totalPortfolioVal = totalHoldingsVal + totalStakedVal + totalFuturesMarginVal + totalFuturesPnlVal + totalOptionsPayoutVal

    return {
      totalPortfolioVal,
      totalHoldingsVal,
      totalStakedVal,
      totalStakedBON,
      totalPendingBON,
      totalPendingVal,
      totalFuturesMarginVal,
      totalFuturesPnlVal,
      totalOptionsPremiumVal,
      totalOptionsPayoutVal,
      totalOptionsProfitVal,
      activeStakesCount: activeStakes.length,
      openFuturesCount: openFutures.length,
      activeOptionsCount: activeOptions.length
    }
  }, [holdingsList, stakes, futures, options, tokens])

  // Unified Transaction and Operations History List
  const combinedHistory = useMemo(() => {
    const list = []

    // Spot filled orders
    orders.forEach(o => {
      list.push({
        type: 'Spot ' + (o.type || o.side || 'Order').toUpperCase(),
        asset: o.symbol,
        detail: `${o.side === 'buy' ? 'Bought' : 'Sold'} ${o.amount} ${o.symbol} @ $${o.price}`,
        amount: `${(o.total || (o.amount * o.price)).toFixed(2)} BON`,
        status: o.status || 'Filled',
        timestamp: new Date(o.timestamp),
        color: o.side === 'buy' ? '#00C076' : '#FF3B5C'
      })
    })

    // Unstaked pools
    stakes.filter(s => s.status !== 'Staked').forEach(s => {
      const penaltyText = s.penaltyApplied > 0 ? ` (early unstake penalty: ${s.penaltyApplied.toFixed(2)} BON)` : ''
      list.push({
        type: 'Stake Unstaked',
        asset: 'BON',
        detail: `Unstaked ${s.amount} BON at ${s.apy}% APY${penaltyText}`,
        amount: `${(s.amount + (s.claimedRewards || 0) - (s.penaltyApplied || 0)).toFixed(2)} BON`,
        status: s.status,
        timestamp: new Date(s.unstakedAt || s.unlockDate),
        color: '#F0A500'
      })
    })

    // Closed futures
    futures.filter(f => f.status !== 'Open').forEach(f => {
      list.push({
        type: 'Futures Close',
        asset: f.symbol,
        detail: `Closed ${f.type} position entry @ $${f.entryPrice}, exit @ $${f.closePrice}`,
        amount: `${f.pnl >= 0 ? '+' : ''}${f.pnl.toFixed(2)} BON PNL`,
        status: f.status,
        timestamp: new Date(f.closedAt || f.timestamp),
        color: f.status === 'Liquidated' ? '#FF3B5C' : '#8892A4'
      })
    })

    // Expired or Settle options
    options.filter(o => o.status !== 'Active').forEach(o => {
      list.push({
        type: 'Option Settle',
        asset: o.symbol,
        detail: `Settled ${o.contractType} strike @ $${o.strikePrice}, settled @ $${o.settlePrice || 'N/A'}`,
        amount: `${o.payout > 0 ? '+' : ''}${o.payout.toFixed(2)} BON payout`,
        status: o.status,
        timestamp: new Date(o.settledAt || o.timestamp),
        color: o.status === 'Exercised' ? '#00C076' : '#FF3B5C'
      })
    })

    // Sort descending chronologically
    return list.sort((a, b) => b.timestamp - a.timestamp)
  }, [orders, stakes, futures, options])

  // Staking Unstake Execution
  const handleUnstakeClick = (stakeItem) => {
    const unlockTime = new Date(stakeItem.unlockDate).getTime()
    const now = Date.now()
    const isEarly = now < unlockTime

    if (isEarly) {
      setEarlyUnstakeTarget(stakeItem)
    } else {
      executeUnstake(stakeItem.id)
    }
  }

  const executeUnstake = async (stakeId) => {
    setUnstakingId(stakeId)
    setEarlyUnstakeTarget(null)

    const toastId = addToast({
      type: 'pending',
      title: 'Unstaking BON',
      message: 'Withdrawing BON tokens and updating balances...'
    })

    try {
      const res = await unstakeBON(userId, stakeId)
      if (res.isEarly) {
        updateToast(toastId, {
          type: 'warning',
          title: 'Early Unstake Settled',
          message: `Withdrew early. Paid ${res.penalty.toFixed(2)} BON penalty (15%). Received ${res.payoutAmount.toFixed(2)} BON.`
        })
      } else {
        updateToast(toastId, {
          type: 'success',
          title: 'Staking Matured',
          message: `Successfully claimed principal plus rewards. Received ${res.payoutAmount.toFixed(2)} BON.`
        })
      }
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Unstake Failed',
        message: e.message || 'Could not claim staking pool.'
      })
    } finally {
      setUnstakingId(null)
    }
  }

  // Futures Position Closing Execution
  const executeCloseFutures = async (positionId, symbol) => {
    setClosingPositionId(positionId)
    const currentPrice = getTokenPrice(symbol)

    const toastId = addToast({
      type: 'pending',
      title: 'Closing Futures Position',
      message: `Closing ${symbol} leverage position at market price $${currentPrice.toFixed(4)}...`
    })

    try {
      const res = await closeFuturesPosition(userId, positionId, currentPrice)
      if (res.liquidated) {
        updateToast(toastId, {
          type: 'error',
          title: 'Position Liquidated',
          message: `Closed due to liquidation threshold at $${currentPrice.toFixed(4)}. Margin forfeited.`
        })
      } else {
        updateToast(toastId, {
          type: 'success',
          title: 'Futures Position Closed',
          message: `Closed position successfully. Net PNL: ${res.pnl >= 0 ? '+' : ''}${res.pnl.toFixed(2)} BON.`
        })
      }
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Closing Failed',
        message: e.message || 'Failed to execute close transaction.'
      })
    } finally {
      setClosingPositionId(null)
    }
  }

  // Options Settlement Execution
  const executeSettleOption = async (contractId, symbol) => {
    setExercisingOptionId(contractId)
    const currentPrice = getTokenPrice(symbol)

    const toastId = addToast({
      type: 'pending',
      title: 'Exercising Option Contract',
      message: `Settling ${symbol} option slip at market price $${currentPrice.toFixed(4)}...`
    })

    try {
      const res = await exerciseOption(userId, contractId, currentPrice)
      if (res.payout > 0) {
        updateToast(toastId, {
          type: 'success',
          title: 'Option Settled In The Money',
          message: `Contract exercised! Payout: ${res.payout.toFixed(2)} BON. Net Profit: ${res.profit >= 0 ? '+' : ''}${res.profit.toFixed(2)} BON.`
        })
      } else {
        updateToast(toastId, {
          type: 'warning',
          title: 'Option Expired OTM',
          message: 'Option settled out of the money. Premium forfeited.'
        })
      }
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Settlement Failed',
        message: e.message || 'Failed to settle options contract.'
      })
    } finally {
      setExercisingOptionId(null)
    }
  }

  // Static LP claim mock
  const handleClaimFees = () => {
    addToast({
      type: 'success',
      title: 'LP Fees Claimed',
      message: 'Claimed $24.80 in accumulated liquidity pool trading fees.'
    })
  }

  // Dynamic Tabs Data
  const tabs = [
    { id: 'holdings', label: 'Holdings', count: holdingsList.length + LP_POSITIONS.length },
    { id: 'staking', label: 'Staking Pools', count: calculations.activeStakesCount },
    { id: 'futures', label: 'Futures Positions', count: calculations.openFuturesCount },
    { id: 'options', label: 'Options Slips', count: calculations.activeOptionsCount },
    { id: 'history', label: 'History Log', count: combinedHistory.length }
  ]

  return (
    <div className="page-wrapper">
      <div className="page-content">
        
        {/* Connection/Demo Mode Banner */}
        {!isConnected && (
          <div style={{
            background: 'rgba(240, 165, 0, 0.1)',
            border: '1px solid rgba(240, 165, 0, 0.2)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color="#F0A500" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#E8EAF2' }}>
                You are in <strong>Demo Mode</strong> with mock balances. Connect your Web3 wallet to manage real chain assets.
              </span>
            </div>
            <ConnectButton />
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BarChart2 size={24} color="#F0A500" />
              <h1 className="section-title" style={{ fontSize: 26, margin: 0 }}>Portfolio Ledger</h1>
            </div>
            <p style={{ color: '#8892A4', fontSize: 13, fontFamily: 'JetBrains Mono', marginTop: 4 }}>
              {isConnected ? `Wallet: ${address.slice(0, 8)}...${address.slice(-6)}` : 'Demo Account (Real-time Simulation)'}
            </p>
          </div>
          {isConnected && <ConnectButton />}
        </div>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard 
            label="Total Portfolio Value" 
            value={`$${calculations.totalPortfolioVal.toFixed(2)}`} 
            sub="Composite asset evaluation" 
            color="#F0A500" 
          />
          <StatCard 
            label="BON Balance" 
            value={`${(balances.BON || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BON`} 
            sub={`≈ $${((balances.BON || 0) * getTokenPrice('BON')).toFixed(2)}`} 
            color="#E8EAF2" 
          />
          <StatCard 
            label="Staked Principals" 
            value={`${calculations.totalStakedBON.toLocaleString()} BON`} 
            sub={`Yielding rewards (+${calculations.totalPendingBON.toFixed(1)} BON)`} 
            color="#00C076" 
          />
          <StatCard 
            label="Leveraged Margin" 
            value={`${(calculations.totalFuturesMarginVal / getTokenPrice('BON')).toFixed(2)} BON`} 
            sub={`PNL: ${calculations.totalFuturesPnlVal >= 0 ? '+' : ''}$${calculations.totalFuturesPnlVal.toFixed(2)}`} 
            color={calculations.totalFuturesPnlVal >= 0 ? '#00C076' : '#FF3B5C'}
          />
        </div>

        {/* Custom Segmented Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: 6, 
          borderBottom: '1px solid rgba(255,255,255,0.06)', 
          paddingBottom: 1, 
          marginBottom: 24, 
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: activeTab === tab.id ? '2px solid #F0A500' : 'none',
                borderRadius: '8px 8px 0 0',
                padding: '10px 18px',
                minHeight: 40,
                whiteSpace: 'nowrap',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  fontSize: 10,
                  background: activeTab === tab.id ? '#080A0F' : 'rgba(255,255,255,0.06)',
                  color: activeTab === tab.id ? '#F0A500' : '#8892A4',
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Holdings */}
        {activeTab === 'holdings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Token Holdings Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <h2 className="card-title" style={{ fontSize: 16 }}>Token Balances</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Value (USD)</th>
                      <th style={{ textAlign: 'right' }}>24h Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdingsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#8892A4', padding: '48px 0' }}>
                          <Info size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                          <div style={{ fontSize: 14, fontWeight: 600 }}>No token balances detected</div>
                          <div style={{ fontSize: 12, color: '#404858', marginTop: 4 }}>Go to the Swap terminal to acquire tokens.</div>
                        </td>
                      </tr>
                    ) : (
                      holdingsList.map(h => (
                        <tr key={h.symbol}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="token-icon" style={{ background: h.color, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#080A0F' }}>
                                {h.symbol[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{h.name}</div>
                                <div style={{ fontSize: 12, color: '#8892A4' }}>{h.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="font-mono text-sm" style={{ fontWeight: 500 }}>
                              {h.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="font-mono text-sm">
                              {h.price >= 1 ? `$${h.price.toFixed(2)}` : `$${h.price.toFixed(5)}`}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="font-mono text-sm" style={{ fontWeight: 700, color: '#E8EAF2' }}>
                              ${h.value.toFixed(2)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              {h.change >= 0 ? <TrendingUp size={14} color="#00C076" /> : <TrendingDown size={14} color="#FF3B5C" />}
                              <span className="font-mono" style={{ color: h.change >= 0 ? '#00C076' : '#FF3B5C', fontSize: 13, fontWeight: 600 }}>
                                {h.change >= 0 ? '+' : ''}{h.change.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LP positions */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <h2 className="card-title" style={{ fontSize: 16 }}>Liquidity Pool Positions</h2>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {LP_POSITIONS.map((pos, i) => (
                  <div key={i} style={{ background: '#111520', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative', width: 44, height: 28 }}>
                        <div className="token-icon" style={{ background: pos.colorA, position: 'absolute', left: 0, width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#080A0F' }}>{pos.tokenA[0]}</div>
                        <div className="token-icon" style={{ background: pos.colorB, position: 'absolute', left: 16, width: 26, height: 26, borderRadius: '50%', border: '2px solid #111520', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#080A0F' }}>{pos.tokenB[0]}</div>
                      </div>
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{pos.pair} Pool Share</div>
                        <div style={{ fontSize: 12, color: '#8892A4' }}>Share Ratio: {pos.share}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 32 }}>
                      <div>
                        <div className="font-mono text-sm" style={{ fontWeight: 600 }}>{pos.value}</div>
                        <div style={{ fontSize: 11, color: '#8892A4', marginTop: 2 }}>Pool Equity</div>
                      </div>
                      <div>
                        <div className="font-mono text-sm" style={{ fontWeight: 600, color: '#00C076' }}>{pos.fees}</div>
                        <div style={{ fontSize: 11, color: '#8892A4', marginTop: 2 }}>Claimable Fees</div>
                      </div>
                    </div>
                    <button 
                      className="btn-primary" 
                      onClick={handleClaimFees}
                      style={{ padding: '6px 14px', fontSize: 12, minHeight: 32, background: 'linear-gradient(135deg, #00C076, #00A86B)' }}
                    >
                      Claim Fees
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Staking */}
        {activeTab === 'staking' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ fontSize: 16 }}>Staking Pools Ledger</h2>
              <button className="btn-primary" onClick={() => navigate('/stake')} style={{ padding: '6px 14px', fontSize: 12, minHeight: 32 }}>
                Stake Tokens
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staked Amount</th>
                    <th>APY Rate</th>
                    <th>Lock Duration</th>
                    <th>Maturity Date</th>
                    <th>Est. Rewards</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stakes.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#8892A4', padding: '48px 0' }}>
                        <Info size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>No staking contracts detected</div>
                        <div style={{ fontSize: 12, color: '#404858', marginTop: 4 }}>Lock BON to earn yield in the Staking Portal.</div>
                      </td>
                    </tr>
                  ) : (
                    stakes.map((s) => {
                      const isStaked = s.status === 'Staked'
                      const isExpired = new Date(s.unlockDate).getTime() < Date.now()

                      return (
                        <tr key={s.id}>
                          <td>
                            <span className="font-mono text-sm font-semibold text-[#E8EAF2]">
                              {s.amount.toLocaleString()} BON
                            </span>
                          </td>
                          <td>
                            <span className="font-mono text-sm text-[#00C076] font-bold">
                              {s.apy.toFixed(1)}% APY
                            </span>
                          </td>
                          <td style={{ color: '#8892A4', fontSize: 13 }}>{s.duration} Days</td>
                          <td className="font-mono text-xs">
                            {new Date(s.unlockDate).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td>
                            <span className="font-mono text-sm text-[#00C076] font-semibold">
                              +{s.rewards.toFixed(2)} BON
                            </span>
                          </td>
                          <td>
                            <span style={{ 
                              color: s.status === 'Staked' ? (isExpired ? '#00C076' : '#FF6B00') : '#8892A4',
                              background: s.status === 'Staked' 
                                ? (isExpired ? 'rgba(0,192,118,0.1)' : 'rgba(255,107,0,0.1)') 
                                : 'rgba(255,255,255,0.03)',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4
                            }}>
                              {s.status === 'Staked' ? (isExpired ? 'Matured' : 'Locked') : s.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isStaked ? (
                              <button
                                className="btn-outline"
                                onClick={() => handleUnstakeClick(s)}
                                disabled={unstakingId === s.id}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: 11,
                                  minHeight: 28,
                                  borderColor: isExpired ? '#00C076' : 'rgba(255,255,255,0.1)',
                                  color: isExpired ? '#00C076' : '#E8EAF2',
                                  background: isExpired ? 'rgba(0,192,118,0.02)' : 'transparent'
                                }}
                              >
                                {unstakingId === s.id ? <Loader2 size={12} className="animate-spin" /> : isExpired ? 'Claim' : 'Unstake Early'}
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: '#404858' }}>Claimed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Futures */}
        {activeTab === 'futures' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ fontSize: 16 }}>Open Leverage Positions</h2>
              <button className="btn-primary" onClick={() => navigate('/futures')} style={{ padding: '6px 14px', fontSize: 12, minHeight: 32 }}>
                Trade Futures
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Type</th>
                    <th>Margin (BON)</th>
                    <th>Entry Price</th>
                    <th>Mark Price</th>
                    <th>Liquidation Price</th>
                    <th>Unrealized PNL</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {futures.filter(f => f.status === 'Open').length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#8892A4', padding: '48px 0' }}>
                        <Info size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>No open leverage positions</div>
                        <div style={{ fontSize: 12, color: '#404858', marginTop: 4 }}>Execute perpetual futures trades to open contracts.</div>
                      </td>
                    </tr>
                  ) : (
                    futures.filter(f => f.status === 'Open').map(f => {
                      const currentPrice = getTokenPrice(f.symbol)
                      const priceDiffRatio = (currentPrice - f.entryPrice) / f.entryPrice
                      const pnl = f.type === 'Long'
                        ? priceDiffRatio * f.margin * f.leverage
                        : -priceDiffRatio * f.margin * f.leverage
                      const pnlPercent = (pnl / f.margin) * 100

                      return (
                        <tr key={f.id}>
                          <td>
                            <span style={{ fontWeight: 700 }}>{f.symbol}/BON</span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              color: f.type === 'Long' ? '#00C076' : '#FF3B5C',
                              background: f.type === 'Long' ? 'rgba(0,192,118,0.08)' : 'rgba(255,59,92,0.08)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 700
                            }}>
                              {f.type} {f.leverage}x
                            </span>
                          </td>
                          <td>
                            <span className="font-mono text-sm text-[#E8EAF2]">
                              {f.margin.toFixed(2)} BON
                            </span>
                          </td>
                          <td className="font-mono text-sm">${f.entryPrice.toFixed(4)}</td>
                          <td className="font-mono text-sm">${currentPrice.toFixed(4)}</td>
                          <td className="font-mono text-sm text-[#FF3B5C]" style={{ fontWeight: 500 }}>
                            ${f.liquidationPrice.toFixed(4)}
                          </td>
                          <td>
                            <span className="font-mono text-sm font-bold" style={{ color: pnl >= 0 ? '#00C076' : '#FF3B5C' }}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} BON
                              <div style={{ fontSize: 10, color: '#8892A4', fontWeight: 400 }}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% (≈ ${ (pnl * getTokenPrice('BON')).toFixed(2) })
                              </div>
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline"
                              onClick={() => executeCloseFutures(f.id, f.symbol)}
                              disabled={closingPositionId === f.id}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                minHeight: 26,
                                borderColor: '#FF3B5C',
                                color: '#FF3B5C',
                                background: 'rgba(255,59,92,0.02)'
                              }}
                            >
                              {closingPositionId === f.id ? <Loader2 size={12} className="animate-spin" /> : 'Market Close'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Options */}
        {activeTab === 'options' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ fontSize: 16 }}>Active Option Slips</h2>
              <button className="btn-primary" onClick={() => navigate('/options')} style={{ padding: '6px 14px', fontSize: 12, minHeight: 32 }}>
                Buy Options
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Strike Price</th>
                    <th>Current Price</th>
                    <th>Premium (BON)</th>
                    <th>Time Remaining</th>
                    <th>Est. Profit / Loss</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {options.filter(o => o.status === 'Active').length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: '#8892A4', padding: '48px 0' }}>
                        <Info size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>No active options slips</div>
                        <div style={{ fontSize: 12, color: '#404858', marginTop: 4 }}>Purchase Call or Put slips inside the Options terminal.</div>
                      </td>
                    </tr>
                  ) : (
                    options.filter(o => o.status === 'Active').map(o => {
                      const currentPrice = getTokenPrice(o.symbol)
                      let payout = 0
                      if (o.contractType === 'Call') {
                        if (currentPrice > o.strikePrice) {
                          payout = o.quantity * (currentPrice - o.strikePrice)
                        }
                      } else {
                        if (currentPrice < o.strikePrice) {
                          payout = o.quantity * (o.strikePrice - currentPrice)
                        }
                      }
                      const profit = payout - o.premium

                      // Expiry calculations
                      const expiryTime = new Date(o.expiry).getTime()
                      const now = Date.now()
                      const minutesLeft = Math.max(0, Math.ceil((expiryTime - now) / 60000))

                      return (
                        <tr key={o.id}>
                          <td>
                            <span style={{ fontWeight: 700 }}>{o.symbol}/BON</span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              color: o.contractType === 'Call' ? '#00C076' : '#FF3B5C',
                              background: o.contractType === 'Call' ? 'rgba(0,192,118,0.08)' : 'rgba(255,59,92,0.08)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 700
                            }}>
                              {o.contractType}
                            </span>
                          </td>
                          <td className="font-mono text-sm">{o.quantity.toLocaleString()}</td>
                          <td className="font-mono text-sm">${o.strikePrice.toFixed(4)}</td>
                          <td className="font-mono text-sm">${currentPrice.toFixed(4)}</td>
                          <td className="font-mono text-sm">{o.premium.toFixed(2)} BON</td>
                          <td>
                            <span style={{ fontSize: 13, color: minutesLeft <= 2 ? '#FF3B5C' : '#F0A500', fontWeight: 600 }}>
                              {minutesLeft > 0 ? `${minutesLeft} min left` : 'Expired'}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono text-sm font-bold" style={{ color: profit >= 0 ? '#00C076' : '#FF3B5C' }}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(2)} BON
                              <div style={{ fontSize: 10, color: '#8892A4', fontWeight: 400 }}>
                                {payout > 0 ? `Payout: ${payout.toFixed(2)} BON` : 'Out of the Money'}
                              </div>
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-outline"
                              onClick={() => executeSettleOption(o.id, o.symbol)}
                              disabled={exercisingOptionId === o.id}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                minHeight: 26,
                                borderColor: '#00C076',
                                color: '#00C076',
                                background: 'rgba(0,192,118,0.02)'
                              }}
                            >
                              {exercisingOptionId === o.id ? <Loader2 size={12} className="animate-spin" /> : 'Settle'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: History Log */}
        {activeTab === 'history' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h2 className="card-title" style={{ fontSize: 16 }}>Composite History Ledger</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Asset</th>
                    <th>Details</th>
                    <th>Value / PNL</th>
                    <th>Outcome</th>
                    <th style={{ textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#8892A4', padding: '48px 0' }}>
                        <Info size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>No operations logged</div>
                        <div style={{ fontSize: 12, color: '#404858', marginTop: 4 }}>History log compiles your spot trades, staking claims, and closed futures/options contracts.</div>
                      </td>
                    </tr>
                  ) : (
                    combinedHistory.map((h, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{ 
                            background: `${h.color}15`, 
                            color: h.color, 
                            fontSize: 10, 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: 4,
                            textTransform: 'uppercase'
                          }}>
                            {h.type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{h.asset}</span>
                        </td>
                        <td style={{ color: '#8892A4', fontSize: 13 }}>{h.detail}</td>
                        <td>
                          <span className="font-mono text-sm font-semibold" style={{ color: h.color }}>
                            {h.amount}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            color: h.status.includes('Liquidated') || h.status.includes('Early') ? '#FF3B5C' : '#8892A4',
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {h.status}
                          </span>
                        </td>
                        <td style={{ color: '#404858', fontSize: 12, textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                          {h.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {h.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EARLY UNSTAKE MODAL OVERLAY */}
        {earlyUnstakeTarget && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}>
            <div className="card" style={{ maxWidth: 430, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid rgba(255, 59, 92, 0.2)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <AlertTriangle size={36} color="#FF3B5C" style={{ flexShrink: 0 }} />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#E8EAF2' }}>Early Unstake Penalization Warning!</h3>
                  <p style={{ color: '#8892A4', fontSize: 12, marginTop: 4, lineHeight: '1.4' }}>
                    You are attempting to unstake before your designated maturity date. early withdrawals incur a severe principal deduction penalty and completely lose all pending staking rewards.
                  </p>
                </div>
              </div>

              <div style={{ background: '#111520', borderRadius: 8, padding: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: '#8892A4' }}>Staked Principal</span>
                  <span className="font-mono">{earlyUnstakeTarget.amount.toLocaleString()} BON</span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', color: '#FF3B5C' }}>
                  <span>Early Penalty (15% Principal)</span>
                  <span className="font-mono">-${(earlyUnstakeTarget.amount * 0.15).toFixed(2)} BON</span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', color: '#8892A4' }}>
                  <span>Forfeited Rewards</span>
                  <span className="font-mono">-${earlyUnstakeTarget.rewards.toFixed(2)} BON</span>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, fontWeight: 700, color: '#E8EAF2' }}>
                  <span>Total Receive Payout</span>
                  <span className="font-mono">{(earlyUnstakeTarget.amount * 0.85).toFixed(2)} BON</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <button 
                  className="btn-outline" 
                  onClick={() => setEarlyUnstakeTarget(null)}
                  style={{ minHeight: 38, fontSize: 12 }}
                >
                  Cancel & Keep Locked
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => executeUnstake(earlyUnstakeTarget.id)}
                  style={{ 
                    minHeight: 38, 
                    fontSize: 12,
                    background: 'linear-gradient(135deg, #FF3B5C, #CC2244)',
                    color: '#E8EAF2'
                  }}
                >
                  Unstake & Pay Penalty
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
