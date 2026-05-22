import { doc, runTransaction, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

// Local simulation backup storage
const getLocalBalances = () => {
  const saved = localStorage.getItem('bon_dex_balances')
  return saved ? JSON.parse(saved) : { BON: 12480.0, USDT: 500.0, ETH: 0.482, MOON: 500000.0, DFG: 0.0, RKT: 0.0 }
}

const saveLocalBalances = (balances) => {
  localStorage.setItem('bon_dex_balances', JSON.stringify(balances))
}

const getLocalOrders = () => {
  const saved = localStorage.getItem('bon_dex_orders')
  return saved ? JSON.parse(saved) : []
}

const saveLocalOrders = (orders) => {
  localStorage.setItem('bon_dex_orders', JSON.stringify(orders))
}

// Executes a spot buy/sell transaction
export const executeSpotTrade = async (userId, symbol, type, amount, price, isLimit = false) => {
  const totalCost = amount * price
  
  if (!isFirebaseConfigured || !db || !userId) {
    // RUN LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const balances = getLocalBalances()
          if (type === 'buy') {
            if (balances.BON < totalCost) {
              return reject(new Error(`Insufficient BON balance. Need ${totalCost.toFixed(2)} BON.`))
            }
            balances.BON -= totalCost
            balances[symbol] = (balances[symbol] || 0) + amount
          } else {
            const tokenBal = balances[symbol] || 0
            if (tokenBal < amount) {
              return reject(new Error(`Insufficient ${symbol} balance. Need ${amount} ${symbol}.`))
            }
            balances[symbol] -= amount
            balances.BON += totalCost
          }
          
          saveLocalBalances(balances)
          
          // Save order local
          const orders = getLocalOrders()
          const newOrder = {
            id: 'local_' + Date.now(),
            userId,
            symbol,
            type,
            side: type,
            amount,
            price,
            total: totalCost,
            status: 'Filled',
            timestamp: new Date().toISOString(),
            isLimit
          }
          orders.unshift(newOrder)
          saveLocalOrders(orders)
          
          // Dispatch custom event to notify components
          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_orders_updated'))
          
          resolve(newOrder)
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // RUN FIRESTORE TRANSACTION
  const userDocRef = doc(db, 'users', userId)
  const orderDocRef = doc(collection(db, 'orders'))
  const tradeDocRef = doc(collection(db, 'trades'))

  try {
    const resultOrder = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef)
      let currentBalances = { BON: 12480.0, USDT: 500.0, ETH: 0.482, MOON: 500000.0, DFG: 0.0, RKT: 0.0 }
      
      if (userDoc.exists()) {
        const data = userDoc.data()
        if (data.balances) {
          currentBalances = { ...currentBalances, ...data.balances }
        }
      }

      if (type === 'buy') {
        if ((currentBalances.BON || 0) < totalCost) {
          throw new Error(`Insufficient BON balance. Required: ${totalCost.toFixed(2)} BON.`)
        }
        currentBalances.BON = (currentBalances.BON || 0) - totalCost
        currentBalances[symbol] = (currentBalances[symbol] || 0) + amount
      } else {
        const tokenBal = currentBalances[symbol] || 0
        if (tokenBal < amount) {
          throw new Error(`Insufficient ${symbol} balance. Required: ${amount} ${symbol}.`)
        }
        currentBalances[symbol] = tokenBal - amount
        currentBalances.BON = (currentBalances.BON || 0) + totalCost
      }

      // Update User balance inside transaction
      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })

      const orderData = {
        userId,
        symbol,
        side: type,
        amount,
        price,
        total: totalCost,
        status: 'Filled',
        timestamp: serverTimestamp(),
        isLimit
      }

      const tradeData = {
        userId,
        symbol,
        type,
        amount,
        price,
        total: totalCost,
        timestamp: serverTimestamp()
      }

      // Write Order and Trade documents
      transaction.set(orderDocRef, orderData)
      transaction.set(tradeDocRef, tradeData)

      return { id: orderDocRef.id, ...orderData }
    })
    
    // Dispatch sync event
    window.dispatchEvent(new Event('local_balances_updated'))
    return resultOrder
  } catch (error) {
    console.error('Spot trade transaction failed:', error)
    throw error
  }
}

// Subscribes to orders collection in real-time
export const subscribeToUserOrders = (userId, onUpdate) => {
  if (!isFirebaseConfigured || !db || !userId) {
    const fetchLocal = () => {
      onUpdate(getLocalOrders())
    }
    fetchLocal()
    window.addEventListener('local_orders_updated', fetchLocal)
    return () => window.removeEventListener('local_orders_updated', fetchLocal)
  }

  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(40)
  )

  return onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      list.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString()
      })
    })
    onUpdate(list)
  })
}

// Subscribes to global trade book in real-time
export const subscribeToGlobalTrades = (symbol, onUpdate) => {
  if (!isFirebaseConfigured || !db) {
    return () => {}
  }

  const q = query(
    collection(db, 'trades'),
    where('symbol', '==', symbol),
    orderBy('timestamp', 'desc'),
    limit(25)
  )

  return onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      list.push({
        id: doc.id,
        ...data,
        time: data.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || 'Just now'
      })
    })
    onUpdate(list)
  })
}

// Subscribes to user balance document in real-time
export const subscribeToUserBalances = (userId, onUpdate) => {
  if (!isFirebaseConfigured || !db || !userId) {
    const fetchLocal = () => {
      const saved = localStorage.getItem('bon_dex_balances')
      onUpdate(saved ? JSON.parse(saved) : { BON: 12480.0, USDT: 500.0, ETH: 0.482, MOON: 500000.0, DFG: 0.0, RKT: 0.0, SAFE: 1000.0, BONAI: 0.0 })
    }
    fetchLocal()
    window.addEventListener('local_balances_updated', fetchLocal)
    return () => window.removeEventListener('local_balances_updated', fetchLocal)
  }

  return onSnapshot(doc(db, 'users', userId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data()
      if (data.balances) {
        onUpdate(data.balances)
        return
      }
    }
    onUpdate({ BON: 12480.0, USDT: 500.0, ETH: 0.482, MOON: 500000.0, DFG: 0.0, RKT: 0.0, SAFE: 1000.0, BONAI: 0.0 })
  })
}

