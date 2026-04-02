export type RiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface PositionRisk {
  symbol: string;
  riskLevel: RiskLevel;
  reasons: string[];
  recommendedActions: string[];
}

const LEVERAGE_THRESHOLD = Number(process.env.LEVERAGE_THRESHOLD || 10);
const LOSS_THRESHOLD_PCT = Number(process.env.LOSS_THRESHOLD_PCT || 15);
const MARGIN_DANGER_PCT = Number(process.env.MARGIN_DANGER_PCT || 80);

export function classifyPosition(position: any): PositionRisk {
  const reasons: string[] = [];
  const actions: string[] = [];
  let riskLevel: RiskLevel = 'SAFE';

  const leverage = parseFloat(position.leverage);
  const unrealizedPnlPct = parseFloat(position.unrealizedPLR) * 100;
  const marginRatio = parseFloat(position.marginRatio) * 100;
  const hasStopLoss = position.stopLossPrice && position.stopLossPrice !== '0';

  if (!hasStopLoss) {
    reasons.push('No stop-loss set');
    actions.push(`Set stop-loss on ${position.symbol}`);
    riskLevel = 'WARNING';
  }

  if (leverage > LEVERAGE_THRESHOLD) {
    reasons.push(`Leverage ${leverage}x exceeds threshold of ${LEVERAGE_THRESHOLD}x`);
    actions.push(`Reduce leverage on ${position.symbol} to below ${LEVERAGE_THRESHOLD}x`);
    riskLevel = 'WARNING';
  }

  if (unrealizedPnlPct < -LOSS_THRESHOLD_PCT) {
    reasons.push(`Unrealized loss of ${Math.abs(unrealizedPnlPct).toFixed(1)}% exceeds threshold`);
    actions.push(`Consider partial close or hedge on ${position.symbol}`);
    riskLevel = 'CRITICAL';
  }

  if (marginRatio > MARGIN_DANGER_PCT) {
    reasons.push(`Margin usage at ${marginRatio.toFixed(1)}% — approaching liquidation`);
    actions.push(`Add margin or reduce size immediately on ${position.symbol}`);
    riskLevel = 'CRITICAL';
  }

  return { symbol: position.symbol, riskLevel, reasons, recommendedActions: actions };
}