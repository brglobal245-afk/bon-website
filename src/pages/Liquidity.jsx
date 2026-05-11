import React from 'react'
import { Droplets } from 'lucide-react'
import ComingSoon from '../components/ComingSoon'

export default function Liquidity() {
  return (
    <ComingSoon
      icon={<Droplets size={40} color="#6366F1" />}
      title="Liquidity Pools"
      description="Provide liquidity to trading pairs and earn a share of all 0.20% swap fees."
      accentColor="#6366F1"
      glowColor="rgba(99,102,241,0.15)"
    />
  )
}
