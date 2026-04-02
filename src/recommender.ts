import type { AppConfig, NormalizedPosition, Recommendation, RiskReason } from './types';

export function buildRecommendations(
  position: NormalizedPosition,
  riskReasons: RiskReason[],
  appConfig: AppConfig,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const reason of riskReasons) {
    switch (reason.code) {
      case 'NO_STOP_LOSS':
        recommendations.push({
          action: 'add stop-loss',
          summary: `Add a stop-loss for ${position.symbol} so downside is capped before losses accelerate.`,
        });
        break;
      case 'HIGH_LEVERAGE':
        recommendations.push({
          action: 'lower leverage',
          summary: `Reduce leverage on ${position.symbol} below ${appConfig.thresholds.leverageWarning}x to widen liquidation distance.`,
        });
        break;
      case 'LARGE_UNREALIZED_LOSS':
        recommendations.push({
          action: 'close partial position',
          summary: `Cut part of ${position.symbol} now because the position is already down ${Math.abs(position.unrealizedPnlPct).toFixed(1)}%.`,
        });
        break;
      case 'HIGH_MARGIN_RATIO':
        recommendations.push({
          action: 'reduce position size',
          summary: `Reduce size or add margin on ${position.symbol} immediately because margin ratio is ${position.marginRatio.toFixed(1)}%.`,
        });
        recommendations.push({
          action: 'avoid new entries',
          summary: 'Avoid opening new futures exposure until account margin pressure improves.',
        });
        break;
      default:
        break;
    }
  }

  return dedupeRecommendations(recommendations);
}

function dedupeRecommendations(items: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.summary)) {
      return false;
    }
    seen.add(item.summary);
    return true;
  });
}
