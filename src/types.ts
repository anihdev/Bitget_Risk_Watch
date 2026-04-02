export type RuntimeMode = 'SIMULATION' | 'LIVE_READ' | 'LIVE_EXECUTE';
export type RiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';
export type ScanStatus = 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
export type RiskReasonCode =
  | 'NO_STOP_LOSS'
  | 'HIGH_LEVERAGE'
  | 'LARGE_UNREALIZED_LOSS'
  | 'HIGH_MARGIN_RATIO';

export interface ThresholdConfig {
  leverageWarning: number;
  lossCriticalPct: number;
  marginCriticalPct: number;
}

export interface AppConfig {
  runtimeMode: RuntimeMode;
  productType: 'USDT-FUTURES';
  thresholds: ThresholdConfig;
}

export interface AccountAsset {
  asset: string;
  available: number;
  equity: number;
  locked: number;
  unrealizedPnl: number;
}

export interface NormalizedPosition {
  symbol: string;
  side: 'long' | 'short' | 'unknown';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  marginRatio: number;
  stopLossPresent: boolean;
}

export interface RiskReason {
  code: RiskReasonCode;
  severity: Exclude<RiskLevel, 'SAFE'>;
  message: string;
}

export interface Recommendation {
  action: string;
  summary: string;
}

export interface ClassifiedPosition extends NormalizedPosition {
  riskLevel: RiskLevel;
  riskReasons: RiskReason[];
  recommendation: Recommendation[];
}

export interface ScanInput {
  timestamp: string;
  mode: RuntimeMode;
  productType: 'USDT-FUTURES';
  accountAssets: AccountAsset[];
  positions: NormalizedPosition[];
  fetchWarnings: string[];
  scanStatus: ScanStatus;
}

export interface ScanRecord {
  timestamp: string;
  mode: RuntimeMode;
  productType: 'USDT-FUTURES';
  accountSummary: {
    totalEquity: number;
    totalAvailable: number;
    totalUnrealizedPnl: number;
    openPositionCount: number;
    assets: AccountAsset[];
  };
  positions: ClassifiedPosition[];
  flaggedPositions: ClassifiedPosition[];
  riskLevel: RiskLevel;
  riskReasons: string[];
  recommendation: string[];
  scanStatus: ScanStatus;
  fetchWarnings: string[];
}
