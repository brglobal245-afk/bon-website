import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useConnectModal, ConnectButton } from '@rainbow-me/rainbowkit'
import { 
  ArrowLeftRight, Search, TrendingUp, TrendingDown, 
  Coins, ArrowUpDown, Loader2, Sparkles, History, 
  Wallet, CheckCircle2, AlertCircle, LineChart, Info, 
  ExternalLink, ArrowUpRight, Flame, Database, Plus,
  ShieldAlert, HelpCircle, ChevronRight, RefreshCw, BarChart2,
  Hourglass, ShieldCheck, Timer, ChevronDown,
  Percent, Calendar, AlertTriangle, Lock, Zap,
  Sun, Moon
} from 'lucide-react'
import { auth, db, isFirebaseConfigured } from '../firebase'
import { useToast } from '../context/ToastContext'

// Services Imports
import { 
  executeSpotTrade, 
  subscribeToUserOrders, 
  subscribeToGlobalTrades,
  subscribeToUserBalances
} from '../services/tradeService'
import { subscribeToTokens } from '../services/tokenService'
import { 
  openFuturesPosition, 
  closeFuturesPosition, 
  subscribeToFuturesPositions,
  calculateLiquidationPrice 
} from '../services/futuresService'
import { 
  purchaseOptionsContract, 
  exerciseOption, 
  subscribeToOptions 
} from '../services/optionsService'
import { 
  stakeBON, 
  unstakeBON, 
  subscribeToStakes, 
  STAKING_PLANS 
} from '../services/stakingService'

import TradingViewChart from '../components/TradingViewChart'

