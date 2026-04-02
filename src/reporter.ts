import type { ClassifiedPosition, RiskLevel, ScanRecord } from './types';

const COLORS: Record<RiskLevel, string> = {
  SAFE: '\u001b[32m',
  WARNING: '\u001b[33m',
  CRITICAL: '\u001b[31m',
};

const RESET = '\u001b[0m';

export function renderScanReport(scanRecord: ScanRecord): void {
  console.log(`\n${'='.repeat(64)}`);
  console.log('BITGET RISK WATCH');
  console.log(`${'='.repeat(64)}`);
  console.log(`Mode: ${scanRecord.mode}`);
  console.log(`Product: ${scanRecord.productType}`);
  console.log(`Status: ${scanRecord.scanStatus}`);
  console.log(`Timestamp: ${scanRecord.timestamp}`);

  if (scanRecord.fetchWarnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of scanRecord.fetchWarnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log('\nPortfolio Summary:');
  console.log(`- Equity: ${formatUsd(scanRecord.accountSummary.totalEquity)}`);
  console.log(`- Available: ${formatUsd(scanRecord.accountSummary.totalAvailable)}`);
  console.log(`- Unrealized PnL: ${formatUsd(scanRecord.accountSummary.totalUnrealizedPnl)}`);
  console.log(`- Open positions: ${scanRecord.accountSummary.openPositionCount}`);
  console.log(
    `- Overall risk: ${COLORS[scanRecord.riskLevel]}${scanRecord.riskLevel}${RESET}`,
  );

  if (scanRecord.positions.length === 0) {
    console.log('\nNo open USDT-FUTURES positions were found.');
    console.log('\nAudit log updated: audit-log.json');
    return;
  }

  console.log('\nRisky Positions:');
  const flagged = scanRecord.flaggedPositions;
  if (flagged.length === 0) {
    console.log('- None. All open positions are currently SAFE.');
  } else {
    for (const position of flagged) {
      renderFlaggedPosition(position);
    }
  }

  console.log('\nAudit log updated: audit-log.json');
}

function renderFlaggedPosition(position: ClassifiedPosition): void {
  console.log(`- ${COLORS[position.riskLevel]}[${position.riskLevel}]${RESET} ${position.symbol}`);
  console.log(
    `  ${position.side} ${position.size} @ ${position.entryPrice} | mark ${position.markPrice} | leverage ${position.leverage.toFixed(1)}x`,
  );
  console.log(
    `  PnL ${formatUsd(position.unrealizedPnl)} (${position.unrealizedPnlPct.toFixed(1)}%) | margin ${position.marginRatio.toFixed(1)}%`,
  );
  for (const reason of position.riskReasons) {
    console.log(`  Reason: ${reason.message}`);
  }
  for (const recommendation of position.recommendation) {
    console.log(`  Action: ${recommendation.summary}`);
  }
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}
