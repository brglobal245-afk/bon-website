import React from 'react'
import { Coins } from 'lucide-react'
import ComingSoon from '../components/ComingSoon'

export default function CreateToken() {
  return (
    <ComingSoon
      icon={<Coins size={40} color="#F0A500" />}
      title="Create Token"
      description="Deploy your own ERC-20 token on BON Chain with custom taxes, supply, and advanced features."
      accentColor="#F0A500"
      glowColor="rgba(240,165,0,0.15)"
    />
  )
}
