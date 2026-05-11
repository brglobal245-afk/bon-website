// BON Chain Configuration
export const BON_CHAIN = {
  id: 1234, // Replace with your actual Chain ID
  name: 'BON Chain',
  network: 'bon-chain',
  nativeCurrency: {
    decimals: 18,
    name: 'BON',
    symbol: 'BON',
  },
  rpcUrls: {
    public: { http: ['https://rpc.bonchain.io'] }, // Replace with your RPC URL
    default: { http: ['https://rpc.bonchain.io'] },
  },
  blockExplorers: {
    default: { name: 'BON Explorer', url: 'https://explorer.bonchain.io' }, // Replace with your explorer
  },
}

// Smart Contract Addresses — replace after deployment
export const CONTRACTS = {
  BON_TOKEN: '0x0000000000000000000000000000000000000001',
  TOKEN_FACTORY: '0x0000000000000000000000000000000000000002',
  DEX_ROUTER: '0x0000000000000000000000000000000000000003',
  DEX_FACTORY: '0x0000000000000000000000000000000000000004',
  WBON: '0x0000000000000000000000000000000000000005',
}

// ABIs (minimal - add full ABIs when you have deployed contracts)
export const TOKEN_FACTORY_ABI = [
  'function createToken(string name, string symbol, uint256 totalSupply, uint8 decimals, uint256 buyTax, uint256 sellTax, address taxWallet, bool burnEnabled, bool maxWalletEnabled, bool antiBotEnabled, bool mintable) payable returns (address)',
  'function creationFee() view returns (uint256)',
  'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol)',
]

export const DEX_ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
]

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function transfer(address to, uint256 value) returns (bool)',
  'function transferFrom(address from, address to, uint256 value) returns (bool)',
]

// WalletConnect Project ID — replace with your own from cloud.walletconnect.com
export const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID'

// Demo stats (replace with real on-chain data)
export const DEMO_STATS = {
  tokensCreated: '0',
  totalVolume: '$0',
  activeUsers: '0',
  avgGasFee: '0 BON',
}
