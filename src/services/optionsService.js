import { doc, runTransaction, collection, query, where, orderBy, onSnapshot, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

const getLocalOptions = () => {
  const saved = localStorage.getItem('bon_dex_options')
  return saved ? JSON.parse(saved) : []
}

const saveLocalOptions = (options) => {
  localStorage.setItem('bon_dex_options', JSON.stringify(options))
}

const getLocalBalances = () => {
  const saved = localStorage.getItem('bon_dex_balances')
  return saved ? JSON.parse(saved) : { BON: 12480.0, USDT: 500.0 }
}

const saveLocalBalances = (balances) => {
  localStorage.setItem('bon_dex_balances', JSON.stringify(balances))
}

// Purchase Call or Put option contract
export const purchaseOptionsContract = async (userId, symbol, contractType, quantity, strikePrice, expiryMinutes) => {
  const qty = parseFloat(quantity)
  if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity.')

  // Premium calculated as 6% of contract volume in BON
  const premium = qty * strikePrice * 0.06

  const startDate = new Date()
  const expiryDate = new Date()
  expiryDate.setMinutes(startDate.getMinutes() + parseInt(expiryMinutes))

  if (!isFirebaseConfigured || !db || !userId) {
    // LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const balances = getLocalBalances()
          if (balances.BON < premium) {
            return reject(new Error(`Insufficient BON to pay premium. Required: ${premium.toFixed(2)} BON.`))
          }

          balances.BON -= premium
          saveLocalBalances(balances)

          const options = getLocalOptions()
          const newOpt = {
            id: 'opt_' + Date.now(),
            userId,
            symbol,
            contractType, // Call or Put
            strikePrice,
            quantity: qty,
            premium,
            expiry: expiryDate.toISOString(),
            status: 'Active',
            timestamp: new Date().toISOString()
          }
          options.unshift(newOpt)
          saveLocalOptions(options)

          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_options_updated'))
          resolve(newOpt)
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // FIRESTORE TRANSACTION
  const userDocRef = doc(db, 'users', userId)
  const optDocRef = doc(collection(db, 'options_contracts'))

  try {
    return await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userDocRef)
      let currentBalances = { BON: 12480.0 }

      if (userSnapshot.exists()) {
        const data = userSnapshot.data()
        if (data.balances) currentBalances = data.balances
      }

      if ((currentBalances.BON || 0) < premium) {
        throw new Error(`Insufficient BON balance for options premium. Required: ${premium.toFixed(2)} BON.`)
      }

      currentBalances.BON = (currentBalances.BON || 0) - premium
      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })

      const optData = {
        userId,
        symbol,
        contractType,
        strikePrice,
        quantity: qty,
        premium,
        expiry: expiryDate.toISOString(),
        status: 'Active',
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp()
      }

      transaction.set(optDocRef, optData)
      return { id: optDocRef.id, ...optData }
    })
  } catch (error) {
    console.error('Options purchase transaction failed:', error)
    throw error
  }
}

// Settle / Exercise options contract
export const exerciseOption = async (userId, contractId, currentPrice) => {
  if (!isFirebaseConfigured || !db || !userId) {
    // LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const options = getLocalOptions()
          const optIdx = options.findIndex((o) => o.id === contractId)
          if (optIdx === -1) return reject(new Error('Options contract not found.'))

          const opt = options[optIdx]
          if (opt.status !== 'Active') return reject(new Error('Contract already expired or exercised.'))

          let payout = 0
          if (opt.contractType === 'Call') {
            if (currentPrice > opt.strikePrice) {
              payout = opt.quantity * (currentPrice - opt.strikePrice)
            }
          } else {
            if (currentPrice < opt.strikePrice) {
              payout = opt.quantity * (opt.strikePrice - currentPrice)
            }
          }

          const balances = getLocalBalances()
          balances.BON += payout
          saveLocalBalances(balances)

          opt.status = payout > 0 ? 'Exercised' : 'Expired (OTM)'
          opt.settlePrice = currentPrice
          opt.payout = payout
          opt.settledAt = new Date().toISOString()

          options[optIdx] = opt
          saveLocalOptions(options)

          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_options_updated'))
          resolve({ payout, profit: payout - opt.premium })
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // FIRESTORE TRANSACTION
  const optDocRef = doc(db, 'options_contracts', contractId)
  const userDocRef = doc(db, 'users', userId)

  try {
    return await runTransaction(db, async (transaction) => {
      const optSnapshot = await transaction.get(optDocRef)
      if (!optSnapshot.exists()) throw new Error('Options contract not found.')

      const opt = optSnapshot.data()
      if (opt.status !== 'Active') throw new Error('Options contract already settled.')

      const userSnapshot = await transaction.get(userDocRef)
      if (!userSnapshot.exists()) throw new Error('User document not found.')

      const userData = userSnapshot.data()
      const currentBalances = { ...userData.balances }

      let payout = 0
      if (opt.contractType === 'Call') {
        if (currentPrice > opt.strikePrice) {
          payout = opt.quantity * (currentPrice - opt.strikePrice)
        }
      } else {
        if (currentPrice < opt.strikePrice) {
          payout = opt.quantity * (opt.strikePrice - currentPrice)
        }
      }

      currentBalances.BON = (currentBalances.BON || 0) + payout

      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })
      transaction.update(optDocRef, {
        status: payout > 0 ? 'Exercised' : 'Expired (OTM)',
        settlePrice: currentPrice,
        payout,
        settledAt: new Date().toISOString()
      })

      return { payout, profit: payout - opt.premium }
    })
  } catch (error) {
    console.error('Options exercise transaction failed:', error)
    throw error
  }
}

// Subscribe to active options in real-time
export const subscribeToOptions = (userId, onUpdate) => {
  if (!isFirebaseConfigured || !db || !userId) {
    const fetchLocal = () => {
      onUpdate(getLocalOptions())
    }
    fetchLocal()
    window.addEventListener('local_options_updated', fetchLocal)
    return () => window.removeEventListener('local_options_updated', fetchLocal)
  }

  const q = query(
    collection(db, 'options_contracts'),
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
