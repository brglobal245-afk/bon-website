import React from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { AlertTriangle } from 'lucide-react'
import { BON_CHAIN } from '../config'

export default function WrongNetworkBanner() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  if (!isConnected || chainId === BON_CHAIN.id) return null

  return (
    <div style={{
      position: 'fixed', top: 64, left: 0, right: 0, zIndex: 90,
      background: 'linear-gradient(90deg, rgba(255,59,92,0.15), rgba(255,107,0,0.15))',
      borderBottom: '1px solid rgba(255,59,92,0.3)',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
    }}>
      <AlertTriangle size={16} color="#FF3B5C" />
      <span style={{ fontSize: 13, color: '#E8EAF2' }}>
        Wrong Network — You're not on BON Chain
      </span>
      <button
        className="btn-primary"
        style={{ padding: '6px 16px', fontSize: 12, minHeight: 32 }}
        onClick={() => switchChain?.({ chainId: BON_CHAIN.id })}
      >
        Switch to BON Chain
      </button>
    </div>
  )
}