// Formatting Helpers
function fmtVal(n) {
  if (n === undefined || n === null) return '$0.00'
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function fmtPrice(n) {
  if (n === undefined || n === null) return '$0.00'
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(7)}`
}

// Generate historical candles
const generateMockHistory = (basePrice, pointsCount = 45) => {
  const history = []
  let currentPrice = basePrice * 0.82
  let now = Date.now()
  const interval = 15 * 60 * 1000

  for (let i = pointsCount - 1; i >= 0; i--) {
    const time = now - i * interval
    const change = (Math.random() - 0.47) * 0.045
    const open = currentPrice
    const close = currentPrice * (1 + change)
    const high = Math.max(open, close) * (1 + Math.random() * 0.012)
    const low = Math.min(open, close) * (1 - Math.random() * 0.012)
    
    history.push({ time, open, close, high, low })
    currentPrice = close
  }
  return history
}

export default function Swap() {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast, updateToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const userId = address || auth?.currentUser?.uid || 'session_user'

  // Trading Mode Tab State ('spot', 'futures', 'options', 'stake')
  const [tradingMode, setTradingMode] = useState(() => {
    const mode = searchParams.get('mode')
    return ['spot', 'futures', 'options', 'stake'].includes(mode) ? mode : 'spot'
  })

  // Sync mode changes with React state
  const handleTradingModeChange = (mode) => {
    setTradingMode(mode)
    const newParams = { mode }
    // Maintain active token if valid
    const currentToken = searchParams.get('token')
    if (currentToken) {
      if (mode === 'futures' && currentToken.toUpperCase() === 'USDT') {
        // Futures excludes USDT, so skip
      } else {
        newParams.token = currentToken
      }
    }
    setSearchParams(newParams)
  }

  useEffect(() => {
    const mode = searchParams.get('mode') || 'spot'
    if (mode !== tradingMode && ['spot', 'futures', 'options', 'stake'].includes(mode)) {
      setTradingMode(mode)
    }
  }, [searchParams])

  // Token & Firebase State
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [marketFilter, setMarketFilter] = useState('all') // all, trending

  // Trading Selection
  const [selectedToken, setSelectedToken] = useState(null)
  const [chartType, setChartType] = useState('candle') // candle, line
  const [timeframe, setTimeframe] = useState('15m')
  const [chartHistory, setChartHistory] = useState([])
  
  // Shared active sub-loading state for transactions
  const [tradeLoading, setTradeLoading] = useState(false)

  // Spot Form States
  const [spotTab, setSpotTab] = useState('buy') // buy, sell
  const [orderType, setOrderType] = useState('market') // market, limit
  const [spotAmount, setSpotAmount] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [spotTotal, setSpotTotal] = useState('')

  // Futures Form States
  const [futuresTradeType, setFuturesTradeType] = useState('Long') // Long or Short
  const [leverage, setLeverage] = useState(20)
  const [futuresMargin, setFuturesMargin] = useState('')
  const [positions, setPositions] = useState([])
  const [closingId, setClosingId] = useState(null)

  // Options Form States
  const [optionsContractType, setOptionsContractType] = useState('Call') // Call or Put
  const [optionsQuantity, setOptionsQuantity] = useState('10')
  const [optionsExpiry, setOptionsExpiry] = useState('5') // minutes
  const [optionsContracts, setOptionsContracts] = useState([])
  const [settlingId, setSettlingId] = useState(null)

  // Staking Form States
  const [stakeAmount, setStakeAmount] = useState('')
  const [stakeLockupDays, setStakeLockupDays] = useState(30)
  const [stakes, setStakes] = useState([])
  const [unstakingId, setUnstakingId] = useState(null)
  const [earlyUnstakeTarget, setEarlyUnstakeTarget] = useState(null)

  // Active Bottom Tab
  const [bottomTab, setBottomTab] = useState('trades') // trades, portfolio, positions, options, stakes

  // Theme
  const [lightMode, setLightMode] = useState(false)

  // Options chain filters + countdown
  const [optionsFilter, setOptionsFilter] = useState({ aroundATM: true, strikeRange: false, strikeDistance: false, expectedRange: false })
  const [chainCountdown, setChainCountdown] = useState('--:--:--')

  // Local/Simulated balances stored persistently
  const [balances, setBalances] = useState({
    BON: 12480.00,
    USDT: 500.00,
    ETH: 0.4820,
    MOON: 500000.00,
    DFG: 0.00,
    RKT: 0.00,
    SAFE: 1000.00,
    BONAI: 0.00
  })

  // Live order/trade execution simulations
  const [recentTrades, setRecentTrades] = useState([])

  // Realtime Firestore synchronization for tokens
  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToTokens(
      (formatted) => {
        setTokens(formatted)
        setLoading(false)
      },
      (error) => {
        console.error('Realtime tokens subscriber error, falling back to mocks:', error)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  // Realtime Firestore synchronization for user balances
  useEffect(() => {
    const unsubscribe = subscribeToUserBalances(userId, (newBalances) => {
      if (newBalances) {
        setBalances(newBalances)
      }
    })
    return () => unsubscribe()
  }, [userId])

  // Realtime Firestore synchronization for Futures positions
  useEffect(() => {
    if (tradingMode !== 'futures') return
    const unsubscribe = subscribeToFuturesPositions(userId, setPositions)
    return () => unsubscribe()
  }, [userId, tradingMode])

  // Realtime Firestore synchronization for Options contracts
  useEffect(() => {
    if (tradingMode !== 'options') return
    const unsubscribe = subscribeToOptions(userId, setOptionsContracts)
    return () => unsubscribe()
  }, [userId, tradingMode])

  // Realtime Firestore synchronization for Stakes
  useEffect(() => {
    if (tradingMode !== 'stake') return
    const unsubscribe = subscribeToStakes(userId, setStakes)
    return () => unsubscribe()
  }, [userId, tradingMode])

  // Automatically select active token based on URL query parameter or fallback
  useEffect(() => {
    if (tokens.length === 0) return

    if (tradingMode === 'stake') {
      const bonToken = tokens.find((t) => t.symbol === 'BON')
      if (bonToken) {
        setSelectedToken(bonToken)
      }
      return
    }

    const querySymbol = searchParams.get('token')
    if (querySymbol) {
      const found = tokens.find((t) => t.symbol.toUpperCase() === querySymbol.toUpperCase())
      if (found) {
        if (tradingMode === 'futures' && found.symbol === 'USDT') {
          // USDT is excluded in futures, fallback
        } else {
          setSelectedToken(found)
          return
        }
      }
    }

    // Default selection
    const defaultSymbol = tradingMode === 'futures' ? 'ETH' : 'BON'
    const defaultToken = tokens.find((t) => t.symbol === defaultSymbol) || tokens[0]
    setSelectedToken(defaultToken)
  }, [tokens, searchParams, tradingMode])

  // Sync Limit Price field when selected token changes
  useEffect(() => {
    if (selectedToken) {
      setLimitPrice(selectedToken.price.toFixed(5))
    }
  }, [selectedToken?.symbol])

  // Generate charting data history
  useEffect(() => {
    if (!selectedToken) return
    const history = generateMockHistory(selectedToken.price)
    setChartHistory(history)
  }, [selectedToken?.symbol])

  // Simulate price ticks in real-time
  useEffect(() => {
    if (!selectedToken) return

    const interval = setInterval(() => {
      const pct = (Math.random() - 0.45) * 0.006
      const priceTick = selectedToken.price * (1 + pct)
      const changeTick = selectedToken.change24h + pct * 100

      // Update tokens list state
      setTokens((prev) =>
        prev.map((t) => {
          if (t.symbol === selectedToken.symbol) {
            return {
              ...t,
              price: priceTick,
              change24h: changeTick,
              volume24h: t.volume24h + Math.random() * 80
            }
          }
          return t
        })
      )

      // Update active token
      setSelectedToken((prev) => {
        if (!prev) return null
        return {
          ...prev,
          price: priceTick,
          change24h: changeTick,
          volume24h: prev.volume24h + Math.random() * 80
        }
      })

      // Update chart history
      setChartHistory((prev) => {
        if (!prev || prev.length === 0) return prev
        const next = [...prev]
        const last = { ...next[next.length - 1] }
        last.close = priceTick
        if (priceTick > last.high) last.high = priceTick
        if (priceTick < last.low) last.low = priceTick
        next[next.length - 1] = last
        return next
      })
    }, 4500)

    return () => clearInterval(interval)
  }, [selectedToken?.symbol])

  // Sync live recent trades (Spot)
  useEffect(() => {
    if (!selectedToken || tradingMode !== 'spot') return

    let firestoreUnsubscribe = () => {}

    if (isFirebaseConfigured && db) {
      firestoreUnsubscribe = subscribeToGlobalTrades(selectedToken.symbol, (tradesList) => {
        if (tradesList && tradesList.length > 0) {
          const formattedTrades = tradesList.map(t => ({
            time: t.time || new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: t.type === 'buy' ? 'Buy' : 'Sell',
            price: t.price,
            amount: t.amount,
            total: t.total,
            self: t.userId === userId
          }))
          setRecentTrades(formattedTrades)
        } else {
          setRecentTrades([])
        }
      })
      return () => firestoreUnsubscribe()
    } else {
      // Simulation recent trades
      const initTrades = []
      const now = Date.now()
      for (let i = 0; i < 15; i++) {
        const isBuy = Math.random() > 0.48
        const price = selectedToken.price * (1 + (Math.random() - 0.5) * 0.007)
        const qty = Math.random() * 600 + 5
        const totalCost = price * qty
        const timeStr = new Date(now - i * 18000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        initTrades.push({ time: timeStr, type: isBuy ? 'Buy' : 'Sell', price, amount: qty, total: totalCost })
      }
      setRecentTrades(initTrades)

      const interval = setInterval(() => {
        const isBuy = Math.random() > 0.48
        const price = selectedToken.price * (1 + (Math.random() - 0.5) * 0.003)
        const qty = Math.random() * 320 + 2
        const totalCost = price * qty
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        setRecentTrades((prev) => [
          { time: timeStr, type: isBuy ? 'Buy' : 'Sell', price, amount: qty, total: totalCost },
          ...prev.slice(0, 19)
        ])
      }, 3500)

      return () => clearInterval(interval)
    }
  }, [selectedToken?.symbol, userId, tradingMode])

  // Automatically adjust bottomTab based on mode
  useEffect(() => {
    if (tradingMode === 'spot') setBottomTab('trades')
    else if (tradingMode === 'futures') setBottomTab('positions')
    else if (tradingMode === 'options') setBottomTab('options')
    else if (tradingMode === 'stake') setBottomTab('stakes')
  }, [tradingMode])

  // Spot math updates
  const updateSpotAmount = (val) => {
    setSpotAmount(val)
    if (!selectedToken) return
    const p = orderType === 'market' ? selectedToken.price : parseFloat(limitPrice) || selectedToken.price
    const amt = parseFloat(val)
    if (!isNaN(amt)) {
      setSpotTotal((amt * p).toFixed(4))
    } else {
      setSpotTotal('')
    }
  }

  const updateSpotTotal = (val) => {
    setSpotTotal(val)
    if (!selectedToken) return
    const p = orderType === 'market' ? selectedToken.price : parseFloat(limitPrice) || selectedToken.price
    const tot = parseFloat(val)
    if (!isNaN(tot) && tot > 0) {
      setSpotAmount((tot / p).toFixed(4))
    } else {
      setSpotAmount('')
    }
  }

  const handleSpotPercentageSlider = (pct) => {
    if (!selectedToken) return
    const p = orderType === 'market' ? selectedToken.price : parseFloat(limitPrice) || selectedToken.price
    const availableBON = balances?.BON || 0
    if (spotTab === 'buy') {
      const spendable = availableBON * pct
      setSpotTotal(spendable.toFixed(4))
      setSpotAmount((spendable / p).toFixed(4))
    } else {
      const availableToken = balances?.[selectedToken.symbol] || 0
      const sellAmount = availableToken * pct
      setSpotAmount(sellAmount.toFixed(4))
      setSpotTotal((sellAmount * p).toFixed(4))
    }
  }

  // --- ACTIONS ---

  // Spot Swap Execution
  const executeSpotSwap = async () => {
    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal()
      } else {
        addToast({
          type: 'error',
          title: 'Wallet Required',
          message: 'Please connect your Web3 wallet using the header button to start trading.'
        })
      }
      return
    }

    const amt = parseFloat(spotAmount)
    if (isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount to trade.' })
      return
    }

    const price = orderType === 'market' ? selectedToken.price : parseFloat(limitPrice)
    if (isNaN(price) || price <= 0) {
      addToast({ type: 'error', title: 'Invalid Price', message: 'Please check your trade price.' })
      return
    }

    const totalCost = amt * price

    // Balance checks
    if (spotTab === 'buy') {
      if ((balances?.BON || 0) < totalCost) {
        addToast({
          type: 'error',
          title: 'Insufficient BON',
          message: `Required: ${totalCost.toFixed(2)} BON. Available: ${(balances?.BON || 0).toFixed(2)} BON.`
        })
        return
      }
    } else {
      const currentTokenBalance = balances?.[selectedToken.symbol] || 0
      if (currentTokenBalance < amt) {
        addToast({
          type: 'error',
          title: `Insufficient ${selectedToken.symbol}`,
          message: `Required: ${amt.toFixed(4)} ${selectedToken.symbol}. Available: ${currentTokenBalance.toFixed(4)} ${selectedToken.symbol}.`
        })
        return
      }
    }

    setTradeLoading(true)
    const toastId = addToast({
      type: 'pending',
      title: spotTab === 'buy' ? 'Swapping BON' : `Swapping ${selectedToken.symbol}`,
      message: spotTab === 'buy'
        ? `Trading ${totalCost.toFixed(4)} BON for ${amt.toFixed(4)} ${selectedToken.symbol}...`
        : `Trading ${amt.toFixed(4)} ${selectedToken.symbol} for ${totalCost.toFixed(4)} BON...`
    })

    try {
      await executeSpotTrade(
        userId,
        selectedToken.symbol,
        spotTab,
        amt,
        price,
        orderType === 'limit'
      )

      setSpotAmount('')
      setSpotTotal('')

      updateToast(toastId, {
        type: 'success',
        title: 'Transaction Confirmed',
        message: spotTab === 'buy'
          ? `Swapped ${totalCost.toFixed(2)} BON for ${amt.toFixed(4)} ${selectedToken.symbol} at ${fmtPrice(price)}.`
          : `Swapped ${amt.toFixed(4)} ${selectedToken.symbol} for ${totalCost.toFixed(2)} BON at ${fmtPrice(price)}.`
      })
    } catch (err) {
      console.error(err)
      updateToast(toastId, {
        type: 'error',
        title: 'Transaction Failed',
        message: err.message || 'An error occurred during transaction execution.'
      })
    } finally {
      setTradeLoading(false)
    }
  }

  // Futures Position Execution
  const executeFuturesTrade = async () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal()
      else addToast({ type: 'error', title: 'Wallet Required', message: 'Please connect your Web3 wallet.' })
      return
    }

    const marginAmt = parseFloat(futuresMargin)
    if (isNaN(marginAmt) || marginAmt <= 0) {
      addToast({ type: 'error', title: 'Invalid Margin', message: 'Please enter a valid BON margin amount.' })
      return
    }

    if ((balances?.BON || 0) < marginAmt) {
      addToast({
        type: 'error',
        title: 'Insufficient Balance',
        message: `Required: ${marginAmt.toFixed(2)} BON. Available: ${(balances?.BON || 0).toFixed(2)} BON.`
      })
      return
    }

    setTradeLoading(true)
    const toastId = addToast({
      type: 'pending',
      title: `Opening ${leverage}x ${futuresTradeType}`,
      message: `Placing leveraged contract for ${selectedToken?.symbol} with ${marginAmt} BON margin.`
    })

    try {
      await openFuturesPosition(
        userId,
        selectedToken.symbol,
        futuresTradeType,
        leverage,
        marginAmt,
        selectedToken.price
      )

      updateToast(toastId, {
        type: 'success',
        title: 'Position Opened',
        message: `Successfully opened ${leverage}x ${futuresTradeType} on ${selectedToken.symbol} at $${selectedToken.price.toFixed(4)}.`
      })
      setFuturesMargin('')
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Order Failed',
        message: e.message || 'Could not place leverage position.'
      })
    } finally {
      setTradeLoading(false)
    }
  }

  const handleCloseFuturesPosition = async (pos) => {
    const markToken = tokens.find((t) => t.symbol === pos.symbol)
    const markPrice = markToken ? markToken.price : pos.entryPrice

    setClosingId(pos.id)
    const toastId = addToast({
      type: 'pending',
      title: 'Closing Position',
      message: `Closing leverage contract on ${pos.symbol} at $${markPrice.toFixed(4)}.`
    })

    try {
      const res = await closeFuturesPosition(userId, pos.id, markPrice)
      if (res.liquidated) {
        updateToast(toastId, {
          type: 'error',
          title: 'Position Liquidated',
          message: `Position on ${pos.symbol} was liquidated at $${markPrice.toFixed(4)}.`
        })
      } else {
        updateToast(toastId, {
          type: 'success',
          title: 'Position Closed',
          message: `Closed position at $${markPrice.toFixed(4)} with PnL of ${res.pnl >= 0 ? '+' : ''}${res.pnl.toFixed(2)} BON.`
        })
      }
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Close Failed',
        message: e.message || 'Could not close position.'
      })
    } finally {
      setClosingId(null)
    }
  }

  // Options Contract Purchase
  const executeOptionsPurchase = async () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal()
      else addToast({ type: 'error', title: 'Wallet Required', message: 'Please connect your Web3 wallet.' })
      return
    }

    const qty = parseFloat(optionsQuantity)
    if (isNaN(qty) || qty <= 0) {
      addToast({ type: 'error', title: 'Invalid Quantity', message: 'Please enter a valid contract quantity.' })
      return
    }

    const premiumCost = qty * selectedToken.price * 0.06
    if ((balances?.BON || 0) < premiumCost) {
      addToast({
        type: 'error',
        title: 'Insufficient Balance',
        message: `Premium: ${premiumCost.toFixed(2)} BON required. Available: ${(balances?.BON || 0).toFixed(2)} BON.`
      })
      return
    }

    setTradeLoading(true)
    const toastId = addToast({
      type: 'pending',
      title: `Buying Option Contract`,
      message: `Purchasing ${qty} ${selectedToken.symbol} ${optionsContractType} Option.`
    })

    try {
      await purchaseOptionsContract(
        userId,
        selectedToken.symbol,
        optionsContractType,
        qty,
        selectedToken.price,
        parseInt(optionsExpiry)
      )

      updateToast(toastId, {
        type: 'success',
        title: 'Option Purchased',
        message: `Successfully purchased option contract. Strike: $${selectedToken.price.toFixed(4)}.`
      })
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Purchase Failed',
        message: e.message || 'Could not purchase options contract.'
      })
    } finally {
      setTradeLoading(false)
    }
  }

  const handleSettleOption = async (opt) => {
    const markToken = tokens.find((t) => t.symbol === opt.symbol)
    const markPrice = markToken ? markToken.price : opt.strikePrice

    setSettlingId(opt.id)
    const toastId = addToast({
      type: 'pending',
      title: 'Settling Option Contract',
      message: `Settling option on ${opt.symbol} at mark price $${markPrice.toFixed(4)}.`
    })

    try {
      const res = await exerciseOption(userId, opt.id, markPrice)
      if (res.payout > 0) {
        updateToast(toastId, {
          type: 'success',
          title: 'Option Settled (ITM)',
          message: `In the Money! Received payout of ${res.payout.toFixed(2)} BON (Profit: ${res.profit.toFixed(2)} BON).`
        })
      } else {
        updateToast(toastId, {
          type: 'error',
          title: 'Option Expired (OTM)',
          message: `Out of the Money. Premium of ${opt.premium.toFixed(2)} BON lost.`
        })
      }
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Settlement Failed',
        message: e.message || 'Could not settle option contract.'
      })
    } finally {
      setSettlingId(null)
    }
  }

  // Staking Depositing
  const executeStakeBON = async () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal()
      else addToast({ type: 'error', title: 'Wallet Required', message: 'Please connect your Web3 wallet.' })
      return
    }

    const amt = parseFloat(stakeAmount)
    if (isNaN(amt) || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid amount of BON to stake.' })
      return
    }

    if ((balances?.BON || 0) < amt) {
      addToast({
        type: 'error',
        title: 'Insufficient BON',
        message: `Staking: ${amt.toFixed(2)} BON. Available: ${(balances?.BON || 0).toFixed(2)} BON.`
      })
      return
    }

    setTradeLoading(true)
    const toastId = addToast({
      type: 'pending',
      title: 'Staking BON',
      message: `Staking ${amt.toFixed(2)} BON for ${stakeLockupDays} days...`
    })

    try {
      await stakeBON(userId, amt, parseInt(stakeLockupDays))
      updateToast(toastId, {
        type: 'success',
        title: 'Staked Successfully',
        message: `Deposited ${amt.toFixed(2)} BON into staking pool.`
      })
      setStakeAmount('')
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Staking Failed',
        message: e.message || 'Could not execute staking transaction.'
      })
    } finally {
      setTradeLoading(false)
    }
  }

  const handleUnstakeRequest = (stake) => {
    const isEarly = new Date() < new Date(stake.unlockDate)
    if (isEarly) {
      setEarlyUnstakeTarget(stake)
    } else {
      executeUnstake(stake.id)
    }
  }

  const executeUnstake = async (stakeId) => {
    setUnstakingId(stakeId)
    setEarlyUnstakeTarget(null)
    const toastId = addToast({
      type: 'pending',
      title: 'Withdrawing Staked BON',
      message: 'Withdrawing BON tokens and updating balances...'
    })

    try {
      const res = await unstakeBON(userId, stakeId)
      if (res.isEarly) {
        updateToast(toastId, {
          type: 'warning',
          title: 'Early Unstake Successful',
          message: `Withdrew principal with 15% penalty (${res.penalty.toFixed(2)} BON penalty applied).`
        })
      } else {
        updateToast(toastId, {
          type: 'success',
          title: 'Unstaking Successful',
          message: `Claimed principal and APY rewards. Payout: ${res.payoutAmount.toFixed(2)} BON.`
        })
      }
    } catch (e) {
      updateToast(toastId, {
        type: 'error',
        title: 'Unstaking Failed',
        message: e.message || 'Could not execute withdrawal.'
      })
    } finally {
      setUnstakingId(null)
    }
  }

  // Filter and Search markets list
  const filteredTokens = useMemo(() => {
    let result = tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.symbol.toLowerCase().includes(search.toLowerCase())
    )

    if (tradingMode === 'futures') {
      result = result.filter((t) => t.symbol !== 'USDT')
    }

    if (marketFilter === 'trending') {
      result = result.filter((t) => t.trending || t.change24h > 15)
    }
    
    return result.sort((a, b) => b.volume24h - a.volume24h)
  }, [tokens, search, marketFilter, tradingMode])

  // Estimated portfolio worth
  const totalPortfolioValue = useMemo(() => {
    let sum = 0
    const bonPrice = tokens.find(t => t.symbol === 'BON')?.price || 0.09624
    sum += (balances?.BON || 0) * bonPrice

    Object.keys(balances || {}).forEach((sym) => {
      if (sym === 'BON') return
      const tok = tokens.find((t) => t.symbol === sym)
      if (tok) {
        sum += (balances[sym] || 0) * tok.price
      }
    })
    return sum
  }, [balances, tokens])

  // Futures mark/liq preview
  const futuresLiqPreview = useMemo(() => {
    if (!selectedToken) return 0
    return calculateLiquidationPrice(selectedToken.price, leverage, futuresTradeType)
  }, [selectedToken?.price, leverage, futuresTradeType])

  // Staking reward preview
  const stakingPlanSelected = STAKING_PLANS[stakeLockupDays]
  const stakingRewardPreview = useMemo(() => {
    const amt = parseFloat(stakeAmount)
    if (isNaN(amt) || amt <= 0 || !stakingPlanSelected) return 0
    return amt * (stakingPlanSelected.apy / 100) * (stakeLockupDays / 365)
  }, [stakeAmount, stakingPlanSelected, stakeLockupDays])

  // ── Theme color palette ──────────────────────────────────────
  const c = lightMode ? {
    bg: '#EEF0F6', bg2: '#FFFFFF', bg3: '#E2E6EF',
    text: '#131523', text2: '#4A5068', muted: '#8B91A8',
    border: 'rgba(0,0,0,0.08)', border2: 'rgba(0,0,0,0.04)'
  } : {
    bg: '#080A0F', bg2: '#0D1018', bg3: '#12151E',
    text: '#F0F2F8', text2: '#8B91A8', muted: '#555D75',
    border: 'rgba(255,255,255,0.06)', border2: 'rgba(255,255,255,0.04)'
  }

  // ── Options chain mock data ──────────────────────────────────
  const optionsChainData = useMemo(() => {
    if (!selectedToken) return []
    const price = selectedToken.price
    const offsets = [-0.20, -0.15, -0.10, -0.07, -0.05, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15, 0.20]
    return offsets.map(offset => {
      const strike = price * (1 + offset)
      const isATM = offset === 0
      const baseIV = 30 + Math.abs(offset) * 180
      const callDelta = Math.max(0.01, Math.min(0.99, 0.5 + (-offset) * 2.5)).toFixed(5)
      const putDelta = Math.max(0.01, Math.min(0.99, 0.5 - (-offset) * 2.5)).toFixed(5)
      const markIV = (baseIV + (Math.random() - 0.5) * 3).toFixed(1)
      const callMarkRaw = offset < 0 ? price * Math.max(0, (-offset - 0.004) * 0.9) : 0
      const putMarkRaw = offset > 0 ? price * Math.max(0, (offset - 0.004) * 0.9) : 0
      const callMarkPrice = callMarkRaw > 0 ? callMarkRaw.toFixed(6) : '0.0000'
      const putMarkPrice = putMarkRaw > 0 ? putMarkRaw.toFixed(6) : '0.0000'
      return {
        strike, isATM,
        call: {
          askSize: offset < -0.005 ? (Math.random() * 35 + 1).toFixed(2) : '0.00',
          bidSize: offset < -0.005 ? (Math.random() * 35 + 1).toFixed(2) : '0.00',
          openUsdt: offset < -0.005 ? (Math.random() * 4500000 + 100).toFixed(0) : '0',
          delta: callDelta, markPrice: callMarkPrice, markIV,
          bidPrice: callMarkRaw > 0 ? (callMarkRaw * 0.96).toFixed(6) : '0.0000',
          bidIV: (parseFloat(markIV) - 0.6).toFixed(1),
          askPrice: callMarkRaw > 0 ? (callMarkRaw * 1.04).toFixed(6) : '0.0000',
          askIV: (parseFloat(markIV) + 0.6).toFixed(1),
          position: Math.random() > 0.75 ? Math.floor(Math.random() * 300) : 0,
        },
        put: {
          askSize: offset > 0.005 ? (Math.random() * 35 + 1).toFixed(2) : '0.00',
          bidSize: offset > 0.005 ? (Math.random() * 35 + 1).toFixed(2) : '0.00',
          openUsdt: offset > 0.005 ? (Math.random() * 4500000 + 100).toFixed(0) : '0',
          delta: putDelta, markPrice: putMarkPrice, markIV,
          bidPrice: putMarkRaw > 0 ? (putMarkRaw * 0.96).toFixed(6) : '0.0000',
          bidIV: (parseFloat(markIV) - 0.6).toFixed(1),
          askPrice: putMarkRaw > 0 ? (putMarkRaw * 1.04).toFixed(6) : '0.0000',
          askIV: (parseFloat(markIV) + 0.6).toFixed(1),
          position: Math.random() > 0.75 ? Math.floor(Math.random() * 300) : 0,
        }
      }
    })
  }, [selectedToken?.symbol])

  // Countdown for options chain expiry
  useEffect(() => {
    if (tradingMode !== 'options') return
    let seconds = Math.max(60, parseInt(optionsExpiry) * 60)
    const update = () => {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = seconds % 60
      setChainCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      if (seconds > 0) seconds--
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [tradingMode, optionsExpiry])

  if (loading || !selectedToken) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', backgroundColor: '#080A0F', color: '#F0F2F8', gap: 12 }}>
        <Loader2 className="animate-spin" style={{ color: '#F5A623' }} size={32} />
        <span style={{ fontSize: 12, color: '#8B91A8' }}>Loading trading engine...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: c.bg, color: c.text, fontFamily: 'system-ui, sans-serif', overflow: 'hidden', transition: 'background-color 0.3s, color 0.3s' }}>
      
      {/* 1. TOP NAVBAR (56px) */}
      <div style={{ height: 56, minHeight: 56, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0D1018', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10 }}>
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #F5A623, #FF6B00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={15} color="#080A0F" fill="#080A0F" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, tracking: 'wide' }}>
            <span style={{ color: '#F5A623' }}>BON</span> <span style={{ color: '#F0F2F8' }}>Network</span>
          </span>
        </div>

        {/* Center: Tabs */}
        <div style={{ display: 'flex', gap: 4, height: '100%' }}>
          {[
            { id: 'spot', label: 'Spot Swap' },
            { id: 'futures', label: 'Futures' },
            { id: 'options', label: 'Options' },
            { id: 'stake', label: 'Staking' }
          ].map(t => {
            const isActive = tradingMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTradingModeChange(t.id)}
                style={{
                  padding: '0 16px',
                  height: '100%',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  borderBottom: isActive ? '2px solid #F5A623' : '2px solid transparent',
                  color: isActive ? '#F0F2F8' : '#8B91A8',
                  backgroundColor: isActive ? 'rgba(245, 166, 35, 0.03)' : 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Right: Connect Wallet & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Light/Dark toggle */}
          <button
            onClick={() => setLightMode(prev => !prev)}
            title={lightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              width: 34, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: lightMode ? '#F5A623' : '#12151E',
              border: '1px solid ' + (lightMode ? 'transparent' : 'rgba(255,255,255,0.08)'),
              borderRadius: 7, cursor: 'pointer',
              color: lightMode ? '#000' : '#8B91A8',
              transition: 'all 0.2s', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {lightMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {/* Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,208,132,0.08)',
            border: '1px solid rgba(0,208,132,0.15)',
            borderRadius: 20, padding: '4px 10px'
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00D084',
              boxShadow: '0 0 8px #00D084'
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#00D084', fontFamily: 'system-ui, sans-serif' }}>BON Chain Core</span>
          </div>

          {/* Wallet Custom Button */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button 
                          onClick={openConnectModal} 
                          type="button" 
                          style={{
                            backgroundColor: '#F5A623',
                            color: '#000',
                            border: 'none',
                            borderRadius: 10,
                            padding: '14px',
                            fontSize: 13,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            transition: 'filter 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button 
                          onClick={openChainModal} 
                          type="button" 
                          style={{
                            backgroundColor: '#FF4757',
                            color: '#080A0F',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <button
                        onClick={openAccountModal}
                        type="button"
                        style={{
                          backgroundColor: '#12151E',
                          color: '#F0F2F8',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: "'Space Mono', monospace"
                        }}
                      >
                        {account.displayName}
                      </button>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>

      {/* 2. TICKER BAR (36px) */}
      <div className="ticker-wrap" style={{ height: 36, minHeight: 36, borderBottom: '1px solid ' + c.border, backgroundColor: c.bg2, display: 'flex', alignItems: 'center' }}>
        <div className="ticker-content" style={{ display: 'flex', gap: 24, paddingLeft: 24 }}>
          {[...tokens, ...tokens, ...tokens, ...tokens].map((t, idx) => (
            <div 
              key={idx} 
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => {
                if (tradingMode !== 'stake') {
                  setSelectedToken(t);
                  setSearchParams({ mode: tradingMode, token: t.symbol });
                }
              }}
            >
              <span style={{ fontWeight: 600, color: '#8B91A8' }}>{t.symbol}/BON</span>
              <span style={{ fontFamily: "'Space Mono', monospace", color: '#F0F2F8' }}>{fmtPrice(t.price)}</span>
              <span style={{ 
                fontFamily: "'Space Mono', monospace", 
                color: t.change24h >= 0 ? '#00D084' : '#FF4757', 
                fontWeight: 600 
              }}>
                {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. MAIN CONTENTS BELOW TICKER (height fill, three columns) */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 56px - 36px)', width: '100%', overflow: 'hidden' }}>
        
        {/* COLUMN 1: LEFT MARKET LIST (260px) */}
        <div style={{ width: 260, minWidth: 260, borderRight: '1px solid ' + c.border, backgroundColor: c.bg2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Header search & pills */}
          <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeftRight size={12} style={{ color: '#F5A623' }} /> Markets
            </h4>
            
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#555D75' }} />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search markets..."
                style={{
                  width: '100%',
                  backgroundColor: '#12151E',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6,
                  padding: '6px 8px 6px 28px',
                  fontSize: 11,
                  color: '#F0F2F8',
                  fontFamily: 'system-ui, sans-serif'
                }}
              />
            </div>

            {/* Market Filters */}
            <div style={{ display: 'flex', gap: 4, backgroundColor: '#12151E', padding: 2, borderRadius: 4 }}>
              <button 
                onClick={() => setMarketFilter('all')} 
                style={{
                  flex: 1,
                  padding: '4px 0',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: marketFilter === 'all' ? '#181C28' : 'transparent',
                  color: marketFilter === 'all' ? '#F5A623' : '#8B91A8'
                }}
              >
                All
              </button>
              <button 
                onClick={() => setMarketFilter('trending')} 
                style={{
                  flex: 1,
                  padding: '4px 0',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: marketFilter === 'trending' ? '#181C28' : 'transparent',
                  color: marketFilter === 'trending' ? '#F5A623' : '#8B91A8'
                }}
              >
                Hot 🔥
              </button>
            </div>
          </div>

          {/* Tokens List Scroll Area */}
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredTokens.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: '#555D75' }}>
                No markets found
              </div>
            ) : (
              filteredTokens.map((t) => {
                const isActive = selectedToken?.symbol === t.symbol;
                return (
                  <div 
                    key={t.symbol} 
                    onClick={() => {
                      if (tradingMode === 'stake') return;
                      setSelectedToken(t);
                      setSearchParams({ mode: tradingMode, token: t.symbol });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      cursor: tradingMode === 'stake' && t.symbol !== 'BON' ? 'not-allowed' : 'pointer',
                      opacity: tradingMode === 'stake' && t.symbol !== 'BON' ? 0.3 : 1,
                      backgroundColor: isActive ? 'rgba(245,166,35,0.04)' : 'transparent',
                      borderLeft: isActive ? '2px solid #F5A623' : '2px solid transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div 
                        style={{ 
                          width: 28, height: 28, borderRadius: '50%', 
                          backgroundColor: t.color || '#F5A623', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#080A0F', fontSize: 10, fontWeight: 700 
                        }}
                      >
                        {t.symbol[0]}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#F0F2F8' }}>{t.symbol}</span>
                          {t.trending && <Flame size={10} style={{ color: '#F5A623' }} />}
                        </div>
                        <span style={{ fontSize: 9, color: '#8B91A8', display: 'block', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#F0F2F8', fontFamily: "'Space Mono', monospace", display: 'block' }}>{fmtPrice(t.price)}</span>
                      <span style={{ 
                        fontSize: 9, 
                        fontWeight: 600, 
                        fontFamily: "'Space Mono', monospace", 
                        color: t.change24h >= 0 ? '#00D084' : '#FF4757' 
                      }}>
                        {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: CENTER PANEL (Chart + Trade Book) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Chart Header Stats */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0D1018', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', minHeight: 44 }}>
            
            {/* Pair Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F0F2F8' }}>
                {tradingMode === 'stake' ? 'BON Staking' : `${selectedToken.symbol}/BON`}
              </span>
              {selectedToken.trending && <Flame size={12} style={{ color: '#F5A623' }} />}
            </div>

            {/* Price */}
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{fmtPrice(selectedToken.price)}</span>
            </div>

            {/* 24h Change */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#8B91A8' }}>24h Change</span>
              <span style={{ 
                fontSize: 10, 
                fontWeight: 600, 
                fontFamily: "'Space Mono', monospace", 
                color: selectedToken.change24h >= 0 ? '#00D084' : '#FF4757'
              }}>
                {selectedToken.change24h >= 0 ? '+' : ''}{selectedToken.change24h.toFixed(2)}%
              </span>
            </div>

            {/* High/Low */}
            <div style={{ display: 'flex', gap: 12 }} className="hidden sm:flex">
              <div>
                <span style={{ fontSize: 10, color: '#8B91A8' }}>24h High </span>
                <span style={{ fontSize: 10, color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{fmtPrice(selectedToken.price * 1.05)}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: '#8B91A8' }}>24h Low </span>
                <span style={{ fontSize: 10, color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{fmtPrice(selectedToken.price * 0.94)}</span>
              </div>
            </div>

            {/* 24h Volume */}
            <div>
              <span style={{ fontSize: 10, color: '#8B91A8' }}>24h Volume </span>
              <span style={{ fontSize: 10, color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{fmtVal(selectedToken.volume24h)}</span>
            </div>

            {/* Chart Type / Timeframe Toggles */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              {tradingMode !== 'stake' && (
                <>
                  {/* Candle / Line */}
                  <div style={{ display: 'flex', backgroundColor: '#12151E', padding: 2, borderRadius: 4, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <button 
                      onClick={() => setChartType('candle')}
                      style={{
                        padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 600, border: 'none', cursor: 'pointer',
                        backgroundColor: chartType === 'candle' ? '#181C28' : 'transparent',
                        color: chartType === 'candle' ? '#F5A623' : '#8B91A8'
                      }}
                    >
                      Candles
                    </button>
                    <button 
                      onClick={() => setChartType('line')}
                      style={{
                        padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 600, border: 'none', cursor: 'pointer',
                        backgroundColor: chartType === 'line' ? '#181C28' : 'transparent',
                        color: chartType === 'line' ? '#F5A623' : '#8B91A8'
                      }}
                    >
                      Line
                    </button>
                  </div>

                  {/* Timeframes */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['1m', '5m', '15m', '1h', '4h', '1D'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        style={{
                          backgroundColor: timeframe === tf ? '#12151E' : 'transparent',
                          color: timeframe === tf ? '#F5A623' : '#555D75',
                          border: 'none', borderRadius: 3, padding: '3px 6px', fontSize: 9, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chart Area */}
          <div style={{ flex: 1, backgroundColor: c.bg, position: 'relative', overflow: 'hidden' }}>
            {tradingMode === 'options' ? (
              /* ── OPTIONS CHAIN TABLE ─────────────────────────── */
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Filter Bar */}
                <div style={{ padding: '6px 12px', backgroundColor: c.bg2, borderBottom: '1px solid ' + c.border, display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 16, fontSize: 10, color: c.muted }}>
                    {[['aroundATM', 'Around ATM'], ['strikeRange', 'Strike Range'], ['strikeDistance', 'Strike to Index Price Distance'], ['expectedRange', 'Expected Price Range']].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={optionsFilter[key]} onChange={e => setOptionsFilter(prev => ({ ...prev, [key]: e.target.checked }))} style={{ accentColor: '#F5A623', cursor: 'pointer' }} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: c.muted, whiteSpace: 'nowrap' }}>
                    Time to Expiry: <span style={{ color: '#F5A623', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{chainCountdown}</span> ({optionsExpiry === '1440' ? 'Daily' : optionsExpiry === '60' ? '1 Hour' : optionsExpiry + ' Min'})
                  </div>
                </div>

                {/* ATM Info Bar */}
                <div style={{ padding: '5px 12px', backgroundColor: c.bg2, borderBottom: '1px solid ' + c.border, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#00D084', letterSpacing: '0.05em' }}>Calls</span>
                  <span style={{ fontSize: 10, color: c.muted, textAlign: 'center' }}>
                    {selectedToken.symbol} Price:&nbsp;<span style={{ color: c.text, fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{fmtPrice(selectedToken.price)}</span>
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    ATM Vol:&nbsp;<span style={{ color: '#F5A623', fontWeight: 700 }}>32.9%</span>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#FF4757', letterSpacing: '0.05em', textAlign: 'right' }}>Puts</span>
                </div>

                {/* Column Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr 1.3fr 1.1fr 0.7fr 1.1fr 0.7fr 1.1fr 1.3fr 1.3fr 1fr 1.4fr 1fr', backgroundColor: c.bg2, borderBottom: '1px solid ' + c.border, padding: '5px 10px', fontSize: 9, color: c.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', flexShrink: 0 }}>
                  <span>Ask Size</span>
                  <span>Bid Size</span>
                  <span>Open (BON)</span>
                  <span>Delta</span>
                  <span style={{ color: '#00D084' }}>Mark/IV</span>
                  <span style={{ color: '#00D084' }}>Bid/IV</span>
                  <span>Pos.</span>
                  <span style={{ textAlign: 'center', color: c.text, fontWeight: 700, fontSize: 10 }}>Strike</span>
                  <span>Pos.</span>
                  <span style={{ color: '#FF4757' }}>Bid/IV</span>
                  <span style={{ color: '#FF4757' }}>Mark/IV</span>
                  <span style={{ color: '#FF4757' }}>Ask/IV</span>
                  <span>Delta</span>
                  <span>Open (BON)</span>
                  <span>Ask Size</span>
                </div>

                {/* Scrollable Rows */}
                <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto' }}>
                  {optionsChainData.map((row, idx) => {
                    const rowBg = row.isATM
                      ? (lightMode ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.08)')
                      : idx % 2 === 0 ? 'transparent' : (lightMode ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.012)');
                    const colGrid = '1fr 1fr 1.4fr 1fr 1.3fr 1.1fr 0.7fr 1.1fr 0.7fr 1.1fr 1.3fr 1.3fr 1fr 1.4fr 1fr';
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: colGrid, padding: '4px 10px', backgroundColor: rowBg, borderBottom: '1px solid ' + c.border2, fontSize: 10, fontFamily: "'Space Mono', monospace", cursor: 'pointer', alignItems: 'center' }}>
                        {/* CALLS */}
                        <span style={{ color: '#FF4757' }}>{row.call.askSize}</span>
                        <span style={{ color: '#00D084' }}>{row.call.bidSize}</span>
                        <span style={{ color: c.text2, fontSize: 9 }}>{parseInt(row.call.openUsdt || 0).toLocaleString('en')}</span>
                        <span style={{ color: '#00D084' }}>{row.call.delta}</span>
                        <span style={{ color: '#00D084', lineHeight: 1.4 }}>
                          {row.call.markPrice !== '0.0000' ? row.call.markPrice : '--'}<br/>
                          <span style={{ fontSize: 8, color: c.muted }}>{row.call.markIV}%</span>
                        </span>
                        <span style={{ color: c.text2, lineHeight: 1.4 }}>
                          {row.call.bidPrice !== '0.0000' ? row.call.bidPrice : '--'}<br/>
                          <span style={{ fontSize: 8, color: c.muted }}>{row.call.bidIV}%</span>
                        </span>
                        <span style={{ color: row.call.position > 0 ? '#F5A623' : c.muted }}>{row.call.position > 0 ? row.call.position : '--'}</span>

                        {/* STRIKE */}
                        <span style={{ textAlign: 'center', fontWeight: 700, color: row.isATM ? '#3B82F6' : c.text, background: row.isATM ? 'rgba(59,130,246,0.18)' : 'transparent', borderRadius: 3, padding: '1px 4px', display: 'block', fontSize: 10 }}>
                          {fmtPrice(row.strike)}
                        </span>

                        {/* PUTS */}
                        <span style={{ color: row.put.position > 0 ? '#F5A623' : c.muted }}>{row.put.position > 0 ? row.put.position : '--'}</span>
                        <span style={{ color: c.text2, lineHeight: 1.4 }}>
                          {row.put.bidPrice !== '0.0000' ? row.put.bidPrice : '--'}<br/>
                          <span style={{ fontSize: 8, color: c.muted }}>{row.put.bidIV}%</span>
                        </span>
                        <span style={{ color: '#FF4757', lineHeight: 1.4 }}>
                          {row.put.markPrice !== '0.0000' ? row.put.markPrice : '--'}<br/>
                          <span style={{ fontSize: 8, color: c.muted }}>{row.put.markIV}%</span>
                        </span>
                        <span style={{ color: '#FF4757', lineHeight: 1.4 }}>
                          {row.put.askPrice !== '0.0000' ? row.put.askPrice : '--'}<br/>
                          <span style={{ fontSize: 8, color: c.muted }}>{row.put.askIV}%</span>
                        </span>
                        <span style={{ color: '#FF4757' }}>{row.put.delta}</span>
                        <span style={{ color: c.text2, fontSize: 9 }}>{parseInt(row.put.openUsdt || 0).toLocaleString('en')}</span>
                        <span style={{ color: '#FF4757' }}>{row.put.askSize}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : chartHistory.length === 0 ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 className="animate-spin" style={{ color: '#F5A623' }} size={24} />
                <span style={{ fontSize: 11, color: '#8B91A8' }}>Loading chart data...</span>
              </div>
            ) : (
              <TradingViewChart 
                data={chartHistory} 
                selectedToken={selectedToken} 
                chartType={chartType} 
              />
            )}
          </div>

          {/* Bottom Live Trade Book / Balances (Fixed height 240px) */}
          <div style={{ height: 240, minHeight: 240, borderTop: '1px solid ' + c.border, backgroundColor: c.bg2, display: 'flex', flexDirection: 'column' }}>
            
            {/* Bottom Section Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#080A0F' }}>
              {tradingMode === 'spot' && (
                <>
                  <button
                    onClick={() => setBottomTab('trades')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'trades' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'trades' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    Live Trade Book
                  </button>
                  <button
                    onClick={() => setBottomTab('portfolio')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'portfolio' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'portfolio' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    My Balances
                  </button>
                </>
              )}

              {tradingMode === 'futures' && (
                <>
                  <button
                    onClick={() => setBottomTab('positions')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'positions' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'positions' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    Open Positions ({positions.length})
                  </button>
                  <button
                    onClick={() => setBottomTab('portfolio')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'portfolio' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'portfolio' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    My Balances
                  </button>
                </>
              )}

              {tradingMode === 'options' && (
                <>
                  <button
                    onClick={() => setBottomTab('options')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'options' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'options' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    Option Slips ({optionsContracts.length})
                  </button>
                  <button
                    onClick={() => setBottomTab('portfolio')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'portfolio' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'portfolio' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    My Balances
                  </button>
                </>
              )}

              {tradingMode === 'stake' && (
                <>
                  <button
                    onClick={() => setBottomTab('stakes')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'stakes' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'stakes' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    Active Stakes ({stakes.length})
                  </button>
                  <button
                    onClick={() => setBottomTab('portfolio')}
                    style={{
                      padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      backgroundColor: 'transparent',
                      color: bottomTab === 'portfolio' ? '#F5A623' : '#8B91A8',
                      borderBottom: bottomTab === 'portfolio' ? '2px solid #F5A623' : '2px solid transparent'
                    }}
                  >
                    My Balances
                  </button>
                </>
              )}
            </div>

            {/* Scrollable table content inside the trade book */}
            <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {tradingMode === 'spot' && bottomTab === 'trades' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#555D75', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ paddingBottom: 6 }}>Time</th>
                      <th style={{ paddingBottom: 6 }}>Type</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Price</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Amount ({selectedToken?.symbol})</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Total (BON)</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: "'Space Mono', monospace" }}>
                    {recentTrades.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', backgroundColor: t.self ? 'rgba(245, 166, 35, 0.03)' : 'transparent' }}>
                        <td style={{ py: 6, color: '#8B91A8' }}>{t.time}</td>
                        <td style={{ py: 6, fontWeight: 700, color: t.type === 'Buy' ? '#00D084' : '#FF4757' }}>
                          {t.type} {t.self && <span style={{ fontSize: 9, backgroundColor: 'rgba(245, 166, 35, 0.15)', px: 4, py: 2, borderRadius: 3, color: '#F5A623', marginLeft: 4 }}>YOU</span>}
                        </td>
                        <td style={{ py: 6, textAlign: 'right' }}>{fmtPrice(t.price)}</td>
                        <td style={{ py: 6, textAlign: 'right' }}>{t.amount?.toFixed(4)}</td>
                        <td style={{ py: 6, textAlign: 'right', color: '#8B91A8' }}>{t.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {bottomTab === 'portfolio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, backgroundColor: '#12151E', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <span style={{ fontSize: 10, color: '#8B91A8', display: 'block' }}>Net Valuation</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{fmtPrice(totalPortfolioValue)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, color: '#8B91A8', display: 'block' }}>Available BON</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F5A623', fontFamily: "'Space Mono', monospace" }}>{(balances?.BON || 0).toFixed(2)} BON</span>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#555D75', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ paddingBottom: 6 }}>Asset</th>
                        <th style={{ paddingBottom: 6, textAlign: 'right' }}>Balance</th>
                        <th style={{ paddingBottom: 6, textAlign: 'right' }}>Price</th>
                        <th style={{ paddingBottom: 6, textAlign: 'right' }}>Value</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: "'Space Mono', monospace" }}>
                      <tr>
                        <td style={{ py: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#F5A623', fontSize: 8, fontWeight: 700, color: '#080A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B</span>
                          <span style={{ fontWeight: 700 }}>BON</span>
                        </td>
                        <td style={{ py: 6, textAlign: 'right' }}>{(balances?.BON || 0).toFixed(2)}</td>
                        <td style={{ py: 6, textAlign: 'right' }}>{fmtPrice(tokens.find(t => t.symbol === 'BON')?.price || 0.09624)}</td>
                        <td style={{ py: 6, textAlign: 'right' }}>{fmtPrice((balances?.BON || 0) * (tokens.find(t => t.symbol === 'BON')?.price || 0.09624))}</td>
                      </tr>
                      {tokens.filter(t => t.symbol !== 'BON').map((t) => {
                        const bal = balances?.[t.symbol] || 0;
                        return (
                          <tr key={t.symbol}>
                            <td style={{ py: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: t.color || '#F5A623', fontSize: 8, fontWeight: 700, color: '#080A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.symbol[0]}</span>
                              <span style={{ fontWeight: 700 }}>{t.symbol}</span>
                            </td>
                            <td style={{ py: 6, textAlign: 'right' }}>{bal.toFixed(4)}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>{fmtPrice(t.price)}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>{fmtPrice(bal * t.price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {tradingMode === 'futures' && bottomTab === 'positions' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#555D75', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ paddingBottom: 6 }}>Position</th>
                      <th style={{ paddingBottom: 6 }}>Side</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Size</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Entry Price</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Mark Price</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Liq Price</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>PNL</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: "'Space Mono', monospace" }}>
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#555D75' }}>No open positions</td>
                      </tr>
                    ) : (
                      positions.map((pos) => {
                        const markToken = tokens.find((t) => t.symbol === pos.symbol);
                        const markPrice = markToken ? markToken.price : pos.entryPrice;
                        const diff = (markPrice - pos.entryPrice) / pos.entryPrice;
                        let pnl = pos.type === 'Long' ? diff * pos.margin * pos.leverage : -diff * pos.margin * pos.leverage;
                        if (pnl <= -pos.margin) pnl = -pos.margin;
                        const pnlPct = (pnl / pos.margin) * 100;

                        return (
                          <tr key={pos.id}>
                            <td style={{ py: 6, fontWeight: 700 }}>{pos.symbol}/BON ({pos.leverage}x)</td>
                            <td style={{ py: 6, fontWeight: 700, color: pos.type === 'Long' ? '#00D084' : '#FF4757' }}>{pos.type}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>{(pos.margin * pos.leverage / pos.entryPrice).toFixed(2)} {pos.symbol}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>${pos.entryPrice.toFixed(4)}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>${markPrice.toFixed(4)}</td>
                            <td style={{ py: 6, textAlign: 'right', color: '#F5A623' }}>${pos.liquidationPrice.toFixed(4)}</td>
                            <td style={{ py: 6, textAlign: 'right', fontWeight: 700, color: pnl >= 0 ? '#00D084' : '#FF4757' }}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} BON ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                            </td>
                            <td style={{ py: 6, textAlign: 'right' }}>
                              <button
                                disabled={closingId === pos.id}
                                onClick={() => handleCloseFuturesPosition(pos)}
                                style={{
                                  backgroundColor: 'rgba(255, 71, 87, 0.12)',
                                  color: '#FF4757',
                                  border: '1px solid rgba(255, 71, 87, 0.2)',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {closingId === pos.id ? 'Closing...' : 'Close'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tradingMode === 'options' && bottomTab === 'options' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#555D75', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ paddingBottom: 6 }}>ID</th>
                      <th style={{ paddingBottom: 6 }}>Asset</th>
                      <th style={{ paddingBottom: 6 }}>Type</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Strike</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Mark</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Quantity</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Premium</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Expiry</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Status</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: "'Space Mono', monospace" }}>
                    {optionsContracts.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#555D75' }}>No active contracts</td>
                      </tr>
                    ) : (
                      optionsContracts.map((opt) => {
                        const markToken = tokens.find((t) => t.symbol === opt.symbol);
                        const markPrice = markToken ? markToken.price : opt.strikePrice;
                        const expiryTime = new Date(opt.expiry);
                        const isExpired = new Date() >= expiryTime;

                        return (
                          <tr key={opt.id}>
                            <td style={{ py: 6, color: '#8B91A8' }}>#{opt.id.slice(-6)}</td>
                            <td style={{ py: 6, fontWeight: 700 }}>{opt.symbol}</td>
                            <td style={{ py: 6, fontWeight: 700, color: opt.contractType === 'Call' ? '#00D084' : '#FF4757' }}>{opt.contractType}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>${opt.strikePrice.toFixed(4)}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>${markPrice.toFixed(4)}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>{opt.quantity}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>{opt.premium.toFixed(2)} BON</td>
                            <td style={{ py: 6, textAlign: 'right', color: '#F5A623' }}>{expiryTime.toLocaleTimeString()}</td>
                            <td style={{ py: 6, textAlign: 'right' }}>
                              <span style={{
                                padding: '2px 4px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                                backgroundColor: opt.status === 'Active' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255,255,255,0.05)',
                                color: opt.status === 'Active' ? '#F5A623' : '#8B91A8'
                              }}>{opt.status}</span>
                            </td>
                            <td style={{ py: 6, textAlign: 'right' }}>
                              {opt.status === 'Active' && (
                                <button
                                  disabled={settlingId === opt.id}
                                  onClick={() => handleSettleOption(opt)}
                                  style={{
                                    backgroundColor: isExpired ? '#F5A623' : 'rgba(255,255,255,0.04)',
                                    color: isExpired ? '#080A0F' : '#F0F2F8',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {settlingId === opt.id ? 'Settling...' : isExpired ? 'Settle' : 'Exercise Early'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tradingMode === 'stake' && bottomTab === 'stakes' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#555D75', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ paddingBottom: 6 }}>Amount</th>
                      <th style={{ paddingBottom: 6 }}>APY</th>
                      <th style={{ paddingBottom: 6 }}>Lockup</th>
                      <th style={{ paddingBottom: 6 }}>Start Date</th>
                      <th style={{ paddingBottom: 6 }}>Unlock Date</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Yield Earned</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Status</th>
                      <th style={{ paddingBottom: 6, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: "'Space Mono', monospace" }}>
                    {stakes.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#555D75' }}>No active stakes</td>
                      </tr>
                    ) : (
                      stakes.map((st) => {
                        const unlockDate = new Date(st.unlockDate);
                        const isEarly = new Date() < unlockDate;

                        return (
                          <tr key={st.id}>
                            <td style={{ py: 6, fontWeight: 700 }}>{st.amount.toFixed(2)} BON</td>
                            <td style={{ py: 6, fontWeight: 700, color: '#00D084' }}>{st.apy}%</td>
                            <td style={{ py: 6 }}>{st.duration} Days</td>
                            <td style={{ py: 6 }}>{new Date(st.startDate).toLocaleDateString()}</td>
                            <td style={{ py: 6 }}>{unlockDate.toLocaleDateString()}</td>
                            <td style={{ py: 6, textAlign: 'right', fontWeight: 700, color: '#00D084' }}>+{st.rewards.toFixed(4)} BON</td>
                            <td style={{ py: 6, textAlign: 'right' }}>
                              <span style={{
                                padding: '2px 4px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                                backgroundColor: st.status === 'Staked' ? 'rgba(0, 208, 132, 0.12)' : 'rgba(255,255,255,0.05)',
                                color: st.status === 'Staked' ? '#00D084' : '#8B91A8'
                              }}>{st.status}</span>
                            </td>
                            <td style={{ py: 6, textAlign: 'right' }}>
                              {st.status === 'Staked' && (
                                <button
                                  disabled={unstakingId === st.id}
                                  onClick={() => handleUnstakeRequest(st)}
                                  style={{
                                    backgroundColor: isEarly ? 'rgba(245, 166, 35, 0.12)' : '#00D084',
                                    color: isEarly ? '#F5A623' : '#080A0F',
                                    border: isEarly ? '1px solid rgba(245, 166, 35, 0.2)' : 'none',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {unstakingId === st.id ? 'Unstaking...' : isEarly ? 'Early Claim' : 'Claim'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 3: RIGHT PANEL TERMINAL (300px) */}
        <div style={{ width: 300, minWidth: 300, borderLeft: '1px solid ' + c.border, backgroundColor: c.bg2, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 16 }}>
          {/* TERMINALS */}
          {tradingMode === 'spot' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              {/* Buy / Sell Tabs */}
              <div style={{ display: 'flex', backgroundColor: '#12151E', padding: 2, borderRadius: 6 }}>
                <button
                  onClick={() => { setSpotTab('buy'); setSpotAmount(''); setSpotTotal(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: spotTab === 'buy' ? 700 : 400,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: spotTab === 'buy' ? 'rgba(0, 208, 132, 0.10)' : 'transparent',
                    color: spotTab === 'buy' ? '#00D084' : '#555D75',
                    borderBottom: spotTab === 'buy' ? '2px solid #00D084' : '2px solid transparent'
                  }}
                >
                  Buy
                </button>
                <button
                  onClick={() => { setSpotTab('sell'); setSpotAmount(''); setSpotTotal(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: spotTab === 'sell' ? 700 : 400,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: spotTab === 'sell' ? 'rgba(255, 71, 87, 0.10)' : 'transparent',
                    color: spotTab === 'sell' ? '#FF4757' : '#555D75',
                    borderBottom: spotTab === 'sell' ? '2px solid #FF4757' : '2px solid transparent'
                  }}
                >
                  Sell
                </button>
              </div>

              {/* Order Type */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setOrderType('market')}
                  style={{
                    flex: 1,
                    padding: '5px 14px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: orderType === 'market' ? '1px solid rgba(245,166,35,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    backgroundColor: orderType === 'market' ? 'rgba(245,166,35,0.12)' : '#12151E',
                    color: orderType === 'market' ? '#F5A623' : '#555D75'
                  }}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  style={{
                    flex: 1,
                    padding: '5px 14px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: orderType === 'limit' ? '1px solid rgba(245,166,35,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    backgroundColor: orderType === 'limit' ? 'rgba(245,166,35,0.12)' : '#12151E',
                    color: orderType === 'limit' ? '#F5A623' : '#555D75'
                  }}
                >
                  Limit
                </button>
              </div>

              {/* Input Forms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orderType === 'limit' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#555D75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Price (BON)</label>
                    <div style={{ background: '#12151E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', transition: 'border-color 0.2s' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#F5A623'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                    >
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => {
                          setLimitPrice(e.target.value);
                          const amt = parseFloat(spotAmount);
                          const p = parseFloat(e.target.value);
                          if (!isNaN(amt) && !isNaN(p)) setSpotTotal((amt * p).toFixed(4));
                        }}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          fontSize: 16,
                          color: '#fff',
                          fontFamily: "'Space Mono', monospace"
                        }}
                      />
                    </div>
                  </div>
                )}

                {orderType === 'market' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#555D75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Est. Price</label>
                    <div style={{
                      width: '100%',
                      backgroundColor: '#12151E',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 16,
                      color: '#8B91A8',
                      fontFamily: "'Space Mono', monospace"
                    }}>
                      Market Price (~{fmtPrice(selectedToken?.price)})
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#555D75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Amount ({selectedToken?.symbol})</label>
                  <div style={{ background: '#12151E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#F5A623'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <input
                      type="number"
                      value={spotAmount}
                      onChange={(e) => updateSpotAmount(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 16,
                        color: '#fff',
                        fontFamily: "'Space Mono', monospace"
                      }}
                    />
                  </div>
                </div>

                {/* Percentage Sliders */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {[0.25, 0.50, 0.75, 1.0].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleSpotPercentageSlider(val)}
                      style={{
                        backgroundColor: '#12151E',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 6,
                        padding: '6px 0',
                        fontSize: 11,
                        fontFamily: "'Space Mono', monospace",
                        color: '#8B91A8',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(245,166,35,0.12)';
                        e.currentTarget.style.color = '#F5A623';
                        e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#12151E';
                        e.currentTarget.style.color = '#8B91A8';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      {val * 100}%
                    </button>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#555D75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total (BON)</label>
                  <div style={{ background: '#12151E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#F5A623'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <input
                      type="number"
                      value={spotTotal}
                      onChange={(e) => updateSpotTotal(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 16,
                        color: '#fff',
                        fontFamily: "'Space Mono', monospace"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Balance Summary */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#555D75' }}>Avail. BON:</span>
                  <span style={{ color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{(balances?.BON || 0).toFixed(2)} BON</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#555D75' }}>Avail. {selectedToken.symbol}:</span>
                  <span style={{ color: '#F0F2F8', fontFamily: "'Space Mono', monospace" }}>{(balances?.[selectedToken.symbol] || 0).toFixed(4)} {selectedToken.symbol}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={tradeLoading}
                onClick={executeSpotSwap}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'filter 0.2s',
                  backgroundColor: tradeLoading
                    ? '#12151E'
                    : !isConnected
                      ? '#F5A623'
                      : spotTab === 'buy' ? '#00D084' : '#FF4757',
                  color: tradeLoading
                    ? '#555D75'
                    : !isConnected
                      ? '#000'
                      : spotTab === 'buy' ? '#000' : '#fff',
                  boxShadow: tradeLoading ? 'none' : !isConnected ? '0 0 16px rgba(245,166,35,0.2)' : spotTab === 'buy' ? '0 0 16px rgba(0,208,132,0.2)' : '0 0 16px rgba(255,71,87,0.2)'
                }}
                onMouseEnter={e => { if (!tradeLoading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
              >
                {tradeLoading ? 'Swapping...' : !isConnected ? 'Connect Wallet' : spotTab === 'buy' ? 'BUY BON' : 'SELL BON'}
              </button>
            </div>
          )}

          {tradingMode === 'futures' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>Futures Terminal</h4>
              
              {/* Long / Short Tabs */}
              <div style={{ display: 'flex', backgroundColor: '#12151E', padding: 2, borderRadius: 6 }}>
                <button
                  onClick={() => setFuturesTradeType('Long')}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: futuresTradeType === 'Long' ? 'rgba(0, 208, 132, 0.12)' : 'transparent',
                    color: futuresTradeType === 'Long' ? '#00D084' : '#8B91A8',
                    borderBottom: futuresTradeType === 'Long' ? '2px solid #00D084' : 'none'
                  }}
                >
                  Long
                </button>
                <button
                  onClick={() => setFuturesTradeType('Short')}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: futuresTradeType === 'Short' ? 'rgba(255, 71, 87, 0.12)' : 'transparent',
                    color: futuresTradeType === 'Short' ? '#FF4757' : '#8B91A8',
                    borderBottom: futuresTradeType === 'Short' ? '2px solid #FF4757' : 'none'
                  }}
                >
                  Short
                </button>
              </div>

              {/* Leverage range slider */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', marginBottom: 4 }}>Leverage: {leverage}x</label>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={leverage} 
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#F5A623', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555D75', fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                  <span>5x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>75x</span>
                  <span>100x</span>
                </div>
              </div>

              {/* Margin Input */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', marginBottom: 4 }}>Margin (BON)</label>
                <input
                  type="number"
                  value={futuresMargin}
                  onChange={(e) => setFuturesMargin(e.target.value)}
                  placeholder="Margin size"
                  style={{
                    width: '100%',
                    backgroundColor: '#12151E',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#F0F2F8',
                    fontFamily: "'Space Mono', monospace"
                  }}
                />
              </div>

              {/* Preview Box */}
              <div style={{ backgroundColor: '#12151E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#8B91A8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Size:</span>
                  <span style={{ color: '#F0F2F8' }}>{((parseFloat(futuresMargin) || 0) * leverage / selectedToken.price).toFixed(3)} {selectedToken.symbol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Liq. Price:</span>
                  <span style={{ color: '#F5A623', fontWeight: 700 }}>${futuresLiqPreview.toFixed(4)}</span>
                </div>
              </div>

              {/* Available balance & button */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#8B91A8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span>Avail. BON:</span>
                  <span style={{ color: '#F0F2F8' }}>{(balances?.BON || 0).toFixed(2)} BON</span>
                </div>
                <button
                  disabled={tradeLoading}
                  onClick={executeFuturesTrade}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: tradeLoading ? '#12151E' : futuresTradeType === 'Long' ? '#00D084' : '#FF4757',
                    color: tradeLoading ? '#555D75' : '#080A0F',
                    boxShadow: tradeLoading ? 'none' : futuresTradeType === 'Long' ? '0 0 16px rgba(0,208,132,0.2)' : '0 0 16px rgba(255,71,87,0.2)'
                  }}
                >
                  {tradeLoading ? 'Opening...' : !isConnected ? 'Connect Wallet' : `Open ${leverage}x ${futuresTradeType}`}
                </button>
              </div>
            </div>
          )}

          {tradingMode === 'options' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>Options Terminal</h4>
              
              {/* Call / Put Tabs */}
              <div style={{ display: 'flex', backgroundColor: '#12151E', padding: 2, borderRadius: 6 }}>
                <button
                  onClick={() => setOptionsContractType('Call')}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: optionsContractType === 'Call' ? 'rgba(0, 208, 132, 0.12)' : 'transparent',
                    color: optionsContractType === 'Call' ? '#00D084' : '#8B91A8',
                    borderBottom: optionsContractType === 'Call' ? '2px solid #00D084' : 'none'
                  }}
                >
                  Buy Call
                </button>
                <button
                  onClick={() => setOptionsContractType('Put')}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: optionsContractType === 'Put' ? 'rgba(255, 71, 87, 0.12)' : 'transparent',
                    color: optionsContractType === 'Put' ? '#FF4757' : '#8B91A8',
                    borderBottom: optionsContractType === 'Put' ? '2px solid #FF4757' : 'none'
                  }}
                >
                  Buy Put
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', marginBottom: 4 }}>Quantity (Symbol)</label>
                <input
                  type="number"
                  value={optionsQuantity}
                  onChange={(e) => setOptionsQuantity(e.target.value)}
                  placeholder="Contract size"
                  style={{
                    width: '100%',
                    backgroundColor: '#12151E',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#F0F2F8',
                    fontFamily: "'Space Mono', monospace"
                  }}
                />
              </div>

              {/* Expiry select */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', marginBottom: 4 }}>Expiry Time</label>
                <select
                  value={optionsExpiry}
                  onChange={(e) => setOptionsExpiry(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#12151E',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#F0F2F8'
                  }}
                >
                  <option value="1">1 Minute</option>
                  <option value="5">5 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">1 Day</option>
                </select>
              </div>

              {/* Premium summary */}
              <div style={{ backgroundColor: '#12151E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#8B91A8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Strike:</span>
                  <span style={{ color: '#F0F2F8' }}>${selectedToken.price.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Premium Cost:</span>
                  <span style={{ color: '#F5A623', fontWeight: 700 }}>
                    {((parseFloat(optionsQuantity) || 0) * selectedToken.price * 0.06).toFixed(2)} BON
                  </span>
                </div>
              </div>

              {/* Available balance & Action button */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#8B91A8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span>Avail. BON:</span>
                  <span style={{ color: '#F0F2F8' }}>{(balances?.BON || 0).toFixed(2)} BON</span>
                </div>
                <button
                  disabled={tradeLoading}
                  onClick={executeOptionsPurchase}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: tradeLoading ? '#12151E' : '#F5A623',
                    color: '#080A0F',
                    boxShadow: tradeLoading ? 'none' : '0 0 16px rgba(245,166,35,0.2)'
                  }}
                >
                  {tradeLoading ? 'Purchasing...' : !isConnected ? 'Connect Wallet' : 'Purchase Option'}
                </button>
              </div>
            </div>
          )}

          {tradingMode === 'stake' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>Staking Terminal</h4>

              {/* Deposit amount */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', marginBottom: 4 }}>Stake Amount (BON)</label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    backgroundColor: '#12151E',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#F0F2F8',
                    fontFamily: "'Space Mono', monospace"
                  }}
                />
              </div>

              {/* Durations cards list */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#8B91A8', textTransform: 'uppercase', marginBottom: 4 }}>Duration Term</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(STAKING_PLANS).map(([days, plan]) => (
                    <div 
                      key={days} 
                      onClick={() => setStakeLockupDays(parseInt(days))}
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: stakeLockupDays === parseInt(days) ? '#F5A623' : 'rgba(255,255,255,0.06)',
                        backgroundColor: stakeLockupDays === parseInt(days) ? 'rgba(245, 166, 35, 0.05)' : '#12151E',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#F0F2F8' }}>{plan.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#00D084', fontFamily: "'Space Mono', monospace" }}>{plan.apy}% APY</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yield estimate preview */}
              {stakingPlanSelected && (
                <div style={{ backgroundColor: '#12151E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#8B91A8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>APY:</span>
                    <span style={{ color: '#00D084', fontWeight: 700 }}>{stakingPlanSelected.apy}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Est. Yield:</span>
                    <span style={{ color: '#F0F2F8' }}>{stakingRewardPreview.toFixed(2)} BON</span>
                  </div>
                </div>
              )}

              {/* Available balance & Stake Button */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, fontSize: 11, fontFamily: "'Space Mono', monospace", color: '#8B91A8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span>Avail. BON:</span>
                  <span style={{ color: '#F0F2F8' }}>{(balances?.BON || 0).toFixed(2)} BON</span>
                </div>
                <button
                  disabled={tradeLoading}
                  onClick={executeStakeBON}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: tradeLoading ? '#12151E' : '#F5A623',
                    color: '#080A0F',
                    boxShadow: tradeLoading ? 'none' : '0 0 16px rgba(245,166,35,0.2)'
                  }}
                >
                  {tradeLoading ? 'Depositing...' : !isConnected ? 'Connect Wallet' : 'Stake BON'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 4. MODALS (Early Unstake Warning) */}
      {earlyUnstakeTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#0D1018', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FF4757', marginBottom: 12 }}>
              <AlertTriangle size={20} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#F0F2F8', textTransform: 'uppercase' }}>Early Stake Withdrawal</h4>
            </div>
            
            <p style={{ fontSize: 11, color: '#8B91A8', lineHeight: 1.5, marginBottom: 12 }}>
              You are withdrawing before the unlock date (${new Date(earlyUnstakeTarget.unlockDate).toLocaleDateString()}). A penalty of 15% (${ (earlyUnstakeTarget.amount * 0.15).toFixed(2) } BON) will apply, and all pending yield rewards will be forfeited.
            </p>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setEarlyUnstakeTarget(null)} 
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: 'transparent', color: '#8B91A8', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => executeUnstake(earlyUnstakeTarget.id)} 
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 6, border: 'none',
                  backgroundColor: '#FF4757', color: '#080A0F', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )

}