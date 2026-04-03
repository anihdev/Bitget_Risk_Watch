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
          confidence: 'HIGH',
          rationale: 'The fastest way to reduce uncontrolled downside is to define an exit level now.',
          executionPath: {
            skill: 'futures_place_plan_order',
            side: 'n/a',
            sizeHint: '100% of current position as a protective stop',
            confirmationRequired: true,
          },
        });
        break;
      case 'HIGH_LEVERAGE':
        recommendations.push({
          action: 'lower leverage',
          summary: `Reduce leverage on ${position.symbol} below ${appConfig.thresholds.leverageWarning}x to widen liquidation distance.`,
          confidence: 'MEDIUM',
          rationale: 'Lower leverage gives the position more room to absorb adverse price moves before margin pressure accelerates.',
          executionPath: {
            skill: 'futures_adjust_leverage',
            side: 'n/a',
            sizeHint: `Target leverage below ${appConfig.thresholds.leverageWarning}x`,
            confirmationRequired: true,
          },
        });
        break;
      case 'LARGE_UNREALIZED_LOSS':
        recommendations.push({
          action: 'close partial position',
          summary: `Cut part of ${position.symbol} now because the position is already down ${Math.abs(position.unrealizedPnlPct).toFixed(1)}%.`,
          confidence: 'HIGH',
          rationale:
            'Reducing exposure while the loss is already material helps stop the position from dominating account risk.',
          executionPath: {
            skill: 'futures_place_order',
            side: position.side === 'long' ? 'sell' : position.side === 'short' ? 'buy' : 'reduce_only',
            sizeHint: 'Close 25% to 50% of current position size',
            confirmationRequired: true,
          },
        });
        break;
      case 'HIGH_MARGIN_RATIO':
        recommendations.push({
          action: 'reduce position size',
          summary: `Reduce size or add margin on ${position.symbol} immediately because margin ratio is ${position.marginRatio.toFixed(1)}%.`,
          confidence: 'HIGH',
          rationale: 'High margin ratio is the clearest near-term liquidation risk signal in the current rule set.',
          executionPath: {
            skill: 'futures_place_order',
            side: position.side === 'long' ? 'sell' : position.side === 'short' ? 'buy' : 'reduce_only',
            sizeHint: 'Reduce 25% of current position size or add margin',
            confirmationRequired: true,
          },
        });
        recommendations.push({
          action: 'avoid new entries',
          summary: 'Avoid opening new futures exposure until account margin pressure improves.',
          confidence: 'HIGH',
          rationale: 'Adding fresh exposure while margin pressure is elevated increases the chance of forced deleveraging.',
          executionPath: {
            skill: 'none',
            side: 'n/a',
            sizeHint: 'Pause new entries until margin ratio normalizes',
            confirmationRequired: true,
          },
        });
        break;
      case 'HIGH_FUNDING_RATE':
        recommendations.push({
          action: 'review funding exposure',
          summary: `Review ${position.symbol} before the next funding window because funding is running at ${position.marketContext.fundingRatePct?.toFixed(3)}%.`,
          confidence: 'MEDIUM',
          rationale:
            'High funding can erode PnL even if price stalls, so reducing leverage or trimming size may be cheaper than paying repeated carry.',
          executionPath: {
            skill: 'none',
            side: 'n/a',
            sizeHint: 'Trim size or reduce leverage before the next funding event',
            confirmationRequired: true,
          },
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
