import React from 'react'
import { ArrowLeftRight } from 'lucide-react'
import ComingSoon from '../components/ComingSoon'

export default function Swap() {
  return (
    <ComingSoon
      icon={<ArrowLeftRight size={40} color="#00C076" />}
      title="Instant Swap"
      description="Swap any token pair on BON Chain with best price routing and minimal slippage."
      accentColor="#00C076"
      glowColor="rgba(0,192,118,0.15)"
    />
  )
}
