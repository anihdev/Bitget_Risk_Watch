import { readAuditHistory, readLatestAuditRecord } from './audit';
import type { ClassifiedPosition, ScanRecord } from './types';
import { formatRiskLabel } from './visuals';

function main(): void {
  const question = process.argv.slice(2).join(' ').trim().toLowerCase();
  if (!question) {
    console.log('Usage: npx ts-node src/query.ts "which positions are at risk?"');
    process.exitCode = 1;
    return;
  }

  const latest = readLatestAuditRecord();
  if (!latest) {
    console.log('No audit record found. Run `npx ts-node src/index.ts` first.');
    process.exitCode = 1;
    return;
  }

  console.log(answerQuery(question, latest, readAuditHistory()));
}

function answerQuery(question: string, latest: ScanRecord, history: ScanRecord[]): string {
  if (question.includes('scan my portfolio')) {
    return buildPortfolioSummary(latest);
  }

  if (question.includes('at risk')) {
    if (latest.flaggedPositions.length === 0) {
      return `${formatRiskLabel('SAFE')} No open positions are currently flagged.`;
    }
    return latest.flaggedPositions
      .map((position) => `${position.symbol}: ${formatRiskLabel(position.riskLevel)} because ${joinReasons(position)}`)
      .join('\n');
  }

  if (question.startsWith('why is ') || question.startsWith('why was ')) {
    const symbol = extractSymbol(question);
    const position = findPositionBySymbol(latest.positions, symbol);
    if (!position) {
      return `No position found for ${symbol.toUpperCase()}.`;
    }
    if (position.riskLevel === 'SAFE') {
      return `${position.symbol} is ${formatRiskLabel('SAFE')} in the latest scan.`;
    }
    return `${position.symbol} is ${formatRiskLabel(position.riskLevel)} because ${joinReasons(position)}.`;
  }

  if (question.includes('recommend')) {
    if (latest.flaggedPositions.length === 0) {
      return 'No protective actions are needed right now.';
    }
    return latest.flaggedPositions
      .map(
        (position) =>
          `${position.symbol}: ${position.recommendation.map((item) => item.summary).join(' ')}`,
      )
      .join('\n');
  }

  if (question.includes('what changed')) {
    const previous = history.length > 1 ? history[history.length - 2] : null;
    if (!previous) {
      return 'No previous scan is available yet.';
    }
    return describeChanges(previous, latest);
  }

  if (question.includes('risk summary') || question.includes('show my')) {
    return buildPortfolioSummary(latest);
  }

  return 'Supported queries: scan my portfolio, which positions are at risk, why is BTC flagged, what actions do you recommend, what changed since last scan, show my risk summary.';
}

function describeChanges(previous: ScanRecord, latest: ScanRecord): string {
  const previousMap = new Map(previous.positions.map((position) => [position.symbol, position]));
  const changes: string[] = [];

  for (const position of latest.positions) {
    const prior = previousMap.get(position.symbol);
    if (!prior) {
      changes.push(`${position.symbol} is new in the latest scan with ${position.riskLevel} risk.`);
      changes[changes.length - 1] = `${position.symbol} is new in the latest scan with ${formatRiskLabel(position.riskLevel)} risk.`;
      continue;
    }
    if (prior.riskLevel !== position.riskLevel) {
      changes.push(
        `${position.symbol} moved from ${formatRiskLabel(prior.riskLevel)} to ${formatRiskLabel(position.riskLevel)}.`,
      );
    }
    if (Math.abs(prior.marginRatio - position.marginRatio) >= 5) {
      changes.push(
        `${position.symbol} margin ratio changed from ${prior.marginRatio.toFixed(1)}% to ${position.marginRatio.toFixed(1)}%.`,
      );
    }
  }

  for (const position of previous.positions) {
    if (!latest.positions.some((item) => item.symbol === position.symbol)) {
      changes.push(`${position.symbol} is no longer open.`);
    }
  }

  return changes.length > 0 ? changes.join('\n') : 'No material changes since the last scan.';
}

function joinReasons(position: ClassifiedPosition): string {
  return position.riskReasons
    .map((reason) => `${reason.message} ${reason.traderExplanation}`)
    .join('; ');
}

function buildPortfolioSummary(latest: ScanRecord): string {
  return [
    `Overall risk: ${formatRiskLabel(latest.riskLevel)}`,
    `Open positions: ${latest.accountSummary.openPositionCount}`,
    `Flagged positions: ${latest.flaggedPositions.length}`,
    `Unrealized PnL: ${latest.accountSummary.totalUnrealizedPnl.toFixed(2)}`,
  ].join('\n');
}

function findPositionBySymbol(
  positions: ClassifiedPosition[],
  requestedSymbol: string,
): ClassifiedPosition | undefined {
  const normalized = requestedSymbol.toLowerCase();
  return positions.find((item) => {
    const symbol = item.symbol.toLowerCase();
    return symbol === normalized || symbol.startsWith(normalized);
  });
}

function extractSymbol(question: string): string {
  const match = question.match(/why (?:is|was) ([a-z0-9-]+)/);
  return match?.[1]?.toLowerCase() ?? '';
}

main();
