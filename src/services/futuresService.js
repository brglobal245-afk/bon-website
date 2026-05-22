import { doc, runTransaction, collection, query, where, orderBy, onSnapshot, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

const getLocalPositions = () => {
  const saved = localStorage.getItem('bon_dex_futures')
  return saved ? JSON.parse(saved) : []
}

const saveLocalPositions = (positions) => {
  localStorage.setItem('bon_dex_futures', JSON.stringify(positions))
}

const getLocalBalances = () => {
  const saved = localStorage.getItem('bon_dex_balances')
  return saved ? JSON.parse(saved) : { BON: 12480.0, USDT: 500.0 }
}

const saveLocalBalances = (balances) => {
  localStorage.setItem('bon_dex_balances', JSON.stringify(balances))
}

// Calculate liquidation price
export const calculateLiquidationPrice = (entryPrice, leverage, type) => {
  const maintenanceMargin = 0.05 // 5% maintenance margin
  if (type === 'Long') {
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin)
  } else {
    return entryPrice * (1 + (1 / leverage) - maintenanceMargin)
  }
}

// Open futures position
export const openFuturesPosition = async (userId, symbol, type, leverage, margin, entryPrice) => {
  const marginNum = parseFloat(margin)
  const leverageNum = parseInt(leverage)
  
  if (isNaN(marginNum) || marginNum <= 0) throw new Error('Invalid margin amount.')
  if (isNaN(leverageNum) || leverageNum <= 0) throw new Error('Invalid leverage.')

  const liquidationPrice = calculateLiquidationPrice(entryPrice, leverageNum, type)

  if (!isFirebaseConfigured || !db || !userId) {
    // LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const balances = getLocalBalances()
          if (balances.BON < marginNum) {
            return reject(new Error(`Insufficient BON balance for margin. Required: ${marginNum.toFixed(2)} BON.`))
          }

          balances.BON -= marginNum
          saveLocalBalances(balances)

          const positions = getLocalPositions()
          const newPos = {
            id: 'pos_' + Date.now(),
            userId,
            symbol,
            type, // Long or Short
            leverage: leverageNum,
            margin: marginNum,
            entryPrice,
            liquidationPrice,
            pnl: 0,
            status: 'Open',
            timestamp: new Date().toISOString()
          }
          positions.unshift(newPos)
          saveLocalPositions(positions)

          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_futures_updated'))
          resolve(newPos)
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // FIRESTORE TRANSACTION
  const userDocRef = doc(db, 'users', userId)
  const posDocRef = doc(collection(db, 'futures_positions'))

  try {
    return await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userDocRef)
      let currentBalances = { BON: 12480.0 }

      if (userSnapshot.exists()) {
        const data = userSnapshot.data()
        if (data.balances) currentBalances = data.balances
      }

      if ((currentBalances.BON || 0) < marginNum) {
        throw new Error(`Insufficient BON balance for margin. Required: ${marginNum.toFixed(2)} BON.`)
      }

      currentBalances.BON = (currentBalances.BON || 0) - marginNum
      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })

      const posData = {
        userId,
        symbol,
        type,
        leverage: leverageNum,
        margin: marginNum,
        entryPrice,
        liquidationPrice,
        pnl: 0,
        status: 'Open',
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp()
      }

      transaction.set(posDocRef, posData)
      return { id: posDocRef.id, ...posData }
    })
  } catch (error) {
    console.error('Futures open transaction failed:', error)
    throw error
  }
}

// Close futures position
export const closeFuturesPosition = async (userId, positionId, currentPrice) => {
  if (!isFirebaseConfigured || !db || !userId) {
    // LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const positions = getLocalPositions()
          const posIdx = positions.findIndex((p) => p.id === positionId)
          if (posIdx === -1) return reject(new Error('Futures position not found.'))

          const pos = positions[posIdx]
          if (pos.status !== 'Open') return reject(new Error('Position already closed.'))

          // Calculate final PNL: percentage change * margin * leverage
          const priceDiffRatio = (currentPrice - pos.entryPrice) / pos.entryPrice
          let pnl = pos.type === 'Long' 
            ? priceDiffRatio * pos.margin * pos.leverage
            : -priceDiffRatio * pos.margin * pos.leverage

          // Limit PNL to -margin (liquidation)
          if (pnl <= -pos.margin) {
            pnl = -pos.margin
            pos.status = 'Liquidated'
          } else {
            pos.status = 'Closed'
          }

          const payout = pos.margin + pnl
          const balances = getLocalBalances()
          balances.BON += payout
          saveLocalBalances(balances)

          pos.closePrice = currentPrice
          pos.pnl = pnl
          pos.closedAt = new Date().toISOString()

          positions[posIdx] = pos
          saveLocalPositions(positions)

          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_futures_updated'))
          resolve({ pnl, payout, liquidated: pos.status === 'Liquidated' })
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // FIRESTORE TRANSACTION
  const posDocRef = doc(db, 'futures_positions', positionId)
  const userDocRef = doc(db, 'users', userId)

  try {
    return await runTransaction(db, async (transaction) => {
      const posSnapshot = await transaction.get(posDocRef)
      if (!posSnapshot.exists()) throw new Error('Futures position not found.')

      const pos = posSnapshot.data()
      if (pos.status !== 'Open') throw new Error('Futures position already closed.')

      const userSnapshot = await transaction.get(userDocRef)
      if (!userSnapshot.exists()) throw new Error('User document not found.')

      const userData = userSnapshot.data()
      const currentBalances = { ...userData.balances }

      const priceDiffRatio = (currentPrice - pos.entryPrice) / pos.entryPrice
      let pnl = pos.type === 'Long'
        ? priceDiffRatio * pos.margin * pos.leverage
        : -priceDiffRatio * pos.margin * pos.leverage

      let finalStatus = 'Closed'
      if (pnl <= -pos.margin) {
        pnl = -pos.margin
        finalStatus = 'Liquidated'
      }

      const payout = pos.margin + pnl
      currentBalances.BON = (currentBalances.BON || 0) + payout

      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })
      transaction.update(posDocRef, {
        status: finalStatus,
        pnl,
        closePrice: currentPrice,
        closedAt: new Date().toISOString()
      })

      return { pnl, payout, liquidated: finalStatus === 'Liquidated' }
    })
  } catch (error) {
    console.error('Futures close transaction failed:', error)
    throw error
  }
}

// Real-time listener for active positions
export const subscribeToFuturesPositions = (userId, onUpdate) => {
  if (!isFirebaseConfigured || !db || !userId) {
    const fetchLocal = () => {
      onUpdate(getLocalPositions())
    }
    fetchLocal()
    window.addEventListener('local_futures_updated', fetchLocal)
    return () => window.removeEventListener('local_futures_updated', fetchLocal)
  }

  const q = query(
    collection(db, 'futures_positions'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() })
    })
    onUpdate(list)
  })
}
