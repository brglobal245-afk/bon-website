import { doc, runTransaction, collection, query, where, orderBy, onSnapshot, serverTimestamp, addDoc, getDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

// Lockup plans definitions
export const STAKING_PLANS = {
  7: { label: '7 Days', apy: 5.0, days: 7 },
  30: { label: '30 Days', apy: 8.0, days: 30 },
  90: { label: '90 Days', apy: 12.0, days: 90 },
  365: { label: '365 Days', apy: 22.0, days: 365 },
}

const getLocalStakes = () => {
  const saved = localStorage.getItem('bon_dex_stakes')
  return saved ? JSON.parse(saved) : []
}

const saveLocalStakes = (stakes) => {
  localStorage.setItem('bon_dex_stakes', JSON.stringify(stakes))
}

const getLocalBalances = () => {
  const saved = localStorage.getItem('bon_dex_balances')
  return saved ? JSON.parse(saved) : { BON: 12480.0, USDT: 500.0, ETH: 0.482 }
}

const saveLocalBalances = (balances) => {
  localStorage.setItem('bon_dex_balances', JSON.stringify(balances))
}

// Stake BON
export const stakeBON = async (userId, amount, durationDays) => {
  const plan = STAKING_PLANS[durationDays]
  if (!plan) throw new Error('Invalid lockup plan.')

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Invalid stake amount.')

  const startDate = new Date()
  const unlockDate = new Date()
  unlockDate.setDate(startDate.getDate() + durationDays)

  // Calculate estimated rewards
  const rewards = parsedAmount * (plan.apy / 100) * (durationDays / 365)

  if (!isFirebaseConfigured || !db || !userId) {
    // LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const balances = getLocalBalances()
          if (balances.BON < parsedAmount) {
            return reject(new Error(`Insufficient BON. Required: ${parsedAmount.toFixed(2)} BON.`))
          }

          balances.BON -= parsedAmount
          saveLocalBalances(balances)

          const stakes = getLocalStakes()
          const newStake = {
            id: 'stake_' + Date.now(),
            userId,
            amount: parsedAmount,
            apy: plan.apy,
            duration: durationDays,
            rewards,
            startDate: startDate.toISOString(),
            unlockDate: unlockDate.toISOString(),
            status: 'Staked'
          }
          stakes.unshift(newStake)
          saveLocalStakes(stakes)

          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_stakes_updated'))
          resolve(newStake)
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // FIRESTORE TRANSACTION
  const userDocRef = doc(db, 'users', userId)
  const stakeDocRef = doc(collection(db, 'staking'))

  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef)
      let currentBalances = { BON: 12480.0 }

      if (userDoc.exists()) {
        const data = userDoc.data()
        if (data.balances) currentBalances = data.balances
      }

      if ((currentBalances.BON || 0) < parsedAmount) {
        throw new Error(`Insufficient BON balance. Required: ${parsedAmount.toFixed(2)} BON.`)
      }

      currentBalances.BON = (currentBalances.BON || 0) - parsedAmount
      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })

      const stakeData = {
        userId,
        amount: parsedAmount,
        apy: plan.apy,
        duration: durationDays,
        rewards,
        startDate: startDate.toISOString(),
        unlockDate: unlockDate.toISOString(),
        status: 'Staked',
        createdAt: serverTimestamp()
      }

      transaction.set(stakeDocRef, stakeData)
      return { id: stakeDocRef.id, ...stakeData }
    })
  } catch (error) {
    console.error('Stake transaction failed:', error)
    throw error
  }
}

// Claim rewards / Unstake
export const unstakeBON = async (userId, stakeId) => {
  if (!isFirebaseConfigured || !db || !userId) {
    // LOCAL SIMULATION
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const stakes = getLocalStakes()
          const stakeIdx = stakes.findIndex((s) => s.id === stakeId)
          if (stakeIdx === -1) return reject(new Error('Stake position not found.'))

          const stake = stakes[stakeIdx]
          if (stake.status !== 'Staked') return reject(new Error('Position already unstaked.'))

          const now = new Date()
          const unlock = new Date(stake.unlockDate)
          const isEarly = now < unlock

          let penalty = 0
          let payoutAmount = stake.amount

          if (isEarly) {
            // Apply 15% early withdrawal penalty on principal and lose rewards
            penalty = stake.amount * 0.15
            payoutAmount = stake.amount - penalty
          } else {
            payoutAmount = stake.amount + stake.rewards
          }

          const balances = getLocalBalances()
          balances.BON += payoutAmount
          saveLocalBalances(balances)

          stake.status = isEarly ? 'Unstaked (Early)' : 'Unstaked'
          stake.claimedRewards = isEarly ? 0 : stake.rewards
          stake.penaltyApplied = penalty

          stakes[stakeIdx] = stake
          saveLocalStakes(stakes)

          window.dispatchEvent(new Event('local_balances_updated'))
          window.dispatchEvent(new Event('local_stakes_updated'))
          resolve({ payoutAmount, penalty, isEarly })
        } catch (e) {
          reject(e)
        }
      }, 1000)
    })
  }

  // FIRESTORE TRANSACTION
  const stakeDocRef = doc(db, 'staking', stakeId)
  const userDocRef = doc(db, 'users', userId)

  try {
    return await runTransaction(db, async (transaction) => {
      const stakeSnapshot = await transaction.get(stakeDocRef)
      if (!stakeSnapshot.exists()) throw new Error('Staking position not found.')

      const stake = stakeSnapshot.data()
      if (stake.status !== 'Staked') throw new Error('Staking position already unstaked.')

      const userSnapshot = await transaction.get(userDocRef)
      if (!userSnapshot.exists()) throw new Error('User account not found.')

      const userData = userSnapshot.data()
      const currentBalances = { ...userData.balances }

      const now = new Date()
      const unlock = new Date(stake.unlockDate)
      const isEarly = now < unlock

      let penalty = 0
      let payoutAmount = stake.amount

      if (isEarly) {
        penalty = stake.amount * 0.15
        payoutAmount = stake.amount - penalty
      } else {
        payoutAmount = stake.amount + stake.rewards
      }

      currentBalances.BON = (currentBalances.BON || 0) + payoutAmount

      // Update User balance and Staking status
      transaction.set(userDocRef, { balances: currentBalances }, { merge: true })
      transaction.update(stakeDocRef, {
        status: isEarly ? 'Unstaked (Early)' : 'Unstaked',
        claimedRewards: isEarly ? 0 : stake.rewards,
        penaltyApplied: penalty,
        unstakedAt: new Date().toISOString()
      })

      return { payoutAmount, penalty, isEarly }
    })
  } catch (error) {
    console.error('Unstaking transaction failed:', error)
    throw error
  }
}

// Subscribe to active staking positions in real-time
export const subscribeToStakes = (userId, onUpdate) => {
  if (!isFirebaseConfigured || !db || !userId) {
    const fetchLocal = () => {
      onUpdate(getLocalStakes())
    }
    fetchLocal()
    window.addEventListener('local_stakes_updated', fetchLocal)
    return () => window.removeEventListener('local_stakes_updated', fetchLocal)
  }

  const q = query(
    collection(db, 'staking'),
    where('userId', '==', userId),
    orderBy('startDate', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() })
    })
    onUpdate(list)
  })
}
