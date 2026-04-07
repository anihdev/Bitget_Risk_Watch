/** Shared risk label formatting used by terminal and query output. */
import type { RiskLevel } from './types';

export const RISK_EMOJIS: Record<RiskLevel, string> = {
  SAFE: '✅',
  WARNING: ' ⚠️ ',
  CRITICAL: '🚨',
};

/** Formats a risk level with the visual markers expected in CLI output. */
export function formatRiskLabel(riskLevel: RiskLevel): string {
  return `${RISK_EMOJIS[riskLevel]} ${riskLevel}`;
}
