/** Builds scan input data from either bundled simulation fixtures or live Bitget reads. */
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
    marketContext: {
      fundingRatePct: 0.45,
      priceChange24hPct: -3.4,
      markPriceSource: 'position',
    },
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
    marketContext: {
      fundingRatePct: 0.012,
      priceChange24hPct: -1.1,
      markPriceSource: 'position',
    },
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
    marketContext: {
      fundingRatePct: -0.008,
      priceChange24hPct: -4.6,
      markPriceSource: 'position',
    },
  },
];

/** Returns the raw scan input that downstream classification expects. */
export function fetchScanInput(): ScanInput {
  if (config.runtimeMode === 'SIMULATION') {
    return {
      timestamp: new Date().toISOString(),
      mode: 'SIMULATION',
      productType: config.productType,
      diagnostics: {
        bgcAvailable: false,
        credentialsPresent: false,
        readOnlyMode: true,
      },
      accountAssets: MOCK_ACCOUNT_ASSETS,
      positions: MOCK_POSITIONS,
      fetchWarnings: ['Using bundled simulation portfolio data.'],
      skillCalls: [
        {
          surface: 'Bitget AgentHub Skills',
          command: 'bgc account get_account_assets',
          status: 'SKIPPED',
          note: 'Simulation mode uses bundled account data.',
        },
        {
          surface: 'Bitget AgentHub Skills',
          command: `bgc futures futures_get_positions --productType ${config.productType}`,
          status: 'SKIPPED',
          note: 'Simulation mode uses bundled futures positions.',
        },
        {
          surface: 'Bitget AgentHub Skills',
          command: 'bgc futures futures_get_ticker --symbol BTCUSDT',
          status: 'SKIPPED',
          note: 'Simulation mode uses bundled ticker context.',
        },
        {
          surface: 'Bitget AgentHub Skills',
          command: 'bgc futures futures_get_funding_rate --symbol BTCUSDT',
          status: 'SKIPPED',
          note: 'Simulation mode uses bundled funding context.',
        },
      ],
      scanStatus: 'COMPLETE',
    };
  }

  // Live modes share the same read path; execution remains gated elsewhere.
  return {
    timestamp: new Date().toISOString(),
    mode: config.runtimeMode,
    productType: config.productType,
    ...readLivePortfolioState(config.productType, config.runtimeMode),
  };
}
