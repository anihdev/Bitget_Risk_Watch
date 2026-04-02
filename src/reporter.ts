import { PositionRisk } from './classifier';

const COLORS = {
  SAFE: '\x1b[32m',      // green
  WARNING: '\x1b[33m',   // yellow
  CRITICAL: '\x1b[31m',  // red
  RESET: '\x1b[0m',
};

export function printHeader() {
  console.log('\n' + '='.repeat(60));
  console.log('  🛡️  BITGET RISK WATCH — Portfolio Guardian');
  console.log('='.repeat(60) + '\n');
}

export function printRisk(risk: PositionRisk) {
  const color = COLORS[risk.riskLevel];
  console.log(`${color}[${risk.riskLevel}]${COLORS.RESET} ${risk.symbol}`);
  risk.reasons.forEach(r => console.log(`  ⚠️  ${r}`));
  risk.recommendedActions.forEach(a => console.log(`  → ${a}`));
  console.log();
}

export function printSummary(risks: PositionRisk[]) {
  const critical = risks.filter(r => r.riskLevel === 'CRITICAL').length;
  const warning = risks.filter(r => r.riskLevel === 'WARNING').length;
  const safe = risks.filter(r => r.riskLevel === 'SAFE').length;
  console.log(`\nSummary: ${critical} CRITICAL | ${warning} WARNING | ${safe} SAFE\n`);
}