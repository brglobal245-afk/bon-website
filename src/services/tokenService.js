import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

const MOCK_TOKENS = [
  { name: 'BON Chain Token', symbol: 'BON', price: 0.09624, change24h: 8.42, volume24h: 482000, color: '#F0A500', trending: true },
  { name: 'BON Tether', symbol: 'USDT', price: 1.00, change24h: 0.01, volume24h: 920000, color: '#26A17B', trending: false },
  { name: 'Ethereum', symbol: 'ETH', price: 3420.50, change24h: 3.21, volume24h: 720000, color: '#627EEA', trending: true },
  { name: 'MoonShot', symbol: 'MOON', price: 0.00482, change24h: 142.8, volume24h: 248000, color: '#A78BFA', trending: true, new: true },
  { name: 'DeFi Gold', symbol: 'DFG', price: 0.1820, change24h: -12.4, volume24h: 84000, color: '#38BDF8', trending: false },
  { name: 'Rocket X', symbol: 'RKT', price: 0.00021, change24h: 68.2, volume24h: 124000, color: '#FF6B00', trending: true, new: true },
  { name: 'SafeStable', symbol: 'SAFE', price: 0.9940, change24h: -0.08, volume24h: 52000, color: '#00C076', trending: false },
  { name: 'BON Chain AI', symbol: 'BONAI', price: 0.00842, change24h: -28.4, volume24h: 36000, color: '#F472B6', trending: false },
]

export const getMockTokens = () => MOCK_TOKENS

// Listens to Firestore tokens collection in real-time
export const subscribeToTokens = (onUpdate, onError) => {
  if (!isFirebaseConfigured || !db) {
    onUpdate(MOCK_TOKENS)
    return () => {}
  }

  return onSnapshot(
    collection(db, 'tokens'),
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(MOCK_TOKENS)
        return
      }

      const list = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })

      const formatted = list.map((t) => ({
        name: t.name || 'Unnamed Token',
        symbol: t.symbol || 'UNKNOWN',
        price: typeof t.price === 'number' ? t.price : parseFloat(t.price) || 0.1,
        volume24h: typeof t.volume24h === 'number' ? t.volume24h : parseFloat(t.volume24h) || 10000,
        change24h: typeof t.change24h === 'number' ? t.change24h : parseFloat(t.change24h) || 0,
        color: t.color || '#FF6B00',
        logoUrl: t.logoUrl || t.logo || '',
        id: t.id
      }))

      onUpdate(formatted)
    },
    (error) => {
      console.error('Realtime tokens subscriber error, falling back to mocks:', error)
      if (onError) onError(error)
      onUpdate(MOCK_TOKENS)
    }
  )
}
