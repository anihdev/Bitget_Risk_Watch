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
    diagnostics: scanInput.diagnostics,
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
    skillCalls: scanInput.skillCalls,
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
      traderExplanation:
        'This position has no defined exit guard, so a sudden move can turn a manageable drawdown into a much larger loss and should be addressed quickly.',
    });
  }

  if (position.leverage > appConfig.thresholds.leverageWarning) {
    riskReasons.push({
      code: 'HIGH_LEVERAGE',
      severity: 'WARNING',
      message: `Leverage is ${position.leverage.toFixed(1)}x, above the ${appConfig.thresholds.leverageWarning}x warning threshold.`,
      traderExplanation: `This ${position.symbol} position is running at ${position.leverage.toFixed(1)}x leverage, so a relatively small move against it can damage margin quickly.`,
    });
  }

  if (position.unrealizedPnlPct <= -appConfig.thresholds.lossCriticalPct) {
    riskReasons.push({
      code: 'LARGE_UNREALIZED_LOSS',
      severity: 'CRITICAL',
      message: `Unrealized loss is ${Math.abs(position.unrealizedPnlPct).toFixed(1)}%, beyond the ${appConfig.thresholds.lossCriticalPct}% critical threshold.`,
      traderExplanation: `This position is already down ${Math.abs(position.unrealizedPnlPct).toFixed(1)}%, which means the trade is no longer a minor fluctuation and needs active risk control.`,
    });
  }

  if (position.marginRatio >= appConfig.thresholds.marginCriticalPct) {
    riskReasons.push({
      code: 'HIGH_MARGIN_RATIO',
      severity: 'CRITICAL',
      message: `Margin ratio is ${position.marginRatio.toFixed(1)}%, above the ${appConfig.thresholds.marginCriticalPct}% danger threshold.`,
      traderExplanation: `Margin usage is at ${position.marginRatio.toFixed(1)}%, which leaves limited room before liquidation pressure becomes a serious concern.`,
    });
  }

  if (
    position.marketContext.fundingRatePct !== null &&
    Math.abs(position.marketContext.fundingRatePct) >= appConfig.thresholds.fundingWarningPct
  ) {
    riskReasons.push({
      code: 'HIGH_FUNDING_RATE',
      severity: 'WARNING',
      message: `Funding rate is ${position.marketContext.fundingRatePct.toFixed(3)}%, above the ${appConfig.thresholds.fundingWarningPct}% monitoring threshold.`,
      traderExplanation:
        'Elevated funding adds carry pressure to the position, so keeping size or leverage unchanged through the next funding window can make a weak trade more expensive.',
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
