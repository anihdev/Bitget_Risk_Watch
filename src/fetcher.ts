import { readLivePortfolioState } from './bitget';
import { config } from './config';
import type { AccountAsset, NormalizedPosition, ScanInput } from './types';

const MOCK_ACCOUNT_ASSETS: AccountAsset[] = [
  { asset: 'USDT', available: 920, equity: 1600, locked: 180, unrealizedPnl: -110 },
];

const MOCK_POSITIONS: NormalizedPosition[] = [
  {
    symbol: 'BTCUSDT',
    side: 'long',
    size: 0.12,
    entryPrice: 70450,
    markPrice: 69010,
    leverage: 15,
    unrealizedPnl: -172.8,
    unrealizedPnlPct: -18,
    marginRatio: 85,
    stopLossPresent: false,
  },
  {
    symbol: 'ETHUSDT',
    side: 'long',
    size: 1.8,
    entryPrice: 3560,
    markPrice: 3498,
    leverage: 6,
    unrealizedPnl: -111.6,
    unrealizedPnlPct: -3.8,
    marginRatio: 38,
    stopLossPresent: true,
  },
  {
    symbol: 'SOLUSDT',
    side: 'short',
    size: 35,
    entryPrice: 142,
    markPrice: 137.5,
    leverage: 4,
    unrealizedPnl: 157.5,
    unrealizedPnlPct: 8.9,
    marginRatio: 22,
    stopLossPresent: false,
  },
];

export function fetchScanInput(): ScanInput {
  if (config.runtimeMode === 'SIMULATION') {
    return {
      timestamp: new Date().toISOString(),
      mode: 'SIMULATION',
      productType: config.productType,
      accountAssets: MOCK_ACCOUNT_ASSETS,
      positions: MOCK_POSITIONS,
      fetchWarnings: ['Using bundled simulation portfolio data.'],
      scanStatus: 'COMPLETE',
    };
  }

  return {
    timestamp: new Date().toISOString(),
    mode: config.runtimeMode,
    productType: config.productType,
    ...readLivePortfolioState(config.productType, config.runtimeMode),
  };
}
