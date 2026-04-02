import { buildRecommendations } from './recommender';
import type {
  AppConfig,
  ClassifiedPosition,
  NormalizedPosition,
  RiskLevel,
  RiskReason,
  ScanInput,
  ScanRecord,
} from './types';

export function classifyPortfolio(scanInput: ScanInput, appConfig: AppConfig): ScanRecord {
  const classifiedPositions = scanInput.positions.map((position) =>
    classifyPosition(position, appConfig),
  );
  const flaggedPositions = classifiedPositions.filter((position) => position.riskLevel !== 'SAFE');
  const accountSummary = summarizeAccount(scanInput.accountAssets, scanInput.positions);

  return {
    timestamp: scanInput.timestamp,
    mode: scanInput.mode,
    productType: scanInput.productType,
    accountSummary,
    positions: classifiedPositions,
    flaggedPositions,
    riskLevel: aggregateRiskLevel(classifiedPositions),
    riskReasons: dedupe(flaggedPositions.flatMap((position) => position.riskReasons.map((reason) => reason.message))),
    recommendation: dedupe(
      flaggedPositions.flatMap((position) => position.recommendation.map((item) => item.summary)),
    ),
    scanStatus: scanInput.scanStatus,
    fetchWarnings: scanInput.fetchWarnings,
  };
}

export function classifyPosition(
  position: NormalizedPosition,
  appConfig: AppConfig,
): ClassifiedPosition {
  const riskReasons: RiskReason[] = [];

  if (!position.stopLossPresent) {
    riskReasons.push({
      code: 'NO_STOP_LOSS',
      severity: 'WARNING',
      message: 'No stop-loss is configured for this position.',
    });
  }

  if (position.leverage > appConfig.thresholds.leverageWarning) {
    riskReasons.push({
      code: 'HIGH_LEVERAGE',
      severity: 'WARNING',
      message: `Leverage is ${position.leverage.toFixed(1)}x, above the ${appConfig.thresholds.leverageWarning}x warning threshold.`,
    });
  }

  if (position.unrealizedPnlPct <= -appConfig.thresholds.lossCriticalPct) {
    riskReasons.push({
      code: 'LARGE_UNREALIZED_LOSS',
      severity: 'CRITICAL',
      message: `Unrealized loss is ${Math.abs(position.unrealizedPnlPct).toFixed(1)}%, beyond the ${appConfig.thresholds.lossCriticalPct}% critical threshold.`,
    });
  }

  if (position.marginRatio >= appConfig.thresholds.marginCriticalPct) {
    riskReasons.push({
      code: 'HIGH_MARGIN_RATIO',
      severity: 'CRITICAL',
      message: `Margin ratio is ${position.marginRatio.toFixed(1)}%, above the ${appConfig.thresholds.marginCriticalPct}% danger threshold.`,
    });
  }

  const riskLevel = deriveRiskLevel(riskReasons);

  return {
    ...position,
    riskLevel,
    riskReasons,
    recommendation: buildRecommendations(position, riskReasons, appConfig),
  };
}

function deriveRiskLevel(riskReasons: RiskReason[]): RiskLevel {
  if (riskReasons.some((reason) => reason.severity === 'CRITICAL')) {
    return 'CRITICAL';
  }
  if (riskReasons.some((reason) => reason.severity === 'WARNING')) {
    return 'WARNING';
  }
  return 'SAFE';
}

function aggregateRiskLevel(positions: ClassifiedPosition[]): RiskLevel {
  if (positions.some((position) => position.riskLevel === 'CRITICAL')) {
    return 'CRITICAL';
  }
  if (positions.some((position) => position.riskLevel === 'WARNING')) {
    return 'WARNING';
  }
  return 'SAFE';
}

function summarizeAccount(
  accountAssets: ScanRecord['accountSummary']['assets'],
  positions: NormalizedPosition[],
): ScanRecord['accountSummary'] {
  const totalUnrealizedPnl = positions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
  const totalEquity = accountAssets.reduce((sum, asset) => sum + asset.equity, 0);

  return {
    totalEquity,
    totalAvailable: accountAssets.reduce((sum, asset) => sum + asset.available, 0),
    totalUnrealizedPnl,
    openPositionCount: positions.length,
    assets: accountAssets,
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
