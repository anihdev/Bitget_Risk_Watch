import type { RiskLevel } from './types';

export const RISK_EMOJIS: Record<RiskLevel, string> = {
  SAFE: '✅',
  WARNING: '⚠️',
  CRITICAL: '🚨',
};

export function formatRiskLabel(riskLevel: RiskLevel): string {
  return `${RISK_EMOJIS[riskLevel]} ${riskLevel}`;
}
