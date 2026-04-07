/** Shared domain models used across fetch, classification, reporting, and execution flows. */
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

/** Runtime configuration resolved from environment variables. */
export interface AppConfig {
  runtimeMode: RuntimeMode;
  productType: 'USDT-FUTURES';
  thresholds: ThresholdConfig;
}

/** Normalized account balance entry used for portfolio totals. */
export interface AccountAsset {
  asset: string;
  available: number;
  equity: number;
  locked: number;
  unrealizedPnl: number;
}

/** Exchange position model after normalization but before risk classification. */
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

/** One rule trigger explaining why a position was flagged. */
export interface RiskReason {
  code: RiskReasonCode;
  severity: Exclude<RiskLevel, 'SAFE'>;
  message: string;
  traderExplanation: string;
}

/** Execution metadata attached to a recommendation for preview or follow-through. */
export interface ExecutionPath {
  skill: string;
  side: 'buy' | 'sell' | 'reduce_only' | 'n/a';
  sizeHint: string;
  confirmationRequired: boolean;
}

/** One protective action generated from the triggered risk rules. */
export interface Recommendation {
  action: string;
  summary: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale: string;
  executionPath: ExecutionPath;
}

/** Audit-friendly record of one Bitget skill or CLI call attempted during a scan. */
export interface SkillCall {
  surface: 'Bitget AgentHub Skills';
  command: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  note: string;
}

/** Runtime checks that explain how trustworthy the current scan is. */
export interface RuntimeDiagnostics {
  bgcAvailable: boolean;
  credentialsPresent: boolean;
  readOnlyMode: boolean;
}

/** Normalized position plus its derived risk classification and recommendations. */
export interface ClassifiedPosition extends NormalizedPosition {
  riskLevel: RiskLevel;
  riskReasons: RiskReason[];
  recommendation: Recommendation[];
}

/** Raw scan input collected before classification. */
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

/** Full persisted scan record used by reports, queries, and demos. */
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

/** One audited execution-console event. */
export interface ExecutionAuditRecord {
  timestamp: string;
  mode: RuntimeMode;
  productType: 'USDT-FUTURES';
  symbol: string;
  operation: 'PREVIEW' | 'EXECUTE' | 'CANCEL' | 'QUERY';
  action: string;
  command: string;
  confirmationTokenRequired?: string;
  confirmationProvided: boolean;
  paperTrading: boolean;
  status: 'PREVIEWED' | 'BLOCKED' | 'SUCCESS' | 'FAILED';
  note: string;
  response?: string;
}
