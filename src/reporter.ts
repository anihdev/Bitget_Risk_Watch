import type { ClassifiedPosition, RiskLevel, ScanRecord } from './types';
import { formatRiskLabel } from './visuals';

const COLORS: Record<RiskLevel, string> = {
  SAFE: '\u001b[32m',
  WARNING: '\u001b[33m',
  CRITICAL: '\u001b[31m',
};

const CYAN = '\u001b[36m';
const BOLD = '\u001b[1m';
const RESET = '\u001b[0m';

export function renderScanReport(scanRecord: ScanRecord): void {
  console.log(`\n${CYAN}${'='.repeat(64)}${RESET}`);
  console.log(`${BOLD}BITGET RISK WATCH${RESET}`);
  console.log(`${CYAN}${'='.repeat(64)}${RESET}`);
  console.log(`${BOLD}Mode:${RESET} ${scanRecord.mode}`);
  console.log(`${BOLD}Product:${RESET} ${scanRecord.productType}`);
  console.log(`${BOLD}Status:${RESET} ${scanRecord.scanStatus} - ${describeScanStatus(scanRecord)}`);
  console.log(`${BOLD}Timestamp:${RESET} ${scanRecord.timestamp}`);

  console.log(`\n${BOLD}Runtime Diagnostics${RESET}`);
  console.log(`- Bitget CLI availability: ${describeBgcAvailability(scanRecord)}`);
  console.log(`- API credential check: ${describeCredentialState(scanRecord)}`);
  console.log(`- Safety mode: ${scanRecord.diagnostics.readOnlyMode ? 'Read-only mode is active, so this scan cannot place live orders.' : 'Live execution is enabled.'}`);

  console.log(`\n${BOLD}Bitget Skills${RESET}`);
  for (const skillCall of scanRecord.skillCalls) {
    console.log(`${CYAN}[Skill Call]${RESET} ${skillCall.command} -> ${formatSkillStatus(skillCall.status)}`);
    console.log(`  ${skillCall.note}`);
  }

  if (scanRecord.fetchWarnings.length > 0) {
    console.log(`\n${BOLD}Warnings${RESET}`);
    for (const warning of scanRecord.fetchWarnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log(`\n${BOLD}Portfolio Summary${RESET}`);
  console.log(`- Equity: ${formatUsd(scanRecord.accountSummary.totalEquity)}`);
  console.log(`- Available: ${formatUsd(scanRecord.accountSummary.totalAvailable)}`);
  console.log(`- Unrealized PnL: ${formatUsd(scanRecord.accountSummary.totalUnrealizedPnl)}`);
  console.log(`- Open positions: ${scanRecord.accountSummary.openPositionCount}`);
  console.log(
    `- Overall risk: ${COLORS[scanRecord.riskLevel]}${formatRiskLabel(scanRecord.riskLevel)}${RESET}`,
  );

  if (scanRecord.positions.length === 0) {
    console.log('\nNo open USDT-FUTURES positions were found.');
    console.log('\nAudit log updated: audit-log.json');
    return;
  }

  console.log(`\n${BOLD}Risky Positions${RESET}`);
  const flagged = scanRecord.flaggedPositions;
  if (flagged.length === 0) {
    console.log(`- ${COLORS.SAFE}${formatRiskLabel('SAFE')}${RESET} No risky positions are currently open.`);
  } else {
    for (const position of flagged) {
      renderFlaggedPosition(position);
    }
  }

  console.log(`\n${BOLD}Audit${RESET}`);
  console.log('audit-log.json updated');
}

function renderFlaggedPosition(position: ClassifiedPosition): void {
  console.log(`- ${COLORS[position.riskLevel]}[${formatRiskLabel(position.riskLevel)}]${RESET} ${BOLD}${position.symbol}${RESET}`);
  console.log(
    `  ${position.side} ${position.size} @ ${position.entryPrice} | mark ${position.markPrice} | leverage ${position.leverage.toFixed(1)}x`,
  );
  console.log(
    `  PnL ${formatUsd(position.unrealizedPnl)} (${position.unrealizedPnlPct.toFixed(1)}%) | margin ${position.marginRatio.toFixed(1)}%`,
  );
  console.log(
    `  Market: 24h ${formatOptionalPct(position.marketContext.priceChange24hPct)} | funding ${formatOptionalPct(position.marketContext.fundingRatePct)} | mark source ${position.marketContext.markPriceSource}`,
  );
  for (const reason of position.riskReasons) {
    console.log(`  Reason: ${reason.message}`);
    console.log(`  Why it matters: ${reason.traderExplanation}`);
  }
  for (const recommendation of position.recommendation) {
    console.log(`  Action: ${recommendation.summary}`);
    console.log(`  Confidence: ${recommendation.confidence} | Why: ${recommendation.rationale}`);
    console.log(
      `  Execution Path: Skill=${recommendation.executionPath.skill} | Side=${recommendation.executionPath.side} | Size=${recommendation.executionPath.sizeHint} | Confirmation Required=${recommendation.executionPath.confirmationRequired ? 'YES' : 'NO'}`,
    );
  }
}

function formatSkillStatus(status: 'SUCCESS' | 'FAILED' | 'SKIPPED'): string {
  if (status === 'SUCCESS') {
    return `${COLORS.SAFE}${status}${RESET}`;
  }
  if (status === 'FAILED') {
    return `${COLORS.CRITICAL}${status}${RESET}`;
  }
  return `${COLORS.WARNING}${status}${RESET}`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatOptionalPct(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}%`;
}

function describeScanStatus(scanRecord: ScanRecord): string {
  if (scanRecord.scanStatus === 'COMPLETE') {
    return 'All required scan inputs were collected and analyzed successfully.';
  }

  if (scanRecord.scanStatus === 'PARTIAL') {
    return 'The scan completed with limited data, so some conclusions may be incomplete.';
  }

  if (scanRecord.positions.length === 0 && scanRecord.fetchWarnings.length > 0) {
    return 'The scan could not produce a full portfolio assessment because required live data was missing or empty.';
  }

  return 'The scan could not gather enough information to produce a complete assessment.';
}

function describeBgcAvailability(scanRecord: ScanRecord): string {
  if (scanRecord.diagnostics.bgcAvailable) {
    return 'Bitget CLI was found, so live Bitget commands can be attempted.';
  }

  return 'Bitget CLI was not found on this machine, so live Bitget reads are unavailable.';
}

function describeCredentialState(scanRecord: ScanRecord): string {
  if (scanRecord.diagnostics.credentialsPresent) {
    return 'API credentials were found in the environment. This only means keys are present, not that Bitget accepted them.';
  }

  return 'API credentials were not found, so private Bitget account reads cannot run.';
}
