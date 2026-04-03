export type RuntimeMode = 'SIMULATION' | 'LIVE_READ' | 'LIVE_EXECUTE';
export type RiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';
export type ScanStatus = 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
export type RiskReasonCode =
  | 'NO_STOP_LOSS'
  | 'HIGH_LEVERAGE'
  | 'LARGE_UNREALIZED_LOSS'
  | 'HIGH_MARGIN_RATIO'
  | 'HIGH_FUNDING_RATE';

export interface ThresholdConfig {
  leverageWarning: number;
  lossCriticalPct: number;
  marginCriticalPct: number;
  fundingWarningPct: number;
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
  marketContext: {
    fundingRatePct: number | null;
    priceChange24hPct: number | null;
    markPriceSource: 'position' | 'futures_ticker' | 'spot_ticker_fallback';
  };
}

export interface RiskReason {
  code: RiskReasonCode;
  severity: Exclude<RiskLevel, 'SAFE'>;
  message: string;
  traderExplanation: string;
}

export interface ExecutionPath {
  skill: string;
  side: 'buy' | 'sell' | 'reduce_only' | 'n/a';
  sizeHint: string;
  confirmationRequired: boolean;
}

export interface Recommendation {
  action: string;
  summary: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale: string;
  executionPath: ExecutionPath;
}

export interface SkillCall {
  surface: 'Bitget AgentHub Skills';
  command: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  note: string;
}

export interface RuntimeDiagnostics {
  bgcAvailable: boolean;
  credentialsPresent: boolean;
  readOnlyMode: boolean;
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
  diagnostics: RuntimeDiagnostics;
  accountAssets: AccountAsset[];
  positions: NormalizedPosition[];
  fetchWarnings: string[];
  skillCalls: SkillCall[];
  scanStatus: ScanStatus;
}

export interface ScanRecord {
  timestamp: string;
  mode: RuntimeMode;
  productType: 'USDT-FUTURES';
  diagnostics: RuntimeDiagnostics;
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
  skillCalls: SkillCall[];
}
