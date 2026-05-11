import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import WrongNetworkBanner from './components/WrongNetworkBanner'
import ToastContainer from './components/ToastContainer'

import Home from './pages/Home'
import CreateToken from './pages/CreateToken'
import Liquidity from './pages/Liquidity'
import Swap from './pages/Swap'
import Explore from './pages/Explore'
import Launchpad from './pages/Launchpad'

import { BON_CHAIN, WALLETCONNECT_PROJECT_ID } from './config'

// Wagmi config with RainbowKit
const config = getDefaultConfig({
  appName: 'BON Network',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [BON_CHAIN],
  ssr: false,
})

const queryClient = new QueryClient()

// Custom RainbowKit dark theme matching BON design
const bonTheme = darkTheme({
  accentColor: '#F0A500',
  accentColorForeground: '#080A0F',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'large',
})

bonTheme.colors.modalBackground = '#0C0F17'
bonTheme.colors.modalBorder = 'rgba(255,255,255,0.06)'

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={bonTheme} modalSize="compact">
          <ToastProvider>
            <BrowserRouter>
              <Navbar />
              <WrongNetworkBanner />

              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateToken />} />
                <Route path="/liquidity" element={<Liquidity />} />
                <Route path="/swap" element={<Swap />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/portfolio" element={<Navigate to="/" replace />} />
                <Route path="/launchpad" element={<Launchpad />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              <ToastContainer />
            </BrowserRouter>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
